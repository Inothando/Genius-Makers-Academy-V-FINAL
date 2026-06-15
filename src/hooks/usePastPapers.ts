// src/hooks/usePastPapers.ts
// Queries the Firestore 'papers' collection (built by indexPapers.mjs)
// Fast filtering by subject, grade, year, session, province, curriculum

import { useState, useEffect, useCallback } from "react";
import {
  collection, query, where, orderBy, limit,
  getDocs, QueryConstraint, getFirestore,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export interface Paper {
  id: string;
  storagePath: string;
  fileName: string;
  subject: string;
  level: string;
  paper: string;
  isMemo: boolean;
  year: string;
  session: string;
  grade: string;
  province: string;
  curriculum: "NSC" | "IEB" | "Unknown";
  language: string;
  downloadUrl: string;
}

export interface PaperGroup {
  id: string;
  subject: string;
  grade: string;
  year: string;
  session: string;
  province: string;
  paper: string;
  level: string;
  language: string;
  curriculum: "NSC" | "IEB" | "Unknown";
  questionPaper: Paper | null;
  memo: Paper | null;
}

export interface PapersFilter {
  subject?: string;
  grade?: string;
  year?: string;
  session?: string;
  province?: string;
  curriculum?: "NSC" | "IEB" | "All" | "Unknown";
  language?: string;
  searchQuery?: string;
}

export interface MetaIndex {
  subjects: string[];
  years: string[];
  totalPapers: number;
}

// ── Firestore DB ID ──────────────────────────────────────────────────────────
// Uses the named database from your config
const PAPERS_COLLECTION = "papers";
const META_COLLECTION = "meta";

export function usePastPapers(filters: PapersFilter = {}, pageSize = 40) {
  const [papers, setPapers] = useState<PaperGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<MetaIndex | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // ── Fetch meta (subjects, years lists) ──────────────────────────────────
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const { getDoc, doc } = await import("firebase/firestore");
        const metaDoc = await getDoc(doc(db, META_COLLECTION, "papersIndex"));
        if (metaDoc.exists()) {
          setMeta(metaDoc.data() as MetaIndex);
        }
      } catch (err: any) {
        if (err?.message?.includes("offline") || err?.code === 'unavailable') {
          console.warn("Client is offline. Showing cached meta if available.");
        } else {
          console.error("Meta fetch error:", err);
        }
      }
    };
    fetchMeta();
  }, []);

  // ── Fetch local past-papers.json fallback ──────────────────────────────
  const fetchLocalFallback = useCallback(async () => {
    try {
      console.log("[usePastPapers Fallback] Querying static 100% JSON past-papers package in-memory...");
      const response = await fetch('/past-papers.json');
      if (!response.ok) throw new Error("Local JSON fetch failed");
      const allPapers = await response.json() as any[];

      // 1. Filter the papers in memory based on the React filters
      let questionOnly = allPapers.filter(p => p.type === "question");

      if (filters.subject && filters.subject !== "All") {
        questionOnly = questionOnly.filter(p => p.subject === filters.subject);
      }
      if (filters.grade && filters.grade !== "All") {
        const gNum = parseInt(filters.grade.replace(/\D/g, '')) || 12;
        questionOnly = questionOnly.filter(p => {
          const itemGrade = typeof p.grade === 'string' ? parseInt(p.grade.replace(/\D/g, '')) : parseInt(p.grade);
          return itemGrade === gNum;
        });
      }
      if (filters.year && filters.year !== "All") {
        questionOnly = questionOnly.filter(p => String(p.year) === filters.year);
      }
      if (filters.session && filters.session !== "All") {
        questionOnly = questionOnly.filter(p => {
          const sValue = p.session || "Various";
          return sValue.toLowerCase().replace(/[-_ ]/g, '').includes(filters.session!.toLowerCase().replace(/[-_ ]/g, ''));
        });
      }
      if (filters.province && filters.province !== "All") {
        questionOnly = questionOnly.filter(p => p.province === filters.province);
      }
      if (filters.curriculum && filters.curriculum !== "All") {
        questionOnly = questionOnly.filter(p => p.curriculum === filters.curriculum);
      }
      if (filters.language && filters.language !== "All") {
        questionOnly = questionOnly.filter(p => p.language === filters.language);
      }
      if (filters.searchQuery) {
        const sq = filters.searchQuery.toLowerCase();
        questionOnly = questionOnly.filter(p => 
          (p.subject || "").toLowerCase().includes(sq) || 
          (p.title || "").toLowerCase().includes(sq)
        );
      }

      // Sort newest first based on year desc
      questionOnly.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));

      // Limit to pageSize
      const paginated = questionOnly.slice(0, pageSize);

      // 2. Pair questions with memos in-memory
      const groups: PaperGroup[] = paginated.map(qp => {
        const memo = allPapers.find(p => 
          p.type === "memo" &&
          p.subject === qp.subject &&
          p.year === qp.year &&
          p.grade === qp.grade &&
          p.paperNumber === qp.paperNumber
        );

        const qpPaper: Paper = {
          id: qp.id,
          storagePath: qp.storagePath || "",
          fileName: qp.title,
          subject: qp.subject,
          level: "",
          paper: qp.paperNumber,
          isMemo: false,
          year: String(qp.year),
          session: qp.session || "Various",
          grade: "Grade " + qp.grade,
          province: qp.province || "National",
          curriculum: qp.curriculum || "NSC",
          language: qp.language || "English",
          downloadUrl: qp.fileUrl,
        };

        const memoPaper: Paper | null = memo ? {
          id: memo.id,
          storagePath: memo.storagePath || "",
          fileName: memo.title,
          subject: memo.subject,
          level: "",
          paper: memo.paperNumber,
          isMemo: true,
          year: String(memo.year),
          session: memo.session || "Various",
          grade: "Grade " + memo.grade,
          province: memo.province || "National",
          curriculum: memo.curriculum || "NSC",
          language: memo.language || "English",
          downloadUrl: memo.fileUrl,
        } : null;

        return {
          id: qp.id,
          subject: qp.subject,
          grade: "Grade " + qp.grade,
          year: String(qp.year),
          session: qp.session || "Various",
          province: qp.province || "National",
          paper: qp.paperNumber,
          level: "",
          language: qp.language || "English",
          curriculum: qp.curriculum || "NSC",
          questionPaper: qpPaper,
          memo: memoPaper,
        };
      });

      // Unique filter to bypass any key collision warnings of non-unique IDs
      const uniqueSeen = new Set<string>();
      const uniqueGroups = groups.filter(g => {
        if (!g.id || uniqueSeen.has(g.id)) return false;
        uniqueSeen.add(g.id);
        return true;
      });

      setPapers(uniqueGroups);
      setTotalCount(uniqueGroups.length);
    } catch (err) {
      console.error("Local client fallback papers fetch failed:", err);
      setError("Failed to load papers. Please check your internet connection.");
    }
  }, [
    filters.subject, filters.grade, filters.year, filters.session,
    filters.province, filters.curriculum, filters.language,
    filters.searchQuery, pageSize
  ]);

  // ── Fetch papers based on filters ───────────────────────────────────────
  const fetchPapers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const constraints: QueryConstraint[] = [
        where("isMemo", "==", false), // Only fetch question papers; we'll join memos
      ];

      if (filters.subject) {
        constraints.push(where("subject", "==", filters.subject));
      }
      if (filters.grade) {
        constraints.push(where("grade", "==", filters.grade));
      }
      if (filters.year) {
        constraints.push(where("year", "==", filters.year));
      }
      if (filters.session) {
        constraints.push(where("session", "==", filters.session));
      }
      if (filters.province) {
        constraints.push(where("province", "==", filters.province));
      }
      if (filters.curriculum) {
        constraints.push(where("curriculum", "==", filters.curriculum));
      }
      if (filters.language) {
        constraints.push(where("language", "==", filters.language));
      }

      constraints.push(orderBy("year", "desc"));
      constraints.push(limit(pageSize));

      const q = query(collection(db, PAPERS_COLLECTION), ...constraints);
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log("[usePastPapers] Firestore query returned 0 results. Activating high-performance static JSON fallback engine");
        await fetchLocalFallback();
        setLoading(false);
        return;
      }

      const questionPapers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Paper));

      // Client-side search filter (for subject/name text search)
      const filtered = filters.searchQuery
        ? questionPapers.filter(p =>
            p.subject.toLowerCase().includes(filters.searchQuery!.toLowerCase()) ||
            p.fileName.toLowerCase().includes(filters.searchQuery!.toLowerCase())
          )
        : questionPapers;

      setTotalCount(filtered.length);

      // Fetch matching memos for these papers
      const groups = await Promise.all(
        filtered.map(async (qp): Promise<PaperGroup> => {
          // Build memo query
          const memoConstraints: QueryConstraint[] = [
            where("isMemo", "==", true),
            where("subject", "==", qp.subject),
            where("year", "==", qp.year),
            where("grade", "==", qp.grade),
            where("paper", "==", qp.paper),
          ];

          try {
            const memoQ = query(collection(db, PAPERS_COLLECTION), ...memoConstraints, limit(1));
            const memoSnap = await getDocs(memoQ);
            const memo = memoSnap.empty ? null : ({ id: memoSnap.docs[0].id, ...memoSnap.docs[0].data() } as Paper);

            return {
              id: qp.id,
              subject: qp.subject,
              grade: qp.grade,
              year: qp.year,
              session: qp.session,
              province: qp.province,
              paper: qp.paper,
              level: qp.level,
              language: qp.language,
              curriculum: qp.curriculum,
              questionPaper: qp,
              memo,
            };
          } catch {
            return {
              id: qp.id,
              subject: qp.subject,
              grade: qp.grade,
              year: qp.year,
              session: qp.session,
              province: qp.province,
              paper: qp.paper,
              level: qp.level,
              language: qp.language,
              curriculum: qp.curriculum,
              questionPaper: qp,
              memo: null,
            };
          }
        })
      );

      // Unique filter to bypass any key collision warnings of non-unique IDs
      const uniqueSeen = new Set<string>();
      const uniqueGroups = groups.filter(g => {
        if (!g.id || uniqueSeen.has(g.id)) return false;
        uniqueSeen.add(g.id);
        return true;
      });

      setPapers(uniqueGroups);
    } catch (err: any) {
      if (err?.message?.includes('offline') || err?.code === 'unavailable' || err?.message?.includes('Permission') || err?.message?.includes('reach Cloud Firestore')) {
        console.warn("Client offline or query blocked. Instant JSON package fallback initiated.", err);
        await fetchLocalFallback();
      } else {
        console.error("Firestore loading crashed. Fallback trigger active.", err);
        await fetchLocalFallback();
      }
    } finally {
      setLoading(false);
    }
  }, [
    filters.subject, filters.grade, filters.year, filters.session,
    filters.province, filters.curriculum, filters.language,
    filters.searchQuery, pageSize, fetchLocalFallback
  ]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  return { papers, loading, error, meta, totalCount, refetch: fetchPapers };
}
