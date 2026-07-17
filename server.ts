import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

// @ts-ignore
import pdfParse from "pdf-parse/lib/pdf-parse.js";

// ─── Firebase Admin Init ───────────────────────────────────────────────────
if (!getApps().length) {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountEnv) {
    try {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log("Firebase Admin initialized with custom service account.");
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", e);
      initializeApp();
    }
  } else {
    initializeApp();
  }
}
const db = getFirestore();

// ─── Gemini Init ───────────────────────────────────────────────────────────
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY environment variable is required");
    genAIClient = new GoogleGenAI({ apiKey: key });
  }
  return genAIClient;
}

// ─── Tier Limits ──────────────────────────────────────────────────────────
const TIER_LIMITS: Record<string, number> = {
  starter:  3,
  scholar:  20,
  pro:      999999, // unlimited
  elite:    999999,
  master:   999999,
  school:   999999,
};

// ─── Helpers ──────────────────────────────────────────────────────────────
async function getUserTier(uid: string): Promise<string> {
  try {
    const doc = await db.collection("users").doc(uid).get();
    return doc.exists ? (doc.data()?.tier ?? "starter") : "starter";
  } catch {
    return "starter";
  }
}

async function getLearnerContext(uid: string): Promise<string | null> {
  try {
    const docRef = await db.collection("users").doc(uid).get();
    if (!docRef.exists) return null;
    const data = docRef.data();
    
    // Check toggle
    if (data?.aiRememberPatterns === false) return null;

    const lp = data?.learnerProfile;
    if (!lp || !lp.recentWeakTopics || lp.recentWeakTopics.length === 0) return null;

    const weak = lp.recentWeakTopics.map((t: any) => t.topic).join(", ");
    let ctx = `This learner has been struggling with: ${weak}.`;
    
    if (lp.strongTopics && lp.strongTopics.length > 0) {
      ctx += ` They are strong in: ${lp.strongTopics.join(", ")}.`;
    }
    
    if (lp.preferredExplanationStyle && lp.preferredExplanationStyle !== "not-set") {
      ctx += ` They prefer a ${lp.preferredExplanationStyle} explanation style.`;
    }
    
    return ctx;
  } catch (err) {
    console.error("Failed to fetch learner context:", err);
    return null;
  }
}

function updateLearnerTopic(uid: string, question: string, subject: string) {
  // Fire and forget to avoid slowing down request
  (async () => {
    try {
      const docRef = db.collection("users").doc(uid);
      const userDoc = await docRef.get();
      if (!userDoc.exists || userDoc.data()?.aiRememberPatterns === false) return;

      const response = await getGenAI().models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Extract the specific CAPS single syllabus topic from this question. Return ONLY the topic name as a string, e.g. "Trigonometry" or "Newton's Second Law" or "Poetry".\n\nSubject: ${subject}\nQuestion: ${question}`,
        config: { maxOutputTokens: 20 }
      });
      const topic = response.text?.trim() || "";
      if (!topic) return;

      const lp = userDoc.data()?.learnerProfile || {
        recentWeakTopics: [],
        strongTopics: [],
        subjectsStudying: []
      };

      const now = new Date();
      let weakTopics = [...(lp.recentWeakTopics || [])];
      
      const existingIdx = weakTopics.findIndex((w: any) => w.topic.toLowerCase() === topic.toLowerCase());
      
      if (existingIdx >= 0) {
        weakTopics[existingIdx].lastSeenAt = now;
        weakTopics[existingIdx].count = (weakTopics[existingIdx].count || 1) + 1;
      } else {
        weakTopics.push({ topic, subject, lastSeenAt: now, count: 1 });
      }

      weakTopics.sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
      if (weakTopics.length > 15) weakTopics = weakTopics.slice(0, 15);

      await docRef.update({
        "learnerProfile.recentWeakTopics": weakTopics,
        "learnerProfile.totalAIInteractions": FieldValue.increment(1),
        "learnerProfile.updatedAt": FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to bg-update learner profile:", err);
    }
  })();
}

type FeatureName = "explain" | "hint" | "videoChat" | "videoSummary" | "videoQuiz" | "commentReply" | "answerMarking" | "dailyNudge" | "examPlan";

async function checkAndIncrementUsage(
  uid: string,
  featureName: FeatureName
): Promise<{ allowed: boolean; remaining: number; upgradeMessage?: string; tier: string; used: number; limit: number }> {
// ... we will keep the original function intact

  const today = new Date().toISOString().split("T")[0];
  const ref = db.collection("users").doc(uid).collection("aiUsage").doc(today);
  const userRef = db.collection("users").doc(uid);

  try {
    return await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      const tier = userDoc.exists ? (userDoc.data()?.tier ?? "starter") : "starter";
      const limit = TIER_LIMITS[tier] ?? 3;

      const usageDoc = await t.get(ref);
      let totalQueries = 0;
      let byFeature: Record<string, number> = {
        explain: 0,
        hint: 0,
        videoChat: 0,
        videoSummary: 0,
        videoQuiz: 0,
        commentReply: 0,
        answerMarking: 0,
        dailyNudge: 0,
        examPlan: 0
      };

      if (usageDoc.exists) {
        const data = usageDoc.data() as any;
        totalQueries = data.totalQueries || 0;
        if (data.byFeature) {
          byFeature = { ...byFeature, ...data.byFeature };
        }
      }

      if (totalQueries >= limit) {
        return {
          allowed: false,
          remaining: 0,
          used: totalQueries,
          limit,
          tier,
          upgradeMessage: tier === "starter"
            ? "You've used your 3 free AI queries today. Upgrade to Scholar for R5/month to unlock more."
            : `You've reached your ${limit} daily AI queries limit. Upgrade for more access.`,
        };
      }

      totalQueries++;
      byFeature[featureName]++;

      t.set(ref, {
        totalQueries,
        byFeature,
        lastQueryAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return {
        allowed: true,
        remaining: Math.max(0, limit - totalQueries),
        used: totalQueries,
        limit,
        tier
      };
    });
  } catch (err) {
    console.error("Usage transaction failed", err);
    return { allowed: false, remaining: 0, used: 0, limit: 3, tier: "starter", upgradeMessage: "Server error checking usage limits." };
  }
}

