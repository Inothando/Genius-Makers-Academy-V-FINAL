#!/usr/bin/env node
// scripts/indexPapers.mjs
// Run ONCE in Cloud Shell to index all 5,696 papers into Firestore
// Command: node scripts/indexPapers.mjs
//
// This reads from Firebase Storage, parses every filename,
// and writes structured metadata to Firestore collection "papers"
// so the frontend can filter/search without listing Storage every time.

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, WriteBatch } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Uses Application Default Credentials in Cloud Shell automatically
if (!getApps().length) {
  initializeApp({
    storageBucket: "genius-makers-academy",
  });
}

const db = getFirestore("ai-studio-4b2a9c5a-dce4-41b1-ad09-7b9eb0cddaef");
const storage = getStorage();
const bucket = storage.bucket("genius-makers-academy");

// ── Subject map (same as frontend) ──────────────────────────────────────────
const SUBJECT_MAP = {
  mathematics: "Mathematics",
  mathematical_literacy: "Mathematical Literacy",
  physical_sciences: "Physical Sciences",
  life_sciences: "Life Sciences",
  english: "English",
  afrikaans: "Afrikaans",
  geography: "Geography",
  history: "History",
  accounting: "Accounting",
  economics: "Economics",
  business_studies: "Business Studies",
  computer_applications_technology: "CAT",
  information_technology: "Information Technology",
  life_orientation: "Life Orientation",
  tourism: "Tourism",
  agricultural_sciences: "Agricultural Sciences",
  dramatic_arts: "Dramatic Arts",
  music: "Music",
  visual_arts: "Visual Arts",
  civil_technology: "Civil Technology",
  electrical_technology: "Electrical Technology",
  mechanical_technology: "Mechanical Technology",
  engineering_graphics: "Engineering Graphics & Design",
  consumer_studies: "Consumer Studies",
  hospitality_studies: "Hospitality Studies",
  isizulu: "isiZulu",
  isixhosa: "isiXhosa",
  sesotho: "Sesotho",
  setswana: "Setswana",
  sepedi: "Sepedi",
  tshivenda: "Tshivenda",
  xitsonga: "Xitsonga",
  siswati: "siSwati",
  isindobele: "isiNdebele",
};

const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];

function detectProvince(name) {
  const lower = name.toLowerCase();
  for (const p of PROVINCES) {
    if (lower.includes(p.toLowerCase().replace(/\s/g, "_")) || lower.includes(p.toLowerCase())) {
      return p;
    }
  }
  return "National";
}

function detectLevel(name) {
  const upper = name.toUpperCase();
  if (upper.includes("_HL") || upper.includes("HOME_LANGUAGE")) return "HL";
  if (upper.includes("_FAL") || upper.includes("FIRST_ADDITIONAL")) return "FAL";
  if (upper.includes("_SAL") || upper.includes("SECOND_ADDITIONAL")) return "SAL";
  return "";
}

function detectPaper(name) {
  const upper = name.toUpperCase();
  const match = upper.match(/_P(\d)/) || upper.match(/PAPER[_\s]?(\d)/);
  return match ? `P${match[1]}` : "";
}

function detectSession(path) {
  const lower = path.toLowerCase();
  if (lower.includes("mayjune") || lower.includes("may_june")) return "May/June";
  if (lower.includes("november") || lower.includes("_nov") || lower.includes("novdec")) return "November";
  if (lower.includes("march")) return "March";
  if (lower.includes("august") || lower.includes("_aug")) return "August";
  if (lower.includes("sept")) return "September";
  if (lower.includes("term1")) return "Term 1";
  if (lower.includes("term2")) return "Term 2";
  if (lower.includes("term3")) return "Term 3";
  if (lower.includes("term4")) return "Term 4";
  return "Unknown";
}

function detectYear(path) {
  const m = path.match(/\b(20\d{2})\b/);
  return m ? m[1] : "Unknown";
}

function detectGrade(path) {
  const lower = path.toLowerCase();
  const m = lower.match(/grade[_\s]?(\d+)/);
  if (m) return `Grade ${m[1]}`;
  if (lower.includes("/grade10/")) return "Grade 10";
  if (lower.includes("/grade11/")) return "Grade 11";
  if (lower.includes("/grade12/")) return "Grade 12";
  return "Grade 12";
}

