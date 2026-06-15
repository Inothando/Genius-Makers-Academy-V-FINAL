import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

// @ts-ignore
import pdfParse from "pdf-parse/lib/pdf-parse.js";

// ─── Firebase Admin Init ───────────────────────────────────────────────────
if (!getApps().length) {
  // In Cloud Run / production, uses Application Default Credentials automatically.
  // In development, set GOOGLE_APPLICATION_CREDENTIALS env var to your service account JSON path.
  initializeApp();
}
const db = getFirestore("ai-studio-4b2a9c5a-dce4-41b1-ad09-7b9eb0cddaef");

// ─── Gemini Init ───────────────────────────────────────────────────────────
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

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

async function getUsageToday(uid: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  try {
    const doc = await db
      .collection("users").doc(uid)
      .collection("aiUsage").doc(today)
      .get();
    return doc.exists ? (doc.data()?.queries ?? 0) : 0;
  } catch {
    return 0;
  }
}

async function incrementUsage(uid: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const ref = db.collection("users").doc(uid).collection("aiUsage").doc(today);
  await ref.set({ queries: FieldValue.increment(1) }, { merge: true });
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
  const PORT = 3000;

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
    const used = await getUsageToday(uid);
    const limit = TIER_LIMITS[tier] ?? 3;
    const remaining = Math.max(0, limit - used);

    res.json({ tier, used, limit, remaining, canQuery: remaining > 0 });
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
  // Body: { uid, question, subject, grade, paperContext? }
  app.post("/api/ai/explain", async (req, res) => {
    const { uid, question, subject, grade, paperContext } = req.body;

    if (!uid || !question) {
      return res.status(400).json({ error: "uid and question are required" });
    }

    // 1. Get tier and check limit
    const tier = await getUserTier(uid);
    const used = await getUsageToday(uid);
    const limit = TIER_LIMITS[tier] ?? 3;

    if (used >= limit) {
      return res.status(429).json({
        error: "limit_reached",
        tier,
        used,
        limit,
        upgradeMessage:
          tier === "starter"
            ? "You've used your 3 free AI questions today. Upgrade to Scholar for R5/month and get 20 questions daily."
            : `You've reached your ${limit} daily AI questions. Upgrade to Pro for unlimited access.`,
        upgradeUrl: "/pricing",
      });
    }

    // 2. Build prompt — South African curriculum focused
    const systemPrompt = `You are GMA Assistant, the AI tutor for Genius Makers Academy — South Africa's leading study platform for Grade 8–12 NSC learners.

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

    const userMessage = `${question}`;

    try {
      // 3. Call Gemini (best available model)
      const response = await genAI.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 600,
          temperature: 0.4,
        },
      });

      const answer = response.text ?? "I couldn't generate a response. Please try again.";

      // 4. Increment usage AFTER successful response
      await incrementUsage(uid);

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

      const newUsed = used + 1;
      const remaining = Math.max(0, limit - newUsed);

      res.json({
        answer,
        tier,
        used: newUsed,
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

    const tier = await getUserTier(uid);
    const used = await getUsageToday(uid);
    const limit = TIER_LIMITS[tier] ?? 3;

    if (used >= limit) {
      return res.status(429).json({
        error: "limit_reached",
        upgradeMessage: "Upgrade to Scholar for R5/month to get more daily questions.",
        upgradeUrl: "/pricing",
      });
    }

    const hintPrompts: Record<number, string> = {
      1: "Give only a very small hint — point the learner in the right direction without revealing the approach. One sentence max.",
      2: "Give a medium hint — explain the approach or formula to use, but don't solve it.",
      3: "Give a detailed hint — show the first step of the solution only.",
    };

    const prompt = `${hintPrompts[hintLevel] || hintPrompts[1]}

Question: ${question}
Subject: ${subject || "General"}, Grade: ${grade || "12"}

Remember: Do NOT give the full answer. Only hint at level ${hintLevel}.`;

    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 200, temperature: 0.3 },
      });

      await incrementUsage(uid);
      res.json({
        hint: response.text,
        hintLevel,
        remaining: Math.max(0, limit - (used + 1)),
      });
    } catch (err: any) {
      res.status(500).json({ error: "AI hint error." });
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

      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
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

  // ── Vite Dev / Static Prod ──────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Genius Makers Academy running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