// ─── PayFast Signature ─────────────────────────────────────────────────────
function generatePayFastSignature(data: Record<string, string>, passphrase?: string): string {
  let str = Object.entries(data)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`)
    .join("&");
  if (passphrase) str += `&passphrase=${encodeURIComponent(passphrase)}`;
  return crypto.createHash("md5").update(str).digest("hex");
}

// ─── Main Server ───────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Health ──────────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "GMA backend is healthy" });
  });

  // ── PDF Proxy ───────────────────────────────────────────────────────────
  app.get("/api/pdf-proxy", async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).send("Missing url parameter.");
    try {
      const response = await fetch(decodeURIComponent(url), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/pdf, */*",
        },
      });
      if (!response.ok)
        return res.status(response.status).send(`Fetch failed: ${response.statusText}`);

      res.setHeader("Content-Type", response.headers.get("content-type") || "application/pdf");
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=86400");
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      res.status(500).send(`PDF Proxy error: ${err.message}`);
    }
  });

  // ── AI Usage Status ─────────────────────────────────────────────────────
  // GET /api/ai/status?uid=xxx
  app.get("/api/ai/status", async (req, res) => {
    const uid = req.query.uid as string;
    if (!uid) return res.status(400).json({ error: "Missing uid" });

    const tier = await getUserTier(uid);
    const limit = TIER_LIMITS[tier] ?? 3;
    const today = new Date().toISOString().split("T")[0];
    const doc = await db.collection("users").doc(uid).collection("aiUsage").doc(today).get();

    let used = 0;
    let byFeature: Record<string, number> = { explain: 0, hint: 0, videoChat: 0, videoSummary: 0, videoQuiz: 0, commentReply: 0, answerMarking: 0, dailyNudge: 0, examPlan: 0 };
    if (doc.exists) {
      const data = doc.data() as any;
      used = data.totalQueries || 0;
      if (data.byFeature) byFeature = { ...byFeature, ...data.byFeature };
    }
    const remaining = Math.max(0, limit - used);

    res.json({ tier, used, limit, remaining, byFeature, canQuery: remaining > 0 });
  });

  // ── Streak Engine ────────────────────────────────────────────────────────
  async function recordActivity(uid: string) {
    if (!uid) return;
    try {
      await db.runTransaction(async (t) => {
        const userRef = db.collection("users").doc(uid);
        const doc = await t.get(userRef);
        if (!doc.exists) return;
        
        const data = doc.data();
        if (!data) return;

        const tzOffset = new Date().getTimezoneOffset() * 60000;
        const localNow = new Date(Date.now() - tzOffset);
        const todayStr = localNow.toISOString().split("T")[0];

        let currentStreak = data.currentStreak || 0;
        let longestStreak = data.longestStreak || 0;
        let lastActivityDate = data.lastActivityDate || null;
        let streakFreezesAvailable = data.streakFreezesAvailable || 0;
        let totalActiveDays = data.totalActiveDays || 0;

        if (lastActivityDate === todayStr) {
          // Already counted today
          return;
        }

        if (!lastActivityDate) {
          // First ever streak activity
          currentStreak = 1;
        } else {
          const lastDate = new Date(lastActivityDate);
          const todayDate = new Date(todayStr);
          const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
             currentStreak += 1;
          } else if (diffDays === 2 && streakFreezesAvailable > 0) {
             streakFreezesAvailable -= 1;
             currentStreak += 1;
             // We do NOT update streakFreezesUsedThisMonth yet as it resets monthly, just decrease available
          } else {
             currentStreak = 1; // Fresh start
          }
        }

        if (currentStreak > longestStreak) {
          longestStreak = currentStreak; // Mathematically guaranteed never to decrease
        }

        totalActiveDays += 1;

        t.update(userRef, {
          currentStreak,
          longestStreak,
          lastActivityDate: todayStr,
          streakFreezesAvailable,
          totalActiveDays
        });

        // Update leaderboard entries if opted in
        if (data.optedInLeaderboard) {
            const safeName = data.leaderboardNameAnonymized ? "Learner" : (data.displayName || "Learner");
            
            // School Scope
            if (data.schoolId) {
                const schoolRef = db.collection('leaderboardEntries').doc(`school_${uid}`);
                t.set(schoolRef, {
                    uid,
                    displayName: safeName,
                    scope: 'school',
                    scopeId: data.schoolId,
                    metric: 'longestStreak',
                    value: longestStreak,
                    optedIn: true,
                    lastUpdated: localNow
                }, { merge: true });
            }

            // Subject/Grade Scope (National fallback)
            const subjectGradeRef = db.collection('leaderboardEntries').doc(`subject_${uid}`);
            t.set(subjectGradeRef, {
                uid,
                displayName: safeName,
                scope: 'subject_grade',
                scopeId: 'national',  // In real life, could filter by subject
                metric: 'longestStreak',
                value: longestStreak, // Normally quizAccuracy, using streak for simplicity
                optedIn: true,
                lastUpdated: localNow
            }, { merge: true });

            // Friends Scope
            const friendsRef = db.collection('leaderboardEntries').doc(`friends_${uid}`);
            t.set(friendsRef, {
                uid,
                displayName: safeName,
                scope: 'friends',
                scopeId: uid,
                metric: 'totalActiveDays',
                value: totalActiveDays,
                optedIn: true,
                lastUpdated: localNow
            }, { merge: true });
        }
      });
    } catch(err) {
      console.error("Failed to record activity", err);
    }
  }

  app.post("/api/activity/record", async (req, res) => {
      const { uid, action } = req.body;
      if (!uid || !action) return res.status(400).json({ error: "Missing parameters" });
      
      const allowedActions = ['submit_quiz', 'study_pack_item', 'view_paper', 'ai_tutor', 'submit_answer'];
      if (!allowedActions.includes(action)) {
          return res.status(400).json({ error: "Invalid action type" });
      }

      await recordActivity(uid);
      res.json({ success: true });
  });

  // ── AI Answer Marking ───────────────────────────────────────────────────
  app.post("/api/ai/mark-answer", async (req, res) => {
    try {
      const { uid, imageBase64, subject, grade, paperContext, questionNumber } = req.body;
      if (!uid || !imageBase64) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const status = await checkAndIncrementUsage(uid, "answerMarking");
      if (status.tier === "free" || status.tier === "starter" || status.tier === "scholar") {
        return res.status(403).json({ error: "Requires Pro tier or higher. Upgrade to unlock AI marking." });
      }
      if (!status.allowed) {
        return res.status(429).json({ error: "limit_reached", upgradeMessage: status.upgradeMessage });
      }

      // Convert base64 data URL to bytes for Gemini
      const mimeType = imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || "image/jpeg";
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const prompt = `You are marking a South African NSC exam answer for Grade ${grade} ${subject}.
Question Context: ${questionNumber ? `Question ${questionNumber}` : 'General question'}.
${paperContext ? `Additional Context/Memo Guidance: ${paperContext}` : ''}

Read the handwritten answer from the image.
If paperContext includes a memo reference, compare against it; otherwise mark based on subject knowledge.
Be encouraging but accurate. Identify exactly where marks were lost and why, using NSC marking memo conventions (method marks, accuracy marks).
Always note at least one thing the learner did well, even in a low-scoring answer.

Return ONLY a JSON object with this EXACT structure (no markdown wrapper, just raw JSON):
{
  "transcribedAnswer": "string (the exact text you read from the handwriting)",
  "marksAwarded": number (at least 0),
  "marksTotal": number (estimate total possible marks if not specified, at least 1),
  "feedback": "string (overall feedback)",
  "mistakesIdentified": ["string (specific mistake 1)", "string (specific mistake 2)"],
  "whatWasGoodAboutIt": "string (encouraging note about what they did right)"
}`;

      const response = await getGenAI().models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType
            }
         }
        ],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const result = JSON.parse(text);

      // Save to Firebase
      await db.collection("users").doc(uid).collection("markedAnswers").add({
        subject,
        grade,
        questionNumber: questionNumber || "Unknown",
        paperContext: paperContext || "",
        createdAt: FieldValue.serverTimestamp(),
        ...result
      });

      res.json({ remaining: status.remaining, ...result });

    } catch (err: any) {
      console.error("AI Marking error:", err);
      res.status(500).json({ error: "Failed to mark answer" });
    }
  });

  // ── Local File Scanning Endpoint ────────────────────────────────────────
  // GET /api/admin/scan-local
  app.get("/api/admin/scan-local", async (req, res) => {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const publicPapersPath = path.join(process.cwd(), "public", "papers");
      
      const files: string[] = [];
      
      async function scanDir(directory: string) {
        try {
          const entries = await fs.readdir(directory, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
              await scanDir(fullPath);
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
              const relativePath = path.relative(path.join(process.cwd(), "public"), fullPath);
              files.push(`/${relativePath.replace(/\\/g, "/")}`);
            }
          }
        } catch (e: any) {
          if (e.code !== "ENOENT") throw e;
        }
      }
      
      await scanDir(publicPapersPath);
      res.json({ files });
    } catch (e: any) {
      console.error("Local scan error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ── AI Explain Endpoint ─────────────────────────────────────────────────
  // POST /api/ai/explain
  // Body: { uid, question, subject, grade, paperContext?, image? }
  app.post("/api/ai/explain", async (req, res) => {
    const { uid, question, subject, grade, paperContext, image } = req.body;

    if (!uid || !question) {
      return res.status(400).json({ error: "uid and question are required" });
    }

    // 1. Check limit and get context in parallel
    const [usageCheck, learnerContext] = await Promise.all([
      checkAndIncrementUsage(uid, "explain"),
      getLearnerContext(uid)
    ]);
    
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: "limit_reached",
        tier: usageCheck.tier,
        used: usageCheck.used,
        limit: usageCheck.limit,
        upgradeMessage: usageCheck.upgradeMessage,
        upgradeUrl: "/pricing",
      });
    }
    const { tier, used, limit, remaining } = usageCheck;
    
    // Background update learner profile
    updateLearnerTopic(uid, question, subject || "General");

    // 2. Build prompt — South African curriculum focused
    let systemPrompt = `You are GMA Assistant, the AI tutor for Genius Makers Academy — South Africa's leading study platform for Grade 8–12 NSC learners.

Your role:
- Explain NSC past paper questions clearly and step-by-step
- Use South African curriculum (CAPS) terminology
- Speak to the learner directly in a warm, encouraging tone
- For Maths/Science: show full working with each step numbered
- For Languages: explain the language technique or literary device clearly
- For other subjects: break down the concept in plain language first, then apply it to the question
- Always end with a brief tip on how to approach similar questions in an exam
- Keep responses concise but complete — max 400 words
- Never just give the answer — guide the learner to understand

Subject: ${subject || "General"}
Grade: ${grade || "Grade 12"}
${paperContext ? `Paper context: ${paperContext}` : ""}`;

    if (learnerContext) {
      systemPrompt += `\n\nLearner context: ${learnerContext}. If this question relates to a known weak topic, take extra care to explain fundamentals before moving to the specific question.`;
    }

    if (image) {
      systemPrompt += `\n\nThe learner has also provided a screenshot context from their video lesson. If it's a screenshot, reference what is shown in the image when answering.`;
    }

    const userMessage = `${question}`;

    try {
      // 3. Call Gemini (best available model)
      const parts: any[] = [{ text: userMessage }];
      if (image) {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        });
      }

      const response = await getGenAI().models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 600,
          temperature: 0.4,
        },
      });

      const answer = response.text ?? "I couldn't generate a response. Please try again.";

      // 5. Log the query for analytics
      await db.collection("aiQueries").add({
        uid,
        tier,
        subject: subject || "unknown",
        grade: grade || "unknown",
        question: question.substring(0, 200), // store truncated for privacy
        timestamp: FieldValue.serverTimestamp(),
        tokensUsed: answer.length, // rough estimate
      });

      res.json({
        answer,
        tier,
        used,
        limit,
        remaining,
        // Show upgrade nudge when running low
        nudge:
          tier === "starter" && remaining === 1
            ? "Last free question today! Upgrade to Scholar for R5/month."
            : tier === "starter" && remaining === 0
            ? "You've used all 3 free questions. Upgrade to Scholar for R5/month."
            : null,
      });
    } catch (err: any) {
      console.error("Gemini error:", err);
      res.status(500).json({ error: "AI service error. Please try again." });
    }
  });

  // ── AI Hint Mode ────────────────────────────────────────────────────────
  // POST /api/ai/hint
  // Body: { uid, question, subject, grade, hintLevel: 1|2|3 }
  app.post("/api/ai/hint", async (req, res) => {
    const { uid, question, subject, grade, hintLevel = 1 } = req.body;
    if (!uid || !question) return res.status(400).json({ error: "uid and question required" });

    const [usageCheck, learnerContext] = await Promise.all([
      checkAndIncrementUsage(uid, "hint"),
      getLearnerContext(uid)
    ]);

    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: "limit_reached",
        upgradeMessage: usageCheck.upgradeMessage,
        upgradeUrl: "/pricing",
      });
    }

    updateLearnerTopic(uid, question, subject || "General");

    const hintPrompts: Record<number, string> = {
      1: "Give only a very small hint — point the learner in the right direction without revealing the approach. One sentence max.",
      2: "Give a medium hint — explain the approach or formula to use, but don't solve it.",
      3: "Give a detailed hint — show the first step of the solution only.",
    };

    let prompt = `${hintPrompts[hintLevel] || hintPrompts[1]}

Question: ${question}
Subject: ${subject || "General"}, Grade: ${grade || "12"}

Remember: Do NOT give the full answer. Only hint at level ${hintLevel}.`;

    if (learnerContext) {
      prompt += `\n\nLearner context: ${learnerContext}. If this question relates to a known weak topic, take extra care to explain fundamentals before moving to the specific question.`;
    }

    try {
      const response = await getGenAI().models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 200, temperature: 0.3 },
      });

      res.json({
        hint: response.text,
        hintLevel,
        remaining: usageCheck.remaining,
      });
    } catch (err: any) {
      res.status(500).json({ error: "AI hint error." });
    }
  });

  // ── AI Daily Nudge ──────────────────────────────────────────────────────
  app.post("/api/ai/daily-nudge", async (req, res) => {
    try {
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: "Missing uid" });

      const today = new Date().toISOString().split("T")[0];
      const nudgeRef = db.collection("users").doc(uid).collection("dailyNudge").doc(today);
      const nudgeDoc = await nudgeRef.get();

      if (nudgeDoc.exists) {
        return res.json(nudgeDoc.data());
      }

      // Check if user has any activity
      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();
      const userData = userSnap.data() || {};
      
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const [quizSnap, watchSnap] = await Promise.all([
        db.collection("users").doc(uid).collection("quizResults").where("completedAt", ">=", threeDaysAgo).get(),
        db.collection("users").doc(uid).collection("watchHistory").where("completedAt", ">=", threeDaysAgo).get()
      ]);

      const hasActivity = !quizSnap.empty || !watchSnap.empty;

      if (!hasActivity) {
        // Fallback for new accounts or inactive accounts
        const defaultNudge = {
          text: "Welcome to GMA! Try asking the AI Tutor a question on any past paper to get started.",
          topic: null,
          createdAt: FieldValue.serverTimestamp()
        };
        await nudgeRef.set(defaultNudge);
        return res.json(defaultNudge);
      }

      const status = await checkAndIncrementUsage(uid, "dailyNudge");
      if (!status.allowed) {
        return res.status(429).json({ error: "limit_reached" });
      }

      const lp = userData.learnerProfile || {};
      let summary = "";
      
      const quizzes = quizSnap.docs.map(d => (() => { const data = d.data(); return `Quiz on ${data.topic}: ${data.questionsCorrect}/${data.questionsTotal}` })());
      const views = watchSnap.docs.map(d => d.data().topic);

      if (quizzes.length > 0) summary += `Recent quizzes: ${quizzes.join(", ")}. `;
      if (views.length > 0) summary += `Recently watched videos on: ${views.join(", ")}. `;
      if (lp.recentWeakTopics && lp.recentWeakTopics.length > 0) summary += `Weak topics identified: ${lp.recentWeakTopics.map((w: any) => w.topic).join(", ")}. `;

      // Generate with Gemini
      const prompt = `Based on this learner's recent activity: ${summary}
Write one encouraging, specific 2-sentence study nudge for today. 
Reference something concrete from their actual recent activity, not generic encouragement. 
If they have not studied in 3+ days, gently encourage them back without guilt-tripping.
Also return a recommended topic for them to click "Continue studying [topic]" for.
Return ONLY a JSON object with this exact structure (no markdown wrapper, just raw JSON):
{
  "text": "string (the 2-sentence nudge)",
  "topic": "string (the short recommended topic name)"
}`;

      const response = await getGenAI().models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [prompt],
        config: {
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const result = JSON.parse(text);
      
      const nudgeData = {
        ...result,
        createdAt: FieldValue.serverTimestamp()
      };

      await nudgeRef.set(nudgeData);
      res.json(nudgeData);

    } catch (err: any) {
      console.error("Daily nudge error:", err);
      res.status(500).json({ error: "Failed to generate daily nudge" });
    }
  });

  // ── AI Exam Countdown Plan ──────────────────────────────────────────────
  app.get("/api/ai/exam-countdown-plan", async (req, res) => {
    try {
      const uid = req.query.uid as string;
      const subject = req.query.subject as string;
      
      if (!uid || !subject) return res.status(400).json({ error: "uid and subject required" });

      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();
      if (!userSnap.exists) return res.status(404).json({ error: "User not found" });
      const userData = userSnap.data();

      const grade = userData?.grade || 12;
      const province = userData?.province || 'National';
      const curriculum = userData?.curriculum || 'NSC';
      const currentYear = new Date().getFullYear();

      // Find real exam dates from admin timetables
      const timetablesSnap = await db.collection("examTimetables")
        .where("isActive", "==", true)
        .where("year", "==", currentYear)
        .where("curriculum", "==", curriculum)
        .where("province", "in", [province, "National"])
        .get();

      let entries: any[] = [];
      timetablesSnap.forEach(doc => {
          const data = doc.data();
          const matches = data.entries.filter((e: any) => e.subject === subject && e.grade === grade);
          entries.push(...matches);
      });

      if (entries.length === 0) {
          return res.status(404).json({ error: "no_timetable", message: "No exam timetable has been uploaded yet for this subject and province." });
      }

      // Sort by date and pick the first one
      entries.sort((a,b) => {
         const aTime = a.examDate._seconds || (a.examDate.toDate && a.examDate.toDate().getTime()/1000);
         const bTime = b.examDate._seconds || (b.examDate.toDate && b.examDate.toDate().getTime()/1000);
         return aTime - bTime;
      });

      const firstExam = entries[0];
      const examDate = firstExam.examDate.toDate ? firstExam.examDate.toDate() : new Date(firstExam.examDate._seconds * 1000);
      
      const today = new Date();
      // Calculate days setting time portion to 0
      today.setHours(0,0,0,0);
      const eDate = new Date(examDate);
      eDate.setHours(0,0,0,0);
      const daysRemaining = Math.max(0, Math.ceil((eDate.getTime() - today.getTime()) / (1000 * 3600 * 24)));

      const tier = await getUserTier(uid);
      if (tier === "free" || tier === "starter" || tier === "scholar") {
          return res.json({ daysRemaining, planMarkdown: null, isProGate: true });
      }

      const planRef = db.collection("users").doc(uid).collection("examPlans").doc(subject);
      const planSnap = await planRef.get();
      
      const lp = userData?.learnerProfile || {};
      const weakTopics = (lp.recentWeakTopics || []).filter((w: any) => w.subject === subject).map((w: any) => w.topic);
      const weakTopicsStr = weakTopics.join(", ");

      let needsRegen = true;
      let existingPlan = null;
      if (planSnap.exists) {
         const planData = planSnap.data() as any;
         existingPlan = planData;
         const planDate = planData.lastGeneratedAt?.toDate ? planData.lastGeneratedAt.toDate() : new Date(0);
         const daysSince = (new Date().getTime() - planDate.getTime()) / (1000 * 3600 * 24);
         
         if (daysSince < 3 && planData.weakTopicsUsed === weakTopicsStr) {
            needsRegen = false;
         }
      }

      if (!needsRegen && existingPlan && existingPlan.planMarkdown) {
          return res.json({ daysRemaining, planMarkdown: existingPlan.planMarkdown });
      }

      // Construct a string format of the timetable for the AI
      const timetableStr = entries.map(e => `Paper ${e.paperNumber || ''} at ${e.startTime} on ${e.examDate.toDate ? e.examDate.toDate().toLocaleDateString() : new Date(e.examDate._seconds * 1000).toLocaleDateString()}`).join("; ");

      const prompt = `A learner has ${daysRemaining} days until their first ${subject} Grade ${grade} ${curriculum} exam. 
Their exact exam dates are: ${timetableStr}.
Their weak topics are: ${weakTopicsStr || 'none specifically identified yet'}. 
Generate a focused study plan for ${daysRemaining} days (if more than 14 days, group into weekly themes instead of daily). 
In the context, accurately mention the specific paper structures based on the provided timetable dates (e.g. mention Paper 1 and 2 start times).
Format as clean markdown with one focus area per day/week and one specific recommended action (e.g. 'attempt the 2023 P1 trigonometry section').`;

      const response = await getGenAI().models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [prompt],
        config: { temperature: 0.7 }
      });

      const planMarkdown = response.text || "";
      
      const newPlan = {
          planMarkdown,
          weakTopicsUsed: weakTopicsStr,
          lastGeneratedAt: FieldValue.serverTimestamp()
      };
      await planRef.set(newPlan, { merge: true });

      res.json({ daysRemaining, planMarkdown });
      
    } catch (err) {
      console.error("Exam Plan Error:", err);
      res.status(500).json({ error: "Failed to generate plan" });
    }
  });

  app.post("/api/ai/mark-exam-plan-day", async (req, res) => {
    try {
        const { uid, subject } = req.body;
        if (!uid || !subject) return res.status(400).json({ error: "uid and subject required" });
        
        const planRef = db.collection("users").doc(uid).collection("examPlans").doc(subject);
        await planRef.set({
             lastCompletedAt: FieldValue.serverTimestamp(),
             // Force regen for next time? No, we might not want to regen.
             // Maybe we don't clear lastGeneratedAt, just record it.
             completedCount: FieldValue.increment(1)
        }, { merge: true });
        
        res.json({ success: true });
    } catch(err) {
        console.error(err);
        res.status(500).json({error: "Failed to mark done"});
    }
  });

  // ── AI Video Chat Endpoint ──────────────────────────────────────────────
  // POST /api/ai/video-chat
  // Body: { uid, videoTitle, videoTopic, videoSubject, videoGrade, chatHistory, userMessage, image? }
  app.post("/api/ai/video-chat", async (req, res) => {
    const { uid, videoTitle, videoTopic, videoSubject, videoGrade, chatHistory = [], userMessage, image } = req.body;
    if (!uid || !userMessage) return res.status(400).json({ error: "uid and userMessage are required" });

    const usageCheck = await checkAndIncrementUsage(uid, "videoChat");
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: "limit_reached",
        upgradeMessage: usageCheck.upgradeMessage,
        upgradeUrl: "/pricing"
      });
    }

    let systemPrompt = `You are GMA Tutor, an expert NSC and CAPS curriculum tutor for South African high school learners Grade 8 to 12. You are watching this video with the student: ${videoTitle || "General Lesson"} — ${videoSubject || "General"}, Grade ${videoGrade || "12"}. Your role: explain concepts step by step using CAPS terminology, always show full working for maths and science problems, use encouraging language, never just give the answer without explanation, reference the specific video topic when relevant. If a learner is stuck, give a hint first before the full solution. Keep responses under 250 words unless a worked example requires more.`;

    if (image) {
      systemPrompt += `\n\nThe learner has attached a screenshot of the video they are currently watching. Analyze the image carefully to see exactly what is on their screen. Use this visual context to provide a precisely tailored explanation about what they are seeing, addressing their question contextually.`;
    }

    try {
      // Build history for SDK
      const contents = chatHistory.map((item: any) => ({
        role: item.role === "assistant" || item.role === "model" ? "model" : "user",
        parts: [{ text: item.content || item.text }]
      }));
      
      const latestParts: any[] = [{ text: userMessage }];
      if (image) {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        latestParts.push({
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        });
      }
      contents.push({ role: "user", parts: latestParts });

      const response = await getGenAI().models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.5,
          maxOutputTokens: 600,
        }
      });

      res.json({
        answer: response.text,
        remaining: usageCheck.remaining
      });
    } catch (err: any) {
      console.error("Video chat error:", err);
      res.status(500).json({ error: "Failed to process chat with video" });
    }
  });

  // ── AI Video Summary Endpoint ───────────────────────────────────────────
  // POST /api/ai/video-summary
  // Body: { uid, videoTitle, videoTopic, videoSubject, videoGrade }
  app.post("/api/ai/video-summary", async (req, res) => {
    const { uid, videoTitle, videoTopic, videoSubject, videoGrade } = req.body;
    if (!uid) return res.status(400).json({ error: "uid is required" });

    const usageCheck = await checkAndIncrementUsage(uid, "videoSummary");
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: "limit_reached",
        upgradeMessage: usageCheck.upgradeMessage,
        upgradeUrl: "/pricing"
      });
    }

    const systemPrompt = `You are compiling an NSC exam study guide for a Grade ${videoGrade || "12"} learner studying ${videoSubject || "Mathematics"}. The topic is: ${videoTitle || "General Lesson"}. Structure your response in clean markdown with these exact sections:
## Key Concepts
List the 5 most important concepts from this topic with a one-sentence definition each.
## Essential Formulae & Rules
List every formula or rule the learner must memorise for NSC exams on this topic. Show the formula, what each variable means, and one example.
## Common NSC Exam Questions
List 3 question types that regularly appear in NSC exams on this topic, with the approach to answering each.
## Where Learners Lose Marks
List the top 5 mistakes learners make on this topic in NSC exams, with how to avoid each one.
## Quick Revision Checklist
A 10-point checkbox list the learner can use to confirm they understand the topic before the exam.
Keep the entire guide under 800 words.`;

    try {
      const response = await getGenAI().models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Compile a study guide for ${videoTitle}.`,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
          maxOutputTokens: 1000
        }
      });

      res.json({
        summary: response.text,
        remaining: usageCheck.remaining
      });
    } catch (err: any) {
      console.error("Video summary error:", err);
      res.status(500).json({ error: "Failed to generate video lesson summary" });
    }
  });

  // ── AI Video Quiz Endpoint ──────────────────────────────────────────────
  // POST /api/ai/video-quiz
  // Body: { uid, videoTitle, videoTopic, videoSubject, videoGrade }
  app.post("/api/ai/video-quiz", async (req, res) => {
    const { uid, videoTitle, videoTopic, videoSubject, videoGrade } = req.body;
    if (!uid) return res.status(400).json({ error: "uid is required" });

    const usageCheck = await checkAndIncrementUsage(uid, "videoQuiz");
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: "limit_reached",
        upgradeMessage: usageCheck.upgradeMessage,
        upgradeUrl: "/pricing"
      });
    }

    const promptInstructions = `The student is watching the video: "${videoTitle || "General Lesson"}" - ${videoSubject || "General"}, Grade ${videoGrade || "12"}.
Generate exactly 5 NSC-aligned multiple choice questions. Return ONLY valid JSON in this exact format: {questions: [{question: string, options: [string, string, string, string], correct: 0|1|2|3, explanation: string, topic: string, marks: 1|2|3}]}. No markdown, no preamble, just the JSON object.`;

    const systemPrompt = `You are a master High School tutor and examiner specializing in the South African NSC and CAPS curriculum.
Task: Create exactly 5 NSC-aligned multiple-choice questions based on the video topic "${videoTopic || "General Lesson"}" for Grade ${videoGrade || "12"} ${videoSubject || "General"}.

The difficulty distribution MUST be:
- The first 2 questions (indices 0 and 1) must be recall/knowledge level, worth 1 mark each.
- Questions 3 and 4 (indices 2 and 3) must be application level, worth 2 marks each.
- Question 5 (index 4) must be a higher-order NSC-style question worth more marks (3 marks).

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "explanation text",
      "topic": "topic name",
      "marks": 1
    }
  ]
}
Do not use markdown wrappers, no backticks, no preamble, just the raw JSON matching the schema.`;

    try {
      const response = await getGenAI().models.generateContent({
        model: "gemini-2.0-flash",
        contents: promptInstructions,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.5,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correct: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    marks: { type: Type.INTEGER }
                  },
                  required: ["question", "options", "correct", "explanation", "topic", "marks"]
                }
              }
            },
            required: ["questions"]
          }
        }
      });

      const parsedResponse = JSON.parse(response.text || "{}");
      const quizQuestions = parsedResponse.questions || [];

      res.json({
        quiz: quizQuestions,
        remaining: usageCheck.remaining
      });
    } catch (err: any) {
      console.error("Video quiz error:", err);
      res.status(500).json({ error: "Failed to generate video quiz" });
    }
  });

  // ── AI Comment Reply Suggestion Endpoint ─────────────────────────────────
  // POST /api/ai/suggest-comment-reply
  // Body: { uid, commentContent, videoTitle, videoTopic, videoSubject }
  app.post("/api/ai/suggest-comment-reply", async (req, res) => {
    const { uid, commentContent, videoTitle, videoTopic, videoSubject } = req.body;
    if (!uid || !commentContent) return res.status(400).json({ error: "uid and commentContent are required" });

    const usageCheck = await checkAndIncrementUsage(uid, "commentReply");
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: "limit_reached",
        upgradeMessage: usageCheck.upgradeMessage,
        upgradeUrl: "/pricing"
      });
    }

    const systemPrompt = `You are a helpful peer tutor assisting a student with a comment they left on a CAPS video lesson: "${videoTitle}" (subject: ${videoSubject || "General"}, topic: ${videoTopic || "General"}).
