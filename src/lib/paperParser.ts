// src/lib/paperParser.ts
// Parses GMA Storage filenames into structured PaperMetadata
// Handles both structured paths (NSC/2024/MayJune/Grade12/Subject/file.pdf)
// and flat root files (Mathematics_P1.pdf, Afrikaans_SAL_P2_(Eastern_Cape).pdf)

export interface PaperMetadata {
  id: string;           // stable hash of storagePath
  storagePath: string;  // full gs:// path without bucket
  fileName: string;     // raw filename
  subject: string;      // e.g. "Mathematics"
  level: string;        // HL | FAL | SAL | "" 
  paper: string;        // P1 | P2 | P3 | ""
  isMemo: boolean;
  year: string;         // "2024" | "Unknown"
  session: string;      // "Nov" | "MayJune" | "March" | "Unknown"
  grade: string;        // "Grade 12" | "Grade 11" | etc
  province: string;     // "National" | "Eastern Cape" | etc
  curriculum: "NSC" | "IEB" | "Unknown";
  language: string;     // "English" | "Afrikaans" | "Both"
  downloadUrl: string;  // constructed public URL
}

const BUCKET = "picshare-vdg8u.firebasestorage.app";
const BASE_URL = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/`;

// Known subjects — used for fuzzy matching
const SUBJECT_MAP: Record<string, string> = {
  mathematics: "Mathematics",
  maths: "Mathematics",
  math: "Mathematics",
  "mathematical literacy": "Mathematics",
  "maths lit": "Mathematics",
  mathlit: "Mathematics",
  "mathematical_literacy": "Mathematics",
  physics: "Physical Sciences",
  "physical sciences": "Physical Sciences",
  "physical_sciences": "Physical Sciences",
  physicalsciences: "Physical Sciences",
  chemistry: "Physical Sciences",
  "life sciences": "Physical Sciences",
  "life_sciences": "Physical Sciences",
  lifesciences: "Physical Sciences",
  biology: "Physical Sciences",
};

const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];

function slugToWords(s: string): string {
  return s.replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
}

function detectProvince(name: string): string {
  const lower = name.toLowerCase();
  for (const p of PROVINCES) {
    if (lower.includes(p.toLowerCase().replace(/\s/g, "_")) ||
        lower.includes(p.toLowerCase())) {
      return p;
    }
  }
  if (lower.includes("national") || lower.includes("nsc")) return "National";
  return "National";
}

function detectLanguage(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("afrikaans") && !lower.includes("english")) return "Afrikaans";
  if (lower.includes("english") && !lower.includes("afrikaans")) return "English";
  return "English"; // default
}

function detectLevel(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes("_HL") || upper.includes(" HL") || upper.includes("HOME_LANGUAGE")) return "HL";
  if (upper.includes("_FAL") || upper.includes(" FAL") || upper.includes("FIRST_ADDITIONAL")) return "FAL";
  if (upper.includes("_SAL") || upper.includes(" SAL") || upper.includes("SECOND_ADDITIONAL")) return "SAL";
  return "";
}

function detectPaper(name: string): string {
  const upper = name.toUpperCase();
  const match = upper.match(/_P(\d)/) || upper.match(/\bP(\d)\b/) || upper.match(/PAPER[_\s]?(\d)/);
  if (match) return `P${match[1]}`;
  return "";
}

function detectSession(pathOrName: string): string {
  const lower = pathOrName.toLowerCase();
  if (lower.includes("mayjune") || lower.includes("may_june") || lower.includes("may-june")) return "May/June";
  if (lower.includes("novdec") || lower.includes("nov_dec") || lower.includes("november") || lower.includes("_nov")) return "November";
  if (lower.includes("march") || lower.includes("_march")) return "March";
  if (lower.includes("august") || lower.includes("_aug")) return "August";
  if (lower.includes("sept") || lower.includes("september")) return "September";
  if (lower.includes("term1")) return "Term 1";
  if (lower.includes("term2")) return "Term 2";
  if (lower.includes("term3")) return "Term 3";
  if (lower.includes("term4")) return "Term 4";
  return "Unknown";
}

function detectYear(path: string): string {
  const yearMatch = path.match(/\b(20\d{2})\b/);
  return yearMatch ? yearMatch[1] : "Unknown";
}

function detectGrade(path: string): string {
  const lower = path.toLowerCase();
  const gradeMatch = lower.match(/grade[_\s]?(\d+)/);
  if (gradeMatch) return `Grade ${gradeMatch[1]}`;
  // Infer from path segment
  if (lower.includes("/grade10/")) return "Grade 10";
  if (lower.includes("/grade11/")) return "Grade 11";
  if (lower.includes("/grade12/")) return "Grade 12";
  return "Grade 12"; // most papers are grade 12
}

function detectSubject(fileName: string, folderSubject?: string): string {
  // If we have a folder-level subject (from structured path), use it
  if (folderSubject) {
    const mapped = SUBJECT_MAP[folderSubject.toLowerCase()];
    if (mapped) return mapped;
    return slugToWords(folderSubject);
  }

  // Parse from filename
  const name = slugToWords(fileName.replace(/\.(pdf|PDF)$/, "")).toLowerCase();
  
  // Remove common suffixes to isolate subject
  const cleaned = name
    .replace(/\b(memo|memorandum|p1|p2|p3|paper|hl|fal|sal|grade\s*\d+)\b/gi, "")
    .replace(/\((.*?)\)/g, "") // remove province brackets
    .replace(/\d{4}/g, "") // remove years
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Try direct match
  const directMatch = SUBJECT_MAP[cleaned];
  if (directMatch) return directMatch;

  // Try partial match
  for (const [key, value] of Object.entries(SUBJECT_MAP)) {
    if (cleaned.includes(key)) return value;
  }

  // Fallback: capitalise what we have
  return cleaned.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Other";
}

function makeDownloadUrl(storagePath: string): string {
  const encoded = encodeURIComponent(storagePath);
  return `${BASE_URL}${encoded}?alt=media`;
}

function stableId(path: string): string {
  // Simple deterministic hash from path
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    hash = ((hash << 5) - hash) + path.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Parse a single storage path into PaperMetadata
 * Handles:
 *   past-papers/past-papers/NSC/2024/MayJune/Grade12/Mathematics/Mathematics_P1.pdf
 *   past-papers/Mathematics_P1.pdf
 *   past-papers/Afrikaans_SAL_P2_(Eastern_Cape).pdf
 */
export function parsePaperPath(storagePath: string): PaperMetadata {
  const parts = storagePath.split("/");
  const fileName = parts[parts.length - 1];
  const isMemo = /memo|memorandum/i.test(fileName);

  // Detect curriculum
  const curriculum: "NSC" | "IEB" | "Unknown" =
    storagePath.toLowerCase().includes("/nsc/") || storagePath.toLowerCase().includes("past-papers/nsc")
      ? "NSC"
      : storagePath.toLowerCase().includes("/ieb/")
      ? "IEB"
      : "NSC"; // default to NSC

  // Structured path: past-papers/past-papers/NSC/YEAR/SESSION/GRADE/SUBJECT/file.pdf
  let folderSubject: string | undefined;
  const nscIdx = parts.findIndex(p => p.toLowerCase() === "nsc");
  if (nscIdx !== -1 && parts.length > nscIdx + 4) {
    folderSubject = parts[nscIdx + 4]; // e.g. "Mathematics"
  }

  return {
    id: stableId(storagePath),
    storagePath,
    fileName,
    subject: detectSubject(fileName, folderSubject),
    level: detectLevel(fileName),
    paper: detectPaper(fileName),
    isMemo,
    year: detectYear(storagePath),
    session: detectSession(storagePath),
    grade: detectGrade(storagePath),
    province: detectProvince(fileName),
    curriculum,
    language: detectLanguage(fileName),
    downloadUrl: makeDownloadUrl(storagePath),
  };
}

/**
 * Group papers with their memos
 */
export interface PaperGroup {
  paper: PaperMetadata;
  memo: PaperMetadata | null;
}

export function groupPapersWithMemos(papers: PaperMetadata[]): PaperGroup[] {
  const questions = papers.filter(p => !p.isMemo);
  const memos = papers.filter(p => p.isMemo);

  return questions.map(paper => {
    // Find matching memo — same subject, paper number, year, session
    const memo = memos.find(m =>
      m.subject === paper.subject &&
      m.paper === paper.paper &&
      m.year === paper.year &&
      m.session === paper.session &&
      m.grade === paper.grade &&
      m.province === paper.province
    ) ?? null;

    return { paper, memo };
  });
}