function detectSubject(fileName, parts) {
  // Try folder-level subject from structured path
  const nscIdx = parts.findIndex(p => p.toLowerCase() === "nsc");
  if (nscIdx !== -1 && parts.length > nscIdx + 4) {
    const folderSubject = parts[nscIdx + 4].toLowerCase();
    const mapped = SUBJECT_MAP[folderSubject] ||
      Object.entries(SUBJECT_MAP).find(([k]) => folderSubject.includes(k))?.[1];
    if (mapped) return mapped;
    return parts[nscIdx + 4].replace(/_/g, " ");
  }

  // Parse from filename
  const name = fileName.replace(/\.(pdf|PDF)$/, "").toLowerCase();
  const cleaned = name
    .replace(/\b(memo|memorandum|p1|p2|p3|paper|hl|fal|sal|grade\s*\d+)\b/gi, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\d{4}/g, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [key, value] of Object.entries(SUBJECT_MAP)) {
    if (cleaned.replace(/\s/g, "_").includes(key) || cleaned.includes(key.replace(/_/g, " "))) {
      return value;
    }
  }

  return cleaned.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Other";
}

function stableId(path) {
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    hash = ((hash << 5) - hash) + path.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function makeDownloadUrl(storagePath) {
  return `https://firebasestorage.googleapis.com/v0/b/genius-makers-academy/o/${encodeURIComponent(storagePath)}?alt=media`;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 GMA Paper Indexer starting...");
  console.log("📦 Listing all files in genius-makers-academy bucket...\n");

  const [files] = await bucket.getFiles({ prefix: "past-papers/" });
  const pdfs = files.filter(f => f.name.toLowerCase().endsWith(".pdf"));

  console.log(`📄 Found ${pdfs.length} PDFs. Parsing and indexing...\n`);

  const papersRef = db.collection("papers");

  // Process in batches of 400 (Firestore batch limit is 500)
  const BATCH_SIZE = 400;
  let processed = 0;
  let skipped = 0;

  for (let i = 0; i < pdfs.length; i += BATCH_SIZE) {
    const chunk = pdfs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const file of chunk) {
      const storagePath = file.name;
      const parts = storagePath.split("/");
      const fileName = parts[parts.length - 1];

      // Skip non-meaningful files
      if (fileName === "Data.pdf" || fileName === "Data_Files.pdf") {
        skipped++;
        continue;
      }

      const isMemo = /memo|memorandum/i.test(fileName);
      const curriculum = storagePath.toLowerCase().includes("/nsc/") ? "NSC"
        : storagePath.toLowerCase().includes("/ieb/") ? "IEB"
        : "NSC";

      const subject = detectSubject(fileName, parts);
      const year = detectYear(storagePath);
      const session = detectSession(storagePath);
      const grade = detectGrade(storagePath);
      const province = detectProvince(fileName);
      const level = detectLevel(fileName);
      const paper = detectPaper(fileName);
      const language = fileName.toLowerCase().includes("afrikaans") ? "Afrikaans" : "English";

      const docId = stableId(storagePath);
      const docRef = papersRef.doc(docId);

      batch.set(docRef, {
        id: docId,
        storagePath,
        fileName,
        subject,
        level,
        paper,
        isMemo,
        year,
        session,
        grade,
        province,
        curriculum,
        language,
        downloadUrl: makeDownloadUrl(storagePath),
        // Search fields — lowercase for Firestore queries
        subjectLower: subject.toLowerCase(),
        yearInt: year !== "Unknown" ? parseInt(year) : 0,
        indexed: true,
        indexedAt: new Date(),
      }, { merge: true });

      processed++;
    }

    await batch.commit();
    console.log(`✅ Batch committed: ${Math.min(i + BATCH_SIZE, pdfs.length)}/${pdfs.length} files`);
  }

  // Create Firestore indexes needed for queries
  console.log("\n📊 Creating summary document...");
  const subjects = [...new Set((await papersRef.get()).docs.map(d => d.data().subject))].sort();
  const years = [...new Set((await papersRef.get()).docs.map(d => d.data().year).filter(y => y !== "Unknown"))].sort().reverse();

  await db.collection("meta").doc("papersIndex").set({
    totalPapers: processed,
    skipped,
    subjects,
    years,
    lastIndexed: new Date(),
  });

  console.log(`\n🎉 Done! Indexed ${processed} papers, skipped ${skipped}`);
  console.log(`📚 Subjects found: ${subjects.length}`);
  console.log(`📅 Years covered: ${years.join(", ")}`);
  console.log("\n✅ Your Firestore 'papers' collection is ready!");
  console.log("✅ Add these Firestore composite indexes in the Firebase console:");
  console.log("   Collection: papers");
  console.log("   Index 1: subject ASC + year DESC + isMemo ASC");
  console.log("   Index 2: grade ASC + subject ASC + session ASC");
  console.log("   Index 3: curriculum ASC + subject ASC + year DESC");
}

main().catch(err => {
  console.error("❌ Indexer failed:", err);
  process.exit(1);
});