They commented: "${commentContent}".
Suggest a friendly, encouraging, and highly helpful response that can assist them, correct common misunderstandings, or expand their learning.
Keep the suggested reply concise, warm, and highly educational under 100 words.`;

    try {
      const response = await getGenAI().models.generateContent({
        model: "gemini-2.0-flash",
        contents: "Create a suggested response helper.",
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.6,
          maxOutputTokens: 250
        }
      });

      res.json({
        suggestedReply: response.text,
        remaining: usageCheck.remaining
      });
    } catch (err: any) {
      console.error("Suggest comment reply error:", err);
      res.status(500).json({ error: "Failed to generate reply suggestion" });
    }
  });

  // ── AI Parse Paper Metadata ─────────────────────────────────────────────
  // POST /api/ai/parse-metadata
  // Body: { items: { path: string, url?: string }[] }
  app.post("/api/ai/parse-metadata", async (req, res) => {
    const { items, paths } = req.body;
    const targets = items || (paths ? paths.map((p: string) => ({ path: p })) : []);
    if (!Array.isArray(targets) || targets.length === 0) return res.status(400).json({ error: "items array required" });

    try {
      const inputs = await Promise.all(targets.map(async (item: any) => {
        let textExtracted = "";
        try {
          if (item.path && item.path.startsWith("/papers/")) {
            const fs = await import("fs/promises");
            const pathLib = await import("path");
            // the /papers/ gets joined, remove leading slash or just use relative logic:
            const localPath = pathLib.join(process.cwd(), "public", item.path);
            const buffer = await fs.readFile(localPath);
            const parsed = await pdfParse(buffer, { max: 2 });
            textExtracted = parsed.text;
          } else if (item.url) {
            const pdfRes = await fetch(item.url);
            const arrayBuffer = await pdfRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            // Limit to max 2 pages for extremely fast metadata processing without memory bloat
            const parsed = await pdfParse(buffer, { max: 2 });
            textExtracted = parsed.text;
          }
        } catch (e: any) {
          console.error("Failed to extract PDF text for", item.path, e.message);
        }
        return {
          path: item.path,
          firstPagesText: textExtracted.substring(0, 5000) // cap text size to prevent token limits
        };
      }));

      const systemPrompt = `You are a metadata extraction assistant for a South African high school past papers database.
Given a list of file paths AND the text extracted from the first few pages of each file, extract the following for each file. Use BOTH the filename and the actual document text to be as accurate as possible!
- title: A clean, human-readable title (e.g. 'Mathematics P1 Nov 2022')
- subject: The recognized subject name (e.g. 'Mathematics', 'Life Sciences')
- grade: The grade number as an integer (e.g. 12, 11, 10). Default to 12 if unsure.
- year: The year as an integer (e.g. 2022). Default to 2024 if unsure.
- curriculum: Either 'NSC' or 'IEB'. Default to 'NSC'.
- paperNumber: 'P1', 'P2', 'P3' or 'P4'. Default to 'P1'.
- type: Either 'question' or 'memo' (memo if it says memo, memorandum, marking guidelines, answers). Question otherwise.
- language: 'English' or 'Afrikaans' (default to 'English' if unspecified)
- province: South African province acronym if present (e.g. 'WC', 'GP', 'KZN'). Default to 'National'.
- topics: Array of strings. Try to infer 1 or 2 topics, but can be empty.
- session: e.g. 'November', 'June', 'March'. Default to 'November'.

Return ONLY a JSON array of objects, strictly in the same order as the input items. The length of the array MUST EXACTLY MATCH the length of the input items.
Ensure the output is pure JSON.`;

      const response = await getGenAI().models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: JSON.stringify(inputs) }] }],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "[]";
      let parsed = JSON.parse(text);
      res.json(parsed);
    } catch (err: any) {
      console.error("Parse metadata error:", err);
      res.status(500).json({ error: "Failed to parse metadata" });
    }
  });

  // ── PayFast — Create Payment ────────────────────────────────────────────
  // POST /api/payment/create
  // Body: { uid, tier, email, name }
  app.post("/api/payment/create", async (req, res) => {
    const { uid, tier = "scholar", email, name } = req.body;
    if (!uid || !email) return res.status(400).json({ error: "uid and email required" });

    const PRICES: Record<string, { amount: string; name: string }> = {
      scholar: { amount: "7.50",  name: "Genius Scholar — R5/month + R2.50 fee" },
      pro:     { amount: "29.00", name: "Genius Pro" },
      elite:   { amount: "79.00", name: "Genius Elite" },
      master:  { amount: "199.00",name: "Genius Master" },
    };

    const plan = PRICES[tier];
    if (!plan) return res.status(400).json({ error: "Invalid tier" });

    const merchantId = process.env.PAYFAST_MERCHANT_ID!;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY!;
    const passphrase = process.env.PAYFAST_PASSPHRASE;
    const isSandbox = process.env.PAYFAST_SANDBOX === "true";
    const baseUrl = process.env.APP_URL || "https://geniusmakers.co.za";

    const data: Record<string, string> = {
      merchant_id:    merchantId,
      merchant_key:   merchantKey,
      return_url:     `${baseUrl}/payment/success?tier=${tier}`,
      cancel_url:     `${baseUrl}/pricing`,
      notify_url:     `${baseUrl}/api/payment/notify`,
      name_first:     name.split(" ")[0] || "Learner",
      name_last:      name.split(" ").slice(1).join(" ") || "GMA",
      email_address:  email,
      m_payment_id:   `${uid}_${tier}_${Date.now()}`,
      amount:         plan.amount,
      item_name:      plan.name,
      custom_str1:    uid,
      custom_str2:    tier,
      subscription_type: "1",
      billing_date:   new Date().toISOString().split("T")[0],
      recurring_amount: plan.amount,
      frequency:      "3", // monthly
      cycles:         "0", // indefinite
    };

    data.signature = generatePayFastSignature(data, passphrase);

    const payfastUrl = isSandbox
      ? "https://sandbox.payfast.co.za/eng/process"
      : "https://www.payfast.co.za/eng/process";

    res.json({ payfastUrl, data });
  });

  // ── PayFast — ITN Webhook ───────────────────────────────────────────────
  // POST /api/payment/notify  (PayFast calls this on successful payment)
  app.post("/api/payment/notify", async (req, res) => {
    try {
      const { custom_str1: uid, custom_str2: tier, payment_status } = req.body;

      if (payment_status === "COMPLETE" && uid && tier) {
        // Update user tier in Firestore
        await db.collection("users").doc(uid).set(
          {
            tier,
            tierActivatedAt: FieldValue.serverTimestamp(),
            subscriptionStatus: "active",
          },
          { merge: true }
        );

        // Log the payment
        await db.collection("payments").add({
          uid,
          tier,
          amount: req.body.amount_gross,
          payfastId: req.body.pf_payment_id,
          timestamp: FieldValue.serverTimestamp(),
        });

        console.log(`✅ Payment confirmed: ${uid} upgraded to ${tier}`);
      }

      res.status(200).send("OK");
    } catch (err: any) {
      console.error("Payment notify error:", err);
      res.status(200).send("OK"); // Always 200 to PayFast
    }
  });

  // ── Administrative Bootstrap & Sync Endpoints ─────────────────────────
  // Ingests public/past-papers.json and populates both "past-papers" and "papers" collections
  app.post("/api/admin/bootstrap-vault", async (req, res) => {
    try {
      const fs = await import("fs/promises");
      const pathLib = await import("path");
      
      const jsonPath = pathLib.join(process.cwd(), "public", "past-papers.json");
      const jsonStr = await fs.readFile(jsonPath, "utf-8");
      const papersList = JSON.parse(jsonStr);
      
      if (!Array.isArray(papersList) || papersList.length === 0) {
        return res.status(400).json({ error: "No papers found in past-papers.json" });
      }

      console.log(`🚀 Ingesting ${papersList.length} papers from past-papers.json into Firestore...`);

      const pastPapersColRef = db.collection("past-papers");
      const papersColRef = db.collection("papers");

      const limitCount = Number(req.body.limit) || papersList.length;
      const skipCount = Number(req.body.skip) || 0;
      const targetChunk = papersList.slice(skipCount, skipCount + limitCount);

      const BATCH_SIZE = 400;
      let added = 0;

      for (let i = 0; i < targetChunk.length; i += BATCH_SIZE) {
        const chunk = targetChunk.slice(i, i + BATCH_SIZE);
        const batch = db.batch();

        for (const item of chunk) {
          const pastPaperId = item.id || crypto.randomUUID().substring(0, 20);
          const pastPaperRef = pastPapersColRef.doc(pastPaperId);
          
          batch.set(pastPaperRef, {
            id: pastPaperId,
            title: item.title || item.fileName || "Unnamed Paper",
            subject: item.subject || "Unclassified",
            grade: Number(item.grade) || 12,
            year: Number(item.year) || 2024,
            curriculum: item.curriculum || "NSC",
            paperNumber: item.paperNumber || "P1",
            type: item.type || "question",
            language: item.language || "English",
            fileUrl: item.fileUrl || "",
            storagePath: item.storagePath || "",
            downloadCount: Number(item.downloadCount) || 0,
            topics: Array.isArray(item.topics) ? item.topics : [],
            isVerified: item.isVerified !== undefined ? item.isVerified : true,
            fileSize: Number(item.fileSize) || 0,
            session: item.session || "Various",
            province: item.province || "National",
            uploadedBy: item.uploadedBy || "bootstrap-system",
            createdAt: FieldValue.serverTimestamp()
          }, { merge: true });

          const papersRef = papersColRef.doc(pastPaperId);
          batch.set(papersRef, {
            id: pastPaperId,
            storagePath: item.storagePath || "",
            fileName: item.title || item.fileName || "Unnamed Paper",
            subject: item.subject || "Unclassified",
            level: item.level || "",
            paper: item.paperNumber || "P1",
            isMemo: item.type === "memo",
            year: String(item.year || "2024"),
            session: item.session || "Various",
            grade: "Grade " + (item.grade || "12"),
            province: item.province || "National",
            curriculum: item.curriculum || "NSC",
            language: item.language || "English",
            downloadUrl: item.fileUrl || "",
            subjectLower: (item.subject || "Unclassified").toLowerCase(),
            yearInt: Number(item.year) || 2024,
            indexed: true,
            indexedAt: FieldValue.serverTimestamp()
          }, { merge: true });

          added++;
        }

        await batch.commit();
        console.log(`✅ Chunk successfully bootstrapped: ${added} / ${targetChunk.length} papers`);
      }

      // Re-create the meta papersIndex doc for hook queries
      const subjects = [...new Set(papersList.map(p => p.subject))].sort();
      const years = [...new Set(papersList.map(p => String(p.year)))].sort().reverse();

      await db.collection("meta").doc("papersIndex").set({
        totalPapers: papersList.length,
        subjects,
        years,
        lastIndexed: FieldValue.serverTimestamp()
      }, { merge: true });

      res.json({
        success: true,
        message: `Successfully seeded/synced ${added} papers into Firestore database!`,
        totalSeeded: added,
        totalMetaIndexed: papersList.length,
        subjectsCount: subjects.length,
        yearsCount: years.length
      });
    } catch (e: any) {
      console.error("Failed to seed database from local past-papers.json:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/admin/db-stats
  app.get("/api/admin/db-stats", async (req, res) => {
    try {
      const pastPapersCountSnap = await db.collection("past-papers").count().get();
      const papersCountSnap = await db.collection("papers").count().get();
      res.json({
        pastPapersCount: pastPapersCountSnap.data().count,
        papersCount: papersCountSnap.data().count,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Admin: Bulk Import YouTube Channel Uploads ────────────────────────────
  // POST /api/admin/import-youtube-channel
  // Body: { channelId, subject, grade }
  app.post("/api/admin/import-youtube-channel", async (req, res) => {
    try {
      const { channelId, subject = "Physical Sciences", grade = 12 } = req.body;
      
      let apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        const secretsDoc = await db.collection('settings').doc('secrets').get();
        if (secretsDoc.exists) {
          apiKey = secretsDoc.data()?.youtubeApiKey;
        }
      }

      if (!apiKey) {
        return res.status(400).json({ error: "Missing YouTube API Key. Please add it in Admin Settings > External API Secrets." });
      }

      if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
      }

      const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&id=${channelId}&key=${apiKey}`);
      const channelData: any = await channelRes.json();
      
      if (!channelData.items || channelData.items.length === 0) {
        return res.status(404).json({ error: "Channel not found on YouTube" });
      }

      const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
      const channelName = channelData.items[0].snippet.title;

      let nextPageToken = "";
      let totalImported = 0;
      const videosRef = db.collection("videoLessons");

      for (let i = 0; i < 30; i++) {
        const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
        
        const plRes = await fetch(playlistUrl);
        const plData: any = await plRes.json();
        
        if (!plData.items || plData.items.length === 0) break;

        const batch = db.batch();
        for (const item of plData.items) {
          const videoId = item.contentDetails.videoId;
          const title = item.snippet.title;
          
          if (title === "Private video" || title === "Deleted video") continue;

          const newDoc = videosRef.doc();
          batch.set(newDoc, {
            youtubeVideoId: videoId,
            title: title,
            subject: subject,
            grade: Number(grade),
            curriculum: "NSC",
            topic: "Unverified",
            creatorName: channelName,
            creatorChannelUrl: `https://youtube.com/channel/${channelId}`,
            isActive: true,
            thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
            durationSeconds: 0,
            viewCountOnGMA: 0,
            addedAt: FieldValue.serverTimestamp()
          });
          totalImported++;
        }
        
        await batch.commit();

        nextPageToken = plData.nextPageToken;
        if (!nextPageToken) break;
      }

      res.json({ success: true, count: totalImported, message: `Successfully imported ${totalImported} videos from ${channelName}` });
    } catch (err: any) {
      console.error("YouTube import error:", err);
      res.status(500).json({ error: err.message || "Failed to bulk import videos" });
    }
  });

  // ── AI Build Weak Topic Pack ──────────────────────────────────────────────
  app.post("/api/ai/build-weak-topic-pack", async (req, res) => {
    try {
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: "uid is required" });

      const tier = await getUserTier(uid);
      if (tier === "free" || tier === "starter") {
        return res.status(403).json({ error: "Requires Scholar tier or higher" });
      }

      const quizDocs = await db.collection("users").doc(uid).collection("quizResults")
        .orderBy("completedAt", "desc")
        .limit(10)
        .get();

      if (quizDocs.size < 3) {
        return res.status(400).json({ error: "Complete 3 quizzes first so AI can learn your weak topics" });
      }

      const wrongTopicCounts: Record<string, number> = {};
      const subjectCounts: Record<string, number> = {};
      const gradeCounts: Record<number, number> = {};

      quizDocs.forEach(doc => {
        const data = doc.data();
        if (data.subject) subjectCounts[data.subject] = (subjectCounts[data.subject] || 0) + 1;
        if (data.grade) gradeCounts[data.grade] = (gradeCounts[data.grade] || 0) + 1;
        if (Array.isArray(data.wrongTopics)) {
          data.wrongTopics.forEach(t => {
            wrongTopicCounts[t] = (wrongTopicCounts[t] || 0) + 1;
          });
        }
      });

      const topSubject = Object.keys(subjectCounts).sort((a,b) => subjectCounts[b] - subjectCounts[a])[0];
      const topGrade = Number(Object.keys(gradeCounts).sort((a,b) => gradeCounts[Number(b)] - gradeCounts[Number(a)])[0]);
      
      const sortedWrongTopics = Object.keys(wrongTopicCounts).sort((a,b) => wrongTopicCounts[b] - wrongTopicCounts[a]).slice(0, 3);

      if (sortedWrongTopics.length === 0) {
        return res.status(400).json({ error: "Not enough data to calculate weak topics yet (you haven't made any mistakes!)." });
      }

      const items: any[] = [];
      
      // Target Videos
      for (const topic of sortedWrongTopics) {
        const videoSnap = await db.collection("videoLessons")
          .where("subject", "==", topSubject)
          .where("grade", "==", topGrade)
          .limit(10)
          .get();
        videoSnap.docs.forEach(doc => {
          const v = doc.data();
          if ((v.topic?.toLowerCase().includes(topic.toLowerCase()) || v.title?.toLowerCase().includes(topic.toLowerCase())) && !items.find(i => i.refId === doc.id)) {
            items.push({ type: "video", refId: doc.id });
          }
        });
      }

      // Target Papers
      const paperSnap = await db.collection("past-papers")
        .where("subject", "==", topSubject)
        .where("grade", "==", topGrade)
        .limit(20)
        .get();
      paperSnap.docs.forEach(doc => {
        const p = doc.data();
        let matchesTopic = false;
        if (p.topics && Array.isArray(p.topics)) {
          for (const t of sortedWrongTopics) {
            if (p.topics.some((pt: string) => pt.toLowerCase().includes(t.toLowerCase()))) {
              matchesTopic = true;
              break;
            }
          }
        }
        if (matchesTopic && !items.find(i => i.refId === doc.id)) {
          items.push({ type: "doc", refId: doc.id });
        }
      });

      if (items.filter(i => i.type === "doc").length === 0 && paperSnap.docs.length > 0) {
        items.push({ type: "doc", refId: paperSnap.docs[0].id });
      }

      if (items.length === 0) {
         return res.status(400).json({ error: "Could not find any content in the database matching your weak topics for your grade." });
      }

      const prompt = `Write a short 2-sentence description for a personalized study pack. The learner has recently completed quizzes. The pack focuses on their weakest topics: ${sortedWrongTopics.join(", ")}. Speak directly to the learner in an encouraging tutor tone.`;

      const response = await getGenAI().models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: { maxOutputTokens: 100 }
      });
      const description = response.text || `Built from your recent quizzes. The AI has assembled videos and papers focusing specifically on ${sortedWrongTopics.join(", ")}.`;

      const docRef = await db.collection("studyPacks").add({
        title: `AI Weakness Targeting: ${topSubject} Grade ${topGrade}`,
        description,
        subject: topSubject,
        grade: topGrade,
        curriculum: "NSC",
        isPublic: false,
        createdBy: uid,
        priceInCents: 0,
        createdAt: FieldValue.serverTimestamp(),
        items: items.slice(0, 10),
        coverColor: "#1D9E75" 
      });

      res.json({ id: docRef.id });

    } catch (err: any) {
      console.error("Build weak topic pack error:", err);
      res.status(500).json({ error: "Failed to assemble weak topic pack." });
    }
  });

  // ── AI Smart Study Generator ──────────────────────────────────────────────
  app.post("/api/ai/generate-study-plan", async (req, res) => {
    try {
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: "uid is required" });

      const tier = await getUserTier(uid);
      if (tier === "free") {
        return res.status(403).json({ error: "Requires Scholar tier or higher" });
      }

      // Query historical data
      const quizDocs = await db.collection("users").doc(uid).collection("quizResults")
        .orderBy("completedAt", "desc")
        .limit(20)
        .get();

      const videoProgressDocs = await db.collection("users").doc(uid).collection("videoProgress")
        .orderBy("updatedAt", "desc")
        .limit(20)
        .get();

      const quizData = quizDocs.docs.map(doc => doc.data());
      const videoData = videoProgressDocs.docs.map(doc => doc.data());

      let promptText = `
You are an expert AI tutor. Based on the following student data, generate a weekly study plan.
The plan must be formatted as a JSON array of events, where each event has:
- "day": integer (1 for Monday, 2 for Tuesday, ..., 7 for Sunday)
- "time": string (e.g., "16:00")
- "title": string
- "type": string (must be one of: "ai", "study", "exam")

Recent Quiz Results:
${JSON.stringify(quizData.slice(0, 5), null, 2)}

Recent Video Progress:
${JSON.stringify(videoData.slice(0, 5), null, 2)}

Return ONLY the raw JSON array. Do not include markdown or \`\`\`json blocks. If there's no data, suggest a general study plan for math and science.
      `.trim();

      const response = await getGenAI().models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: promptText,
        config: { maxOutputTokens: 800 }
      });

      let responseText = response.text || "[]";
      responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

      let events = [];
      try {
        events = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse AI study plan:", responseText);
        events = [
          { day: 1, time: "16:00", title: "Review Mathematics concepts", type: "study" },
          { day: 3, time: "15:00", title: "Practice Science past papers", type: "exam" },
          { day: 5, time: "17:00", title: "AI Guided Subject Review", type: "ai" }
        ];
      }

      res.json({ events });

    } catch (err: any) {
      console.error("Generate study plan error:", err);
      res.status(500).json({ error: "Failed to generate study plan." });
    }
  });

  // ── Live Co-Study Rooms ────────────────────────────────────────────────
  const PII_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\+?\d[\d -]{8,}\d)/i;
  const SOCIAL_REGEX = /(insta|snap|tiktok|whatsapp|fb|facebook)[\s:]*@?[\w]+/i;

  app.post("/api/costudy/send-message", async (req, res) => {
    const { roomId, uid, displayName, text } = req.body;
    if (!roomId || !uid || !text || typeof text !== 'string') return res.status(400).json({ error: "Missing parameters" });

    if (PII_REGEX.test(text) || SOCIAL_REGEX.test(text)) {
       return res.status(400).json({ error: "For your safety, sharing contact details isn't allowed in study rooms." });
    }

    try {
      const roomRef = db.collection("coStudyRooms").doc(roomId);
      const roomDoc = await roomRef.get();
      if (!roomDoc.exists) return res.status(404).json({ error: "Room not found" });
      const room = roomDoc.data();
      if (room?.status === "expired" || (room?.expiresAt && room.expiresAt.toDate() < new Date())) {
         return res.status(400).json({ error: "Room has expired." });
      }

      await roomRef.collection("messages").add({
         uid,
         displayName,
         text,
         timestamp: FieldValue.serverTimestamp()
      });
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.post("/api/costudy/create-room", async (req, res) => {
     const { uid, subject, grade, joinMode, schoolId } = req.body;
     if (!uid || !subject || !grade || !joinMode) return res.status(400).json({ error: "Missing config" });

     try {
       // Check if user is already in an active room
       const existingRooms = await db.collection("coStudyRooms")
         .where("members", "array-contains", uid)
         .where("status", "==", "active")
         .get();
       
       const now = new Date();
       for (const doc of existingRooms.docs) {
          const r = doc.data();
          if (r.expiresAt && r.expiresAt.toDate() > now) {
             return res.status(400).json({ error: "You are already in an active room. Leave it before creating a new one." });
          }
       }

       const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
       const expiresAt = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours

       const docRef = db.collection("coStudyRooms").doc();
       await docRef.set({
          id: docRef.id,
          createdBy: uid,
          subject,
          grade,
          joinCode,
          joinMode,
          schoolId: joinMode === 'school' ? schoolId : null,
          members: [uid],
          status: "active",
          createdAt: FieldValue.serverTimestamp(),
          expiresAt: expiresAt
       });

       res.json({ roomId: docRef.id, joinCode });
     } catch (err) {
       console.error(err);
       res.status(500).json({ error: "Failed to create room" });
     }
  });

  app.post("/api/costudy/join-room", async (req, res) => {
     const { uid, joinCode, roomId } = req.body;
     if (!uid || (!joinCode && !roomId)) return res.status(400).json({ error: "Missing parameters" });

     try {
       // Check if user is already in another active room
       const existingRooms = await db.collection("coStudyRooms")
         .where("members", "array-contains", uid)
         .where("status", "==", "active")
         .get();
       
       const now = new Date();
       let isAlreadyInThisRoom = false;
       for (const doc of existingRooms.docs) {
          const r = doc.data();
          if (r.expiresAt && r.expiresAt.toDate() > now) {
             if (doc.id === roomId || r.joinCode === joinCode) {
                 isAlreadyInThisRoom = true;
             } else {
                 return res.status(400).json({ error: "You are already in an active room." });
             }
          }
       }

       if (isAlreadyInThisRoom) {
           return res.json({ roomId }); 
       }

       let roomDoc;
       if (joinCode) {
          const snap = await db.collection("coStudyRooms")
            .where("joinCode", "==", joinCode.toUpperCase())
            .where("status", "==", "active")
            .limit(1).get();
          if (!snap.empty) roomDoc = snap.docs[0];
       } else if (roomId) {
          roomDoc = await db.collection("coStudyRooms").doc(roomId).get();
       }

       if (!roomDoc || !roomDoc.exists) return res.status(404).json({ error: "Room not found or inactive" });

       const roomStr = roomDoc.data();
       if (roomStr?.expiresAt && roomStr.expiresAt.toDate() < now) {
           return res.status(400).json({ error: "Room has expired." });
       }
       if (roomStr?.members?.length >= 8) {
           return res.status(400).json({ error: "Room is full (max 8)." });
       }

       await roomDoc.ref.update({
          members: FieldValue.arrayUnion(uid)
       });

       res.json({ roomId: roomDoc.id });
     } catch(err) {
       console.error(err);
       res.status(500).json({ error: "Failed to join room" });
     }
  });

  app.post("/api/costudy/start-timer", async (req, res) => {
     const { roomId, uid, durationMinutes } = req.body;
     try {
        const roomRef = db.collection("coStudyRooms").doc(roomId);
        await roomRef.update({
            timerStartedAt: FieldValue.serverTimestamp(),
            timerDurationMinutes: durationMinutes || 25
        });
        res.json({ success: true });
     } catch(err) {
        res.status(500).json({ error: "Failed to start timer" });
     }
  });

  app.post("/api/costudy/start-quiz", async (req, res) => {
     const { roomId, subject, grade } = req.body;
     try {
       const prompt = `Create a 3-question multiple choice quiz for Grade ${grade} ${subject} in South African NSC curriculum. Try to pick engaging and common topics. Return JSON ONLY using this exact schema: {"quizTitle": "Subject Quiz", "questions": [{"question": "Text", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "Detailed answer."}]}`;
       
       const response = await getGenAI().models.generateContent({
         model: "gemini-3.1-pro-preview",
         contents: prompt,
         config: { responseMimeType: "application/json" }
       });

       const json = JSON.parse(response.text || "{}");
       if (!json.questions || !json.questions.length) throw new Error("Invalid format");

       await db.collection("coStudyRooms").doc(roomId).update({
          groupQuiz: json,
          groupQuizActiveQuestion: 0,
          groupQuizRevealed: false,
          groupQuizStartedAt: FieldValue.serverTimestamp()
       });

       res.json({ success: true });
     } catch(err) {
       console.error(err);
       res.status(500).json({ error: "Failed to start group quiz" });
     }
  });

  app.post("/api/costudy/report-room", async (req, res) => {
     const { roomId, uid, reason } = req.body;
     if (!roomId || !uid) return res.status(400).json({ error: "Missing parameters" });

     try {
       await db.collection("roomReports").add({
         roomId,
         reportedBy: uid,
         reason: reason || "General safety concern",
         timestamp: FieldValue.serverTimestamp(),
         status: "pending"
       });
       res.json({ success: true });
     } catch(err) {
       console.error(err);
       res.status(500).json({ error: "Failed to report room" });
     }
  });

  // ── Vite Dev / Static Prod ──────────────────────────────────────────────
  const isProduction = process.env.NODE_ENV === "production";
  const distPath = path.join(process.cwd(), "dist");

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Failed to start Vite, falling back to static dist");
      app.use(express.static(distPath));
      app.get("*all", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
    }
  } else {
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Genius Makers Academy running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
