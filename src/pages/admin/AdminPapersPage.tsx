import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  Loader2, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  AlertCircle,
  Plus,
  Layout,
  ExternalLink,
  ChevronDown,
  Database,
  Terminal,
  Check,
  Zap
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  doc, 
  writeBatch, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, listAll } from 'firebase/storage';
import { db, storage, defaultStorage } from '../../lib/firebase';
import { Button } from '../../components/ui/Button';
import { PastPaper } from '../../types';
import { cn } from '../../lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  title: string;
  subject: string;
  grade: number;
  year: number;
  curriculum: 'NSC' | 'IEB';
  paperNumber: 'P1' | 'P2' | 'P3' | 'P4';
  type: 'question' | 'memo';
  language: 'English' | 'Afrikaans';
  topics: string;
  session: string;
  province: string;
}

const parseStorageFile = (fullPath: string, fileName: string) => {
  const parts = fullPath.split('/');
  
  // Default values
  let curriculum: 'NSC' | 'IEB' = 'NSC';
  let subject = 'MATHEMATICS';
  let grade = 12;
  let year = 2024;
  let paperNumber: 'P1' | 'P2' | 'P3' | 'P4' = 'P1';
  let type: 'question' | 'memo' = 'question';
  let language: 'English' | 'Afrikaans' = 'English';
  
  // 1. Detect curriculum from path or file name
  const upperPath = fullPath.toUpperCase();
  if (upperPath.includes('/IEB/') || upperPath.includes('IEB')) {
    curriculum = 'IEB';
  } else {
    curriculum = 'NSC';
  }
  
  // 2. Detect subject
  const subjectsGlossary = [
    { name: 'MATHEMATICS', aliases: ['MATH', 'MATHEMATICS', 'Wiskunde', 'WISK'] },
    { name: 'PHYSICAL SCIENCES', aliases: ['PHYSICAL', 'PHYSICS', 'PHSC', 'Fisiese Wetenskappe', 'FISI', 'PHYS', 'SCIENCE'] },
    { name: 'LIFE SCIENCES', aliases: ['LIFE', 'LFSC', 'BIOLOGY', 'Lewenswetenskappe', 'LEWE'] },
    { name: 'HISTORY', aliases: ['HISTORY', 'Geskiedenis', 'GESK'] },
    { name: 'GEOGRAPHY', aliases: ['GEOGRAPHY', 'GEOG', 'Geografie', 'GEOR'] },
    { name: 'ACCOUNTING', aliases: ['ACCOUNTING', 'ACCN', 'Rekeningkunde', 'REKE'] },
    { name: 'BUSINESS STUDIES', aliases: ['BUSINESS', 'BSTD', 'Besigheidstudies', 'BESI'] },
    { name: 'ENGLISH', aliases: ['ENGLISH', 'ENG', 'FAL', 'HL'] }
  ];
  
  let foundSubject = false;
  for (const gloss of subjectsGlossary) {
    if (gloss.aliases.some(alias => upperPath.includes(alias.toUpperCase()))) {
      subject = gloss.name;
      foundSubject = true;
      break;
    }
  }
  
  // If not found in the path, try to parse from the part segments
  if (!foundSubject && parts.length >= 3) {
    // Usually parts[2] is subject
    subject = parts[2].toUpperCase().replace(/[-_]/g, ' ');
  }
  
  // 3. Detect grade
  const gradeMatch = upperPath.match(/(GRADE|GR|G)\s*(\d+)/i) || fullPath.match(/\/(\d+)\//);
  if (gradeMatch) {
    const num = parseInt(gradeMatch[2] || gradeMatch[1]);
    if (num >= 8 && num <= 12) {
      grade = num;
    }
  } else if (parts.length >= 4) {
    // E.g. parts[3] might be "Grade 12"
    const num = parseInt(parts[3].replace(/\D/g, ''));
    if (num >= 8 && num <= 12) {
      grade = num;
    }
  }
  
  // 4. Detect year
  const yearMatch = upperPath.match(/(20\d{2})/);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
  } else if (parts.length >= 5) {
    const num = parseInt(parts[4].replace(/\D/g, ''));
    if (num >= 2000 && num <= 2027) {
      year = num;
    }
  }
  
  // 5. Detect paper number
  if (upperPath.includes('P1') || upperPath.includes('PAPER 1') || upperPath.includes('PAPER1')) {
    paperNumber = 'P1';
  } else if (upperPath.includes('P2') || upperPath.includes('PAPER 2') || upperPath.includes('PAPER2')) {
    paperNumber = 'P2';
  } else if (upperPath.includes('P3') || upperPath.includes('PAPER 3') || upperPath.includes('PAPER3')) {
    paperNumber = 'P3';
  } else if (upperPath.includes('P4') || upperPath.includes('PAPER 4') || upperPath.includes('PAPER4')) {
    paperNumber = 'P4';
  }
  
  // 6. Detect type
  if (upperPath.includes('MEMO') || upperPath.includes('MEMORANDUM') || upperPath.includes('_M') || upperPath.includes('-M') || upperPath.includes(' ANS') || upperPath.includes('ANSWER')) {
    type = 'memo';
  } else {
    type = 'question';
  }
  
  // 7. Detect language
  if (upperPath.includes('AFR') || upperPath.includes('WISK') || upperPath.includes('AFRIKAANS')) {
    language = 'Afrikaans';
  } else {
    language = 'English';
  }
  
  // Generate beautiful title
  let suffix = '';
  if (type === 'memo') suffix = ' Memo';
  const cleanSubject = subject.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const title = `${cleanSubject} Grade ${grade} ${paperNumber}${suffix} (${year})`;
  
  // Session detection
  let session = 'Various';
  const upperCombinedForSession = (fullPath + '/' + fileName).toUpperCase();
  if (
    upperCombinedForSession.includes('MAYJUNE') || 
    upperCombinedForSession.includes('MAY_JUNE') || 
    upperCombinedForSession.includes('TERM2') || 
    upperCombinedForSession.includes('TERM 2') || 
    upperCombinedForSession.includes('MAY JUNE') || 
    upperCombinedForSession.includes('JUNE') || 
    upperCombinedForSession.includes(' JUN ') || 
    upperCombinedForSession.includes('_JUN_')
  ) {
    session = 'Term2_MayJune';
  } else if (
    upperCombinedForSession.includes('TRIAL') || 
    upperCombinedForSession.includes('PREP') || 
    upperCombinedForSession.includes('TERM3') || 
    upperCombinedForSession.includes('TERM 3') || 
    upperCombinedForSession.includes('PRELIMINARY') || 
    upperCombinedForSession.includes('PRELIM') || 
    upperCombinedForSession.includes('SEP') || 
    upperCombinedForSession.includes('SEPTEMBER')
  ) {
    session = 'Term3_Trial';
  } else if (
    upperCombinedForSession.includes('NOVEMBER') || 
    upperCombinedForSession.includes('NOV_') || 
    upperCombinedForSession.includes('NOV ') || 
    upperCombinedForSession.includes('_NOV_') || 
    upperCombinedForSession.includes('TERM4') || 
    upperCombinedForSession.includes('TERM 4')
  ) {
    session = 'Term4_November';
  }

  // Province detection
  let province = 'National';
  const upperCombined = (fullPath + '/' + fileName).toUpperCase();
  if (upperCombined.includes('EASTERN CAPE') || upperCombined.includes('EASTERNCAPE') || upperCombined.includes('EASTERN_CAPE') || upperCombined.includes(' EC ') || upperCombined.includes('_EC_') || upperCombined.includes('-EC-')) {
    province = 'Eastern Cape';
  } else if (upperCombined.includes('FREE STATE') || upperCombined.includes('FREESTATE') || upperCombined.includes('FREE_STATE') || upperCombined.includes(' FS ') || upperCombined.includes('_FS_') || upperCombined.includes('-FS-') || upperCombined.includes('VRYSTAAT')) {
    province = 'Free State';
  } else if (upperCombined.includes('GAUTENG') || upperCombined.includes(' GP ') || upperCombined.includes('_GP_') || upperCombined.includes('-GP-')) {
    province = 'Gauteng';
  } else if (upperCombined.includes('KWAZULU') || upperCombined.includes('KZN') || upperCombined.includes('KWA_ZULU') || upperCombined.includes('KWAZULU-NATAL')) {
    province = 'KwaZulu-Natal';
  } else if (upperCombined.includes('LIMPOPO') || upperCombined.includes(' LP ') || upperCombined.includes('_LP_') || upperCombined.includes('-LP-')) {
    province = 'Limpopo';
  } else if (upperCombined.includes('MPUMALANGA') || upperCombined.includes(' MP ') || upperCombined.includes('_MP_') || upperCombined.includes('-MP-')) {
    province = 'Mpumalanga';
  } else if (upperCombined.includes('NORTHERN CAPE') || upperCombined.includes('NORTHERNCAPE') || upperCombined.includes('NORTHERN_CAPE') || upperCombined.includes(' NC ') || upperCombined.includes('_NC_') || upperCombined.includes('-NC-')) {
    province = 'Northern Cape';
  } else if (upperCombined.includes('NORTH WEST') || upperCombined.includes('NORTHWEST') || upperCombined.includes('NORTH_WEST') || upperCombined.includes(' NW ') || upperCombined.includes('_NW_') || upperCombined.includes('-NW-')) {
    province = 'North West';
  } else if (upperCombined.includes('WESTERN CAPE') || upperCombined.includes('WESTERNCAPE') || upperCombined.includes('WESTERN_CAPE') || upperCombined.includes(' WC ') || upperCombined.includes('_WC_') || upperCombined.includes('-WC-')) {
    province = 'Western Cape';
  }

  return {
    title,
    subject,
    grade,
    year,
    curriculum,
    paperNumber,
    type,
    language,
    topics: [],
    session,
    province
  };
};

export function AdminPapersPage() {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [papers, setPapers] = useState<PastPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPapers, setSelectedPapers] = useState<string[]>([]);
  
  // Storage Synchronization Utility states
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncType, setSyncType] = useState<'sync' | 'repair' | 'bootstrap'>('sync');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [syncStep, setSyncStep] = useState<string>('');
  const [syncCount, setSyncCount] = useState({ scanned: 0, checked: 0, added: 0, totalToSync: 0 });
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const logContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [syncLogs]);

  const handleSyncStorage = async () => {
    setSyncType('sync');
    setSyncStatus('running');
    setSyncLogs([]);
    setSyncCount({ scanned: 0, checked: 0, added: 0, totalToSync: 0 });
    
    const addLog = (msg: string) => {
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      addLog("🚀 Starting live storage scan and comparison utility...");
      setSyncStep("Scanning Database...");
      addLog("Querying Firestore database for existing indices...");
      
      const firestoreSnap = await getDocs(collection(db, 'past-papers'));
      const dbUrlSet = new Set<string>();
      const dbPathSet = new Set<string>();
      
      firestoreSnap.docs.forEach(doc => {
        const d = doc.data();
        if (d.fileUrl) dbUrlSet.add(d.fileUrl);
        if (d.storagePath) dbPathSet.add(d.storagePath);
      });
      
      addLog(`Database query complete. Found ${firestoreSnap.size} indexed records in Firestore.`);
      setSyncCount(prev => ({ ...prev, checked: firestoreSnap.size }));
      
      setSyncStep("Scanning Storage Bucket...");
      addLog("Recursively scanning Firebase Storage folder variants...");
      
      const discoveredFiles: any[] = [];
      const crawledPaths = new Set<string>();
      
      const crawl = async (dirRef: any) => {
        const pathStr = dirRef.fullPath || dirRef.path || '';
        if (crawledPaths.has(pathStr)) return;
        crawledPaths.add(pathStr);
        
        try {
          const result = await listAll(dirRef);
          for (const item of result.items) {
            discoveredFiles.push(item);
            setSyncCount(prev => ({ ...prev, scanned: discoveredFiles.length }));
            if (discoveredFiles.length % 50 === 0) {
              addLog(`Discovered ${discoveredFiles.length} file assets in Storage...`);
            }
          }
          if (result.prefixes.length > 0) {
            await Promise.all(result.prefixes.map(prefix => crawl(prefix)));
          }
        } catch (crawlErr: any) {
          addLog(`⚠️ Storage list warning on layout path '${pathStr}': ${crawlErr.message}`);
        }
      };

      const crawlWithStorage = async (baseStorage: any, storageName: string) => {
        // Try automatic folder discovery by listing root prefixes
        let rootFolders: any[] = [];
        try {
          const rootRef = ref(baseStorage, '/');
          const rootResult = await listAll(rootRef);
          rootFolders = rootResult.prefixes;
        } catch (rootErr: any) {
          addLog(`Note: Storage bucket root non-traversable directly on ${storageName}. Falling back to explicit casing lists.`);
        }

        const activeScannedFolders = new Set<string>();

        const foldersToSync = rootFolders.filter(folder => {
          const folderName = folder.name.toLowerCase();
          return folderName === 'past-papers' || folderName === 'past-paper' || folderName.includes('past-papers') || folderName.includes('past-paper');
        });

        if (foldersToSync.length > 0) {
          addLog(`Located ${foldersToSync.length} system directories matching past-papers on bucket root (${storageName}):`);
          for (const f of foldersToSync) {
            addLog(` - Crawling folder: '${f.name}'`);
            activeScannedFolders.add(f.name);
            await crawl(f);
          }
        }

        // Hard fallback explicit directories to perfectly secure 'Past-papers', 'past-papers', etc.
        const explicitFallbacks = ['Past-papers', 'past-papers', 'Past-Papers', 'past-paper', 'Past-paper', 'past-papers/past-papers'];
        for (const fallName of explicitFallbacks) {
          if (!activeScannedFolders.has(fallName)) {
            addLog(`Crawling explicit fallback folder path: '${fallName}' (${storageName})...`);
            try {
              const explicitRef = ref(baseStorage, fallName);
              await crawl(explicitRef);
              activeScannedFolders.add(fallName);
            } catch (err) {
              // Ignored if folder is non-existent
            }
          }
        }
      };

      await crawlWithStorage(storage, "configured bucket");
      await crawlWithStorage(defaultStorage, "default bucket");
      
      addLog(`Scan finished. Discovered ${discoveredFiles.length} physical file assets in Firebase Storage.`);
      
      setSyncStep("Comparing indexes...");
      addLog("Reconciling directories & files against existing Firestore index items...");
      
      const missingFiles = discoveredFiles.filter(item => {
        return !dbPathSet.has(item.fullPath);
      });
      
      addLog(`Comparison complete. ${discoveredFiles.length - missingFiles.length} are already indexed. ${missingFiles.length} missing files require indexing.`);
      
      if (missingFiles.length === 0) {
        addLog("✅ Database and Storage are completely in sync! No files to import.");
        setSyncStatus('completed');
        setSyncStep("Complete");
        fetchPapers();
        return;
      }
      
      setSyncStep(`Indexing ${missingFiles.length} missing papers...`);
      setSyncCount(prev => ({ ...prev, totalToSync: missingFiles.length }));
      
      const BATCH_SIZE = 24;
      let addedCount = 0;
      
      for (let i = 0; i < missingFiles.length; i += BATCH_SIZE) {
        const chunk = missingFiles.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        let batchHasDocs = false;

        await Promise.all(chunk.map(async (fileRef: any) => {
          try {
            const downloadUrl = await getDownloadURL(fileRef);
            const meta = parseStorageFile(fileRef.fullPath, fileRef.name);
            
            const docObj = {
              title: meta.title,
              subject: meta.subject,
              grade: meta.grade,
              year: meta.year,
              curriculum: meta.curriculum,
              paperNumber: meta.paperNumber,
              type: meta.type,
              language: meta.language,
              fileUrl: downloadUrl,
              storagePath: fileRef.fullPath,
              fileSize: 0,
              downloadCount: 0,
              topics: meta.topics,
              isVerified: true,
              uploadedBy: 'system-sync',
              session: meta.session || 'Various',
              province: meta.province || 'National',
              createdAt: serverTimestamp()
            };
            
            const newDocRef = doc(collection(db, 'past-papers'));
            batch.set(newDocRef, docObj);
            batchHasDocs = true;
            addedCount++;
          } catch (e: any) {
            addLog(`⚠️ Indexing failed for ${fileRef.name}: ${e.message}`);
          }
        }));

        if (batchHasDocs) {
          await batch.commit();
          setSyncCount(prev => ({ ...prev, added: addedCount }));
          addLog(`Successful indexed progress batch (${chunk.length} items synced. Total: ${addedCount}/${missingFiles.length})`);
        }
        
        // Wait a small timeout to allow UI updates to render fluidly
        await new Promise(r => setTimeout(r, 100));
      }
      
      addLog(`✨ Synchronisation complete! Successfully indexed ${addedCount} past papers on your website.`);
      setSyncStatus('completed');
      setSyncStep("Complete");
      fetchPapers();
    } catch (err: any) {
      console.error("Sync Error:", err);
      addLog(`❌ Sychronisation failed with unexpected error: ${err.message}`);
      setSyncStatus('error');
    }
  };

  const handleSeedJSON = async () => {
    setSyncType('bootstrap');
    setSyncStatus('running');
    setSyncLogs([]);
    setSyncCount({ scanned: 0, checked: 0, added: 0, totalToSync: 5696 });
    setSyncStep("Seeding vault...");
    
    const addLog = (msg: string) => {
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      addLog("⚡ Initiating server-side high-throughput 100% past papers database seed...");
      addLog("Reading local past-papers.json package containing 100% of papers (5,000+)...");
      setSyncStep("Reading Package...");
      
      const res = await fetch("/api/admin/bootstrap-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 5696 })
      });

      if (!res.ok) {
        throw new Error("Server-side bootstrap API failed or timed out");
      }

      const result = await res.json();
      
      addLog(`✨ Seed Completed successfully!`);
      addLog(`📋 Server message: ${result.message}`);
      addLog(`📚 Mapped ${result.subjectsCount} Subjects: ${result.totalSeeded} file listings committed cleanly.`);
      addLog(`📅 Covered years range: ${result.yearsCount} distinct iterations.`);
      
      setSyncCount({
        scanned: result.totalMetaIndexed,
        checked: result.totalMetaIndexed,
        added: result.totalSeeded,
        totalToSync: result.totalMetaIndexed
      });

      setSyncStatus('completed');
      setSyncStep("Complete");
      fetchPapers();
    } catch (err: any) {
      console.error(err);
      addLog(`❌ High-throughput Seed failed: ${err.message}`);
      setSyncStatus('error');
    }
  };
  
  const handleSyncLocalCodebase = async () => {
    setSyncType('sync');
    setSyncStatus('running');
    setSyncLogs([]);
    setSyncCount({ scanned: 0, checked: 0, added: 0, totalToSync: 0 });
    
    const addLog = (msg: string) => {
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      addLog("🚀 Scanning local codebase for PDF files in /public/papers...");
      setSyncStep("Scanning Local Files...");
      
      const res = await fetch("/api/admin/scan-local");
      if (!res.ok) throw new Error("Local scan API failed");
      const { files } = await res.json();
      
      addLog(`Discovered ${files.length} local files in /public/papers/`);
      setSyncCount(prev => ({ ...prev, scanned: files.length }));
      
      addLog("Querying Firestore database to check existing items...");
      const firestoreSnap = await getDocs(collection(db, 'past-papers'));
      const dbUrlSet = new Set<string>();
      
      firestoreSnap.docs.forEach(doc => {
        const d = doc.data();
        if (d.fileUrl) dbUrlSet.add(d.fileUrl);
      });
      
      const missingFiles = files.filter((localPath: string) => !dbUrlSet.has(localPath));
      setSyncCount(prev => ({ ...prev, checked: firestoreSnap.size, totalToSync: missingFiles.length }));
      
      if (missingFiles.length === 0) {
        addLog("✅ No new local files to index.");
        setSyncStatus('completed');
        setSyncStep("Complete");
        fetchPapers();
        return;
      }
      
      setSyncStep(`Extracting AI metadata for ${missingFiles.length} missing papers...`);
      
      const BATCH_SIZE = 10;
      let addedCount = 0;
      
      for (let i = 0; i < missingFiles.length; i += BATCH_SIZE) {
        const chunk = missingFiles.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        
        const itemsChunk = chunk.map((path: string) => ({
          path: path,
          url: window.location.origin + path
        }));
        
        let parsedChunk: any[] = [];
        try {
          addLog(`Requesting AI metadata extraction for batch of ${itemsChunk.length} files...`);
          const aiRes = await fetch('/api/ai/parse-metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: itemsChunk })
          });
          if (aiRes.ok) {
            parsedChunk = await aiRes.json();
          } else {
            addLog(`AI parsing failed for chunk, falling back to local heuristic parsing...`);
          }
        } catch (e: any) {
             console.error("AI parse fail", e);
             addLog(`AI parsing failed for chunk, falling back to local heuristic parsing...`);
        }
        
        chunk.forEach((localPath: string, index: number) => {
          let meta: any = null;
          if (parsedChunk[index] && parsedChunk[index].subject) {
            meta = parsedChunk[index];
          } else {
            // fallback generic
             meta = {
                 title: localPath.split('/').pop(),
                 subject: "Unclassified",
                 grade: 12,
                 year: new Date().getFullYear(),
                 curriculum: 'CAPS',
                 paperNumber: 1,
                 type: 'question',
                 language: 'English',
                 session: 'Various',
                 province: 'National',
                 topics: []
             };
          }
          
          batch.set(doc(collection(db, 'past-papers')), {
              ...meta,
              fileUrl: localPath,
              storagePath: localPath,
              fileSize: 0,
              downloadCount: 0,
              isVerified: true,
              uploadedBy: 'system-sync-local',
              createdAt: serverTimestamp()
          });
          addedCount++;
        });

        await batch.commit();
        setSyncCount(prev => ({ ...prev, added: addedCount }));
        addLog(`Successful indexed progress batch (${chunk.length} items synced. Total: ${addedCount}/${missingFiles.length})`);
      }
      
      addLog(`✨ Synchronisation complete! Successfully indexed ${addedCount} local codebase papers.`);
      setSyncStatus('completed');
      setSyncStep("Complete");
      fetchPapers();
    } catch (err: any) {
      console.error("Sync Error:", err);
      addLog(`❌ Codebase Sychronisation failed with unexpected error: ${err.message}`);
      setSyncStatus('error');
    }
  };
  
  const subjects = ['MATHEMATICS', 'PHYSICAL SCIENCES', 'LIFE SCIENCES', 'HISTORY', 'GEOGRAPHY', 'ACCOUNTING'];
  const years = Array.from({ length: 12 }, (_, i) => 2025 - i);

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      let fetched: PastPaper[] = [];
      try {
        const cachedResponse = await fetch('/past-papers.json');
        if (cachedResponse.ok) {
          const results = await cachedResponse.json();
          if (Array.isArray(results) && results.length > 0) {
            fetched = results;
          }
        }
      } catch (err) {
        console.warn("Local static package fetch failed, checking offline bundled papers:", err);
      }

      if (fetched.length === 0) {
        const colRef = collection(db, 'past-papers');
        const snap = await getDocs(colRef);
        fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as PastPaper));
      }

      // Sort in-memory (newest first based on createdAt seconds or year)
      fetched.sort((a, b) => {
        if (b.year !== a.year) {
          return b.year - a.year; // newest year first
        }
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        if (timeA || timeB) {
          return timeB - timeA;
        }
        return a.title?.localeCompare(b.title || '') || 0;
      });
      setPapers(fetched);
    } catch (err) {
      console.error("fetchPapers error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).map(file => {
      const meta = parseStorageFile(file.name, file.name);

      return {
        id: uuidv4(),
        file,
        progress: 0,
        status: 'pending' as const,
        title: meta.title || file.name.replace('.pdf', ''),
        subject: meta.subject || 'Mathematics',
        grade: meta.grade || 12,
        year: meta.year || 2024,
        curriculum: meta.curriculum || 'NSC',
        paperNumber: meta.paperNumber || 'P1',
        type: meta.type || 'question',
        language: meta.language || 'English',
        topics: '',
        session: meta.session || 'Various',
        province: meta.province || 'National'
      };
    });
    setUploadingFiles(prev => [...prev, ...newFiles]);
  };

  const handleUploadAll = async () => {
    const batch = writeBatch(db);
    const promises = uploadingFiles.map(async (uFile) => {
      if (uFile.status === 'success') return;

      setUploadingFiles(prev => prev.map(f => f.id === uFile.id ? { ...f, status: 'uploading' } : f));

      try {
        const cleanSubject = uFile.subject.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
        const storagePath = `past-papers/${uFile.curriculum}/${uFile.year}/${uFile.session.replace('Term4_', '').replace('Term3_', '').replace('Term2_', '')}/Grade${uFile.grade}/${cleanSubject}/${uFile.file.name.replace(/ /g, '_')}`;
        const fileRef = ref(storage, storagePath);
        
        const uploadTask = uploadBytesResumable(fileRef, uFile.file);

        return new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadingFiles(prev => prev.map(f => f.id === uFile.id ? { ...f, progress } : f));
            },
            (error) => {
              setUploadingFiles(prev => prev.map(f => f.id === uFile.id ? { ...f, status: 'error' } : f));
              reject(error);
            },
            async () => {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              const paperData = {
                title: uFile.title,
                subject: uFile.subject,
                grade: uFile.grade,
                year: uFile.year,
                curriculum: uFile.curriculum,
                paperNumber: uFile.paperNumber,
                type: uFile.type,
                language: uFile.language,
                fileUrl: downloadUrl,
                storagePath: storagePath,
                fileSize: uFile.file.size,
                downloadCount: 0,
                topics: uFile.topics.split(',').map(t => t.trim()).filter(Boolean),
                session: uFile.session,
                province: uFile.province,
                isVerified: true,
                uploadedBy: 'admin',
                createdAt: serverTimestamp()
              };
              
              await addDoc(collection(db, 'past-papers'), paperData);
              setUploadingFiles(prev => prev.map(f => f.id === uFile.id ? { ...f, status: 'success' } : f));
              resolve(true);
            }
          );
        });
      } catch (err) {
        console.error(err);
      }
    });

    await Promise.all(promises);
    fetchPapers();
  };

  const handleDeletePaper = async (id: string) => {
    if (!confirm('Are you sure you want to delete this paper?')) return;
    try {
      await deleteDoc(doc(db, 'past-papers', id));
      setPapers(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkRepair = async () => {
    if (selectedPapers.length === 0) return;
    if (!confirm(`Are you sure you want to AI-repair metadata for ${selectedPapers.length} papers?`)) return;
    
    setSyncType('repair');
    setShowSyncModal(true);
    setSyncStatus('running');
    setSyncLogs([]);
    setSyncCount({ scanned: selectedPapers.length, checked: 0, added: 0, totalToSync: selectedPapers.length });
    setSyncStep("Preparing Documents...");

    const addLog = (msg: string) => {
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      addLog(`🚀 Initiating bulk metadata repair for ${selectedPapers.length} selected papers...`);
      const papersToFix = papers.filter(p => selectedPapers.includes(p.id));
      const batch = writeBatch(db);
      
      const BATCH_SIZE = 10;
      let repairedCount = 0;

      for (let i = 0; i < papersToFix.length; i += BATCH_SIZE) {
        const chunk = papersToFix.slice(i, i + BATCH_SIZE);
        setSyncStep(`Repairing block ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} papers)...`);
        addLog(`Analyzing content and calling Gemini model for chunk of ${chunk.length} papers...`);

        const itemsChunk = chunk.map(p => ({
          path: (p as any).storagePath || p.fileUrl,
          url: p.fileUrl
        }));
        
        const res = await fetch('/api/ai/parse-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsChunk })
        });
        
        if (!res.ok) throw new Error('AI parse failed during bulk repair');
        const parsedChunk = await res.json();
        
        chunk.forEach((paper, index) => {
          const aiMeta = parsedChunk[index];
          if (aiMeta && aiMeta.subject) {
            batch.update(doc(db, 'past-papers', paper.id), {
              title: aiMeta.title || paper.title,
              subject: aiMeta.subject || paper.subject,
              grade: aiMeta.grade || paper.grade,
              year: aiMeta.year || paper.year,
              curriculum: aiMeta.curriculum || paper.curriculum,
              paperNumber: aiMeta.paperNumber || paper.paperNumber,
              type: aiMeta.type || paper.type,
              language: aiMeta.language || paper.language,
              session: aiMeta.session || paper.session,
              province: aiMeta.province || paper.province
            });
            addLog(`✅ Successfully updated: "${paper.title || 'Untitled'}" ➔ ${aiMeta.subject} (Yr ${aiMeta.year}, Gr ${aiMeta.grade})`);
          } else {
            addLog(`⚠️ Could not repair: "${paper.title || 'Untitled'}". No metadata extracted.`);
          }
          repairedCount++;
        });

        // Update progress count live
        setSyncCount(prev => ({ ...prev, added: repairedCount }));
      }
      
      setSyncStep("Saving Changes to Firestore...");
      addLog("Committing database batch write updates to Firestore...");
      await batch.commit();
      
      addLog(`✨ Successfully repaired metadata for all ${repairedCount} papers!`);
      setSyncStatus('completed');
      setSyncStep("Complete");
      fetchPapers();
      setSelectedPapers([]);
    } catch (err: any) {
      console.error(err);
      addLog(`❌ Metadata repair failed: ${err.message}`);
      setSyncStatus('error');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedPapers.length} papers?`)) return;
    try {
      const batch = writeBatch(db);
      selectedPapers.forEach(id => {
        batch.delete(doc(db, 'past-papers', id));
      });
      await batch.commit();
      setPapers(prev => prev.filter(p => !selectedPapers.includes(p.id)));
      setSelectedPapers([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-12">
        {/* Upload Section */}
        <section className="bg-white border border-border-subtle rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 shadow-sm overflow-hidden relative text-black">
          <div className="relative z-10 text-black">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 text-black">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                    <Upload size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-text-primary">Bulk Paper Upload</h3>
                    <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest">PDFs only • Max 50MB</p>
                  </div>
               </div>
               {uploadingFiles.length > 0 && (
                 <Button onClick={handleUploadAll} disabled={uploadingFiles.every(f => f.status === 'success')} className="w-full sm:w-auto">
                    Upload {uploadingFiles.filter(f => f.status !== 'success').length} Files
                 </Button>
               )}
            </div>

            <div 
              className="border-2 border-dashed border-border-subtle rounded-[24px] sm:rounded-[32px] p-8 sm:p-12 text-center hover:border-primary/30 transition-all group cursor-pointer bg-surface mb-8"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input type="file" id="file-upload" className="hidden" multiple accept=".pdf" onChange={handleFileSelect} />
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                <Plus size={32} className="text-primary" />
              </div>
              <p className="text-lg font-serif text-text-primary mb-2">Drag files here or click to browse</p>
              <p className="text-sm text-text-tertiary">Files will be auto-analysed by name</p>
            </div>

            {uploadingFiles.length > 0 && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                 {uploadingFiles.map((uFile, idx) => (
                   <div key={uFile.id} className="p-6 bg-surface border border-border-subtle rounded-2xl">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text-primary">{uFile.file.name}</p>
                            <p className="text-[10px] font-medium text-text-tertiary">{(uFile.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           {uFile.status === 'success' ? (
                             <div className="flex items-center gap-2 text-primary font-bold text-xs">
                               <CheckCircle size={16} /> Complete
                             </div>
                           ) : uFile.status === 'uploading' ? (
                             <div className="w-32 h-2 bg-white rounded-full overflow-hidden">
                               <div className="h-full bg-primary transition-all" style={{ width: `${uFile.progress}%` }} />
                             </div>
                           ) : (
                             <button 
                               onClick={() => setUploadingFiles(prev => prev.filter(f => f.id !== uFile.id))}
                               className="p-2 hover:bg-red-50 text-text-tertiary hover:text-red-500 rounded-lg transition-all"
                             >
                               <X size={18} />
                             </button>
                           )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-text-tertiary">Subject</label>
                            <select 
                              value={uFile.subject} 
                              onChange={(e) => setUploadingFiles(prev => prev.map(f => f.id === uFile.id ? { ...f, subject: e.target.value } : f))}
                              className="w-full p-2 bg-white border border-border-subtle rounded-lg text-[10px] font-bold outline-none"
                            >
                               {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-text-tertiary">Grade</label>
                            <select 
                              value={uFile.grade}
                              onChange={(e) => setUploadingFiles(prev => prev.map(f => f.id === uFile.id ? { ...f, grade: parseInt(e.target.value) } : f))}
                              className="w-full p-2 bg-white border border-border-subtle rounded-lg text-[10px] font-bold outline-none"
                            >
                               {[8, 9, 10, 11, 12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                            </select>
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-text-tertiary">Year</label>
                            <select 
                               value={uFile.year}
                               onChange={(e) => setUploadingFiles(prev => prev.map(f => f.id === uFile.id ? { ...f, year: parseInt(e.target.value) } : f))}
                               className="w-full p-2 bg-white border border-border-subtle rounded-lg text-[10px] font-bold outline-none"
                            >
                               {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-text-tertiary">Curriculum</label>
                            <select 
                               value={uFile.curriculum}
                               onChange={(e) => setUploadingFiles(prev => prev.map(f => f.id === uFile.id ? { ...f, curriculum: e.target.value as any } : f))}
                               className="w-full p-2 bg-white border border-border-subtle rounded-lg text-[10px] font-bold outline-none"
                            >
                               <option value="NSC">NSC</option>

                            </select>
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-text-tertiary">Paper</label>
                            <select 
                               value={uFile.paperNumber}
                               onChange={(e) => setUploadingFiles(prev => prev.map(f => f.id === uFile.id ? { ...f, paperNumber: e.target.value as any } : f))}
                               className="w-full p-2 bg-white border border-border-subtle rounded-lg text-[10px] font-bold outline-none"
                            >
                               <option value="P1">P1</option>
                               <option value="P2">P2</option>
                               <option value="P3">P3</option>
                            </select>
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-text-tertiary">Type</label>
                            <select 
                               value={uFile.type}
                               onChange={(e) => setUploadingFiles(prev => prev.map(f => f.id === uFile.id ? { ...f, type: e.target.value as any } : f))}
                               className="w-full p-2 bg-white border border-border-subtle rounded-lg text-[10px] font-bold outline-none"
                            >
                               <option value="question">Question</option>
                               <option value="memo">Memo</option>
                            </select>
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-text-tertiary">Language</label>
                            <select 
                               value={uFile.language}
                               onChange={(e) => setUploadingFiles(prev => prev.map(f => f.id === uFile.id ? { ...f, language: e.target.value as any } : f))}
                               className="w-full p-2 bg-white border border-border-subtle rounded-lg text-[10px] font-bold outline-none"
                            >
                               <option value="English">English</option>
                               <option value="Afrikaans">Afrikaans</option>
                            </select>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
            )}
          </div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[160px] rounded-full pointer-events-none translate-x-1/4 -translate-y-1/4"></div>
        </section>

        {/* Management Table */}
        <section className="bg-white border border-border-subtle rounded-[32px] sm:rounded-[40px] shadow-sm overflow-hidden">
           <div className="p-6 sm:p-8 border-b border-border-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 flex-1">
                 <h3 className="text-xl font-serif text-text-primary shrink-0">Manage Vault</h3>
                  {syncStatus === 'running' && (
                    <div className="flex-1 w-full max-w-lg flex items-center gap-3 py-2 px-4 bg-gray-950 border border-gray-800 rounded-2xl text-[11px] text-green-400 font-mono animate-pulse shadow-inner min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping shrink-0" />
                      <span className="truncate">
                        <strong>
                          {syncType === 'repair' ? '🤖 AI Repair Active: ' : syncType === 'bootstrap' ? '⚡ Seeding Database: ' : '🔄 Sync Active: '}
                        </strong>
                        {syncStep || "Working..."} ({syncCount.added} matches committed / verified)
                      </span>
                    </div>
                  )}
                 <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
                    <input 
                      type="text" 
                      placeholder="Filter by subject or year..." 
                      className="w-full pl-12 pr-4 py-3 bg-surface border border-border-subtle rounded-2xl text-xs font-bold outline-none focus:border-primary/30 shadow-inner"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                 </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                 {selectedPapers.length > 0 && (
                   <>
                     <div className="relative group w-full sm:w-auto">
                       <Button variant="outline" onClick={handleBulkRepair}
                          disabled={syncStatus === 'running'}
                          className={`w-full sm:w-auto text-lux-gold border-lux-gold/20 hover:bg-lux-gold/10 hover:text-white ${
                            syncStatus === 'running' && syncType === 'repair' ? 'animate-pulse text-lux-gold bg-lux-gold/20' : ''
                          }`}
                        >
                          {syncStatus === 'running' && syncType === 'repair' ? (
                            <>
                              <Loader2 className="animate-spin text-lux-gold" size={16} />
                              AI Repairing ({syncCount.added}/{syncCount.totalToSync})...
                            </>
                          ) : (
                            <>AI Repair Meta ({selectedPapers.length})</>
                          )}
                        </Button>
                       <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block w-72 p-4 bg-gray-950 text-white rounded-2xl text-xs font-medium border border-gray-800 shadow-2xl z-40">
                         <div className="flex items-center gap-2 text-lux-gold font-bold mb-1.5 font-sans">
                           <span className="w-2 h-2 rounded-full bg-lux-gold animate-pulse" />
                           <span>AI Metadata Repair Tool</span>
                         </div>
                         <p className="text-gray-300 leading-relaxed text-[11px] mb-1 font-sans">
                           <strong>Triggers Gemini AI models to:</strong>
                         </p>
                         <ul className="list-disc pl-4 text-gray-400 space-y-1 text-[11px] font-sans">
                           <li>Deconstruct the file names and text contents for the <strong>{selectedPapers.length} selected documents</strong>.</li>
                           <li>Automatically rebuild or repair unverified descriptors (e.g. correct subject, year, grade, curriculum alignment).</li>
                           <li>Commit refined, verified index properties directly to Firestore.</li>
                         </ul>
                         <div className="mt-2 text-[10px] text-gray-500 italic font-sans border-t border-gray-800 pt-2">
                           A live step-by-step console logs all modifications.
                         </div>
                       </div>
                     </div>
                     <Button variant="outline" className="w-full sm:w-auto text-red-500 border-red-500/20 hover:bg-red-50" onClick={handleBulkDelete}>
                       Delete ({selectedPapers.length})
                     </Button>
                   </>
                 )}
                 <div className="relative group">
                   <Button 
                      onClick={() => {
                        setShowSyncModal(true);
                        setSyncStatus('idle');
                        setSyncLogs([]);
                      }} 
                      disabled={syncStatus === 'running'}
                      className={`w-full sm:w-auto font-bold flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl cursor-pointer transition-all ${
                        syncStatus === 'running' && (syncType === 'sync' || syncType === 'bootstrap')
                          ? 'bg-amber-600 text-white animate-pulse'
                          : 'bg-[#1D9E75] hover:bg-[#178562] text-white'
                      }`}
                    >
                      {syncStatus === 'running' && syncType === 'bootstrap' ? (
                        <>
                          <Loader2 className="animate-spin text-white" size={16} />
                          Seeding JSON ({syncCount.added}/{syncCount.totalToSync})...
                        </>
                      ) : syncStatus === 'running' && syncType === 'sync' ? (
                        <>
                          <Loader2 className="animate-spin text-white" size={16} />
                          Syncing Storage...
                        </>
                      ) : (
                        <>
                          <Database size={16} className="animate-pulse" /> Sync Storage Vault
                        </>
                      )}
                    </Button>
                   <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-80 p-4 bg-gray-950 text-white rounded-2xl text-xs font-medium border border-gray-800 shadow-2xl z-40">
                     <div className="flex items-center gap-2 text-[#1D9E75] font-bold mb-1.5 font-sans">
                       <span className="w-2 h-2 rounded-full bg-[#1D9E75] animate-pulse" />
                       <span>Live Sync & Scan Utility</span>
                     </div>
                     <p className="text-gray-300 leading-relaxed text-[11px] mb-1 font-sans">
                       <strong>Clicking this button reveals a live console that shows you:</strong>
                     </p>
                     <ul className="list-disc pl-4 text-gray-400 space-y-1 text-[11px] font-sans">
                       <li>Raw folder scans of your online Firebase Storage bucket (<code className="text-[#1D9E75] font-mono">/Past-papers/</code>).</li>
                       <li>Folder scans of your local codebase assets directory (<code className="text-purple-400 font-mono">/public/papers/</code>).</li>
                       <li>Active reconciliation, indicating which files exist in physical storage but have not yet been registered in your Firestore database.</li>
                       <li>AI metadata parsing of unmatched papers to index them cleanly.</li>
                     </ul>
                     <div className="mt-2.5 pt-2 border-t border-gray-800 text-[10px] text-gray-500 italic font-sans">
                       Safe and secure: Existing items are protected against duplicates.
                     </div>
                   </div>
                 </div>
                 <Button variant="outline" onClick={() => fetchPapers()} className="w-full sm:w-auto text-black border-black/10">
                    <Layout size={16} className="mr-2" /> Refresh
                 </Button>
              </div>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full">
                 <thead>
                    <tr className="bg-surface text-left">
                       <th className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            className="rounded border-border-subtle text-primary" 
                            onChange={(e) => setSelectedPapers(e.target.checked ? papers.map(p => p.id) : [])}
                          />
                       </th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Subject</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Grade</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Curriculum</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Year</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Paper</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Type</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Downloads</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-tertiary text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-border-subtle">
                    {loading ? (
                      [1,2,3,4,5].map(i => (
                        <tr key={i} className="animate-pulse">
                           <td colSpan={9} className="px-6 py-4 h-16 bg-surface/50"></td>
                        </tr>
                      ))
                    ) : papers.length > 0 ? (
                      papers.filter(p => p.subject.toLowerCase().includes(search.toLowerCase()) || p.year.toString().includes(search)).map((p) => (
                        <tr key={p.id} className="hover:bg-surface/50 transition-colors group">
                           <td className="px-6 py-4">
                              <input 
                                type="checkbox" 
                                className="rounded border-border-subtle text-primary" 
                                checked={selectedPapers.includes(p.id)}
                                onChange={(e) => setSelectedPapers(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                              />
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-sm font-bold text-text-primary">{p.subject}</span>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-xs font-medium text-text-secondary">Grade {p.grade}</span>
                           </td>
                           <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-surface border border-border-subtle rounded text-[10px] font-black text-text-tertiary">
                                {p.curriculum}
                              </span>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-sm font-bold text-text-primary">{p.year}</span>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-xs font-bold text-primary">{p.paperNumber}</span>
                           </td>
                           <td className="px-6 py-4">
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                p.type === 'question' ? "text-secondary" : "text-orange-500"
                              )}>
                                {p.type}
                              </span>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-xs font-bold text-text-tertiary">
                                <Layout size={12} /> {p.downloadCount}
                              </div>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                 <button 
                                   onClick={() => window.open(p.fileUrl)}
                                   className="p-2 text-text-tertiary hover:text-primary transition-colors"
                                 >
                                   <Eye size={18} />
                                 </button>
                                 <button 
                                   onClick={() => handleDeletePaper(p.id)}
                                   className="p-2 text-text-tertiary hover:text-red-500 transition-colors"
                                 >
                                   <Trash2 size={18} />
                                 </button>
                              </div>
                           </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-6 py-20 text-center text-text-tertiary text-sm italic">
                           No papers found in the vault.
                        </td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </section>

        {/* DATABASE STORAGE SYNCHRONIZATION MODAL */}
        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-2xl bg-[#0d0d0d] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${syncType === 'repair' ? 'bg-purple-600/10 text-purple-400' : 'bg-[#1D9E75]/10 text-[#1D9E75]'}`}>
                    <Database size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {syncType === 'repair' ? 'AI Metadata Repair Console' : 'Database & Storage Sync Utility'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {syncType === 'repair' ? 'Live re-indexing and metadata repair with Gemini' : "Reconcile Storage Vault files into website's Firestore database"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSyncModal(false)}
                  className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-900 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                {syncStatus === 'idle' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      This scanning suite traverses your Firebase Storage <code className="bg-black text-[#1D9E75] px-1.5 py-0.5 rounded font-mono text-xs font-bold">/past-papers</code> bucket directories and cross-examines every physical file against registered indices inside your Firestore database.
                    </p>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Any paper, memorandum, or booklet discovered in Storage that hasn't been listed on the website yet will be imported in batches. Attributes like subject, curriculum alignment, grade, year, and paper type are automatically deduced with smart heuristic algorithms!
                    </p>
                    <div className="p-4 bg-[#111111] border border-gray-800 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="text-[#1D9E75] shrink-0 mt-0.5" size={18} />
                      <div className="text-xs text-gray-400 space-y-1">
                        <p className="font-bold text-gray-300">Important details:</p>
                        <p>• Avoid closing this tab or putting your browser to sleep during synchronization.</p>
                        <p>• Existing indexes with matching URLs or file paths are fully protected and will not duplicates.</p>
                        <p>• Expected Storage scope of files: 3,000+ items</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Active Step Indicator */}
                    <div className="flex items-center justify-between pb-2">
                      <span className={`text-xs font-bold uppercase tracking-widest ${syncType === 'repair' ? 'text-purple-400' : 'text-[#1D9E75]'}`}>
                        CURRENT STEP: {syncStep || 'Processing...'}
                      </span>
                      {syncStatus === 'running' && (
                        <span className="text-xs text-gray-500 flex items-center gap-2">
                          <Loader2 size={12} className={`animate-spin ${syncType === 'repair' ? 'text-purple-400' : 'text-[#1D9E75]'}`} /> Operational feedback active...
                        </span>
                      )}
                    </div>

                    {/* Progress grid indices */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-black border border-gray-800 rounded-2xl text-center">
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                          {syncType === 'repair' ? 'Scope Total' : 'Storage Scanned'}
                        </span>
                        <div className="text-xl font-black text-white mt-1">{syncCount.scanned}</div>
                      </div>
                      <div className="p-4 bg-black border border-gray-800 rounded-2xl text-center">
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                          {syncType === 'repair' ? 'Type' : 'Database Checked'}
                        </span>
                        <div className="text-xl font-black text-white mt-1">
                          {syncType === 'repair' ? 'AI REPAIR' : syncCount.checked}
                        </div>
                      </div>
                      <div className="p-4 bg-black border border-gray-800 rounded-2xl text-center">
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                          {syncType === 'repair' ? 'Total Queue' : 'To Import'}
                        </span>
                        <div className={`text-xl font-black mt-1 ${syncType === 'repair' ? 'text-purple-400' : 'text-[#1D9E75]'}`}>{syncCount.totalToSync}</div>
                      </div>
                      <div className={`p-4 bg-black border border-gray-800 rounded-2xl text-center ${syncType === 'repair' ? 'border-purple-600/20 bg-purple-600/5' : 'border-[#1D9E75]/20 bg-[#1D9E75]/5'}`}>
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${syncType === 'repair' ? 'text-purple-400' : 'text-[#1D9E75]/70'}`}>
                          {syncType === 'repair' ? 'Completed' : 'Successfully Added'}
                        </span>
                        <div className="text-xl font-black text-white mt-1">{syncCount.added}</div>
                      </div>
                    </div>

                    {/* Sync progress bar */}
                    {syncStatus === 'running' && syncCount.totalToSync > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{syncType === 'repair' ? 'Refining and committing metadata changes...' : 'Writing Indexed past-papers to Firestore...'}</span>
                          <span className="font-bold text-white">
                            {Math.round((syncCount.added / syncCount.totalToSync) * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-black rounded-full overflow-hidden border border-gray-800">
                          <div 
                            className={`h-full bg-gradient-to-r transition-all duration-300 ${syncType === 'repair' ? 'from-purple-500 to-indigo-500' : 'from-teal-500 to-[#1D9E75]'}`}
                            style={{ width: `${Math.round((syncCount.added / syncCount.totalToSync) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Streaming Activity Logs Terminal */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1.5 font-bold"><Terminal size={14} /> SYSTEM FEED</span>
                        <span className="font-mono text-[10px]">
                          {syncType === 'repair' ? 'CWD: ~/api/ai/parse-metadata' : 'CWD: ~/storage/past-papers'}
                        </span>
                      </div>
                      <div 
                        ref={logContainerRef}
                        className="p-4 bg-black border border-gray-800 rounded-2xl h-64 overflow-y-auto font-mono text-[10px] text-green-400 space-y-1.5 custom-scrollbar"
                      >
                        {syncLogs.length === 0 ? (
                          <div className="text-gray-600 italic">No output. Waiting for engine...</div>
                        ) : (
                          syncLogs.map((log, lidx) => (
                            <div key={lidx} className="leading-relaxed break-all">
                              {log}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-800 bg-black/40 flex items-center justify-end gap-3">
                {syncStatus === 'idle' ? (
                  <>
                    <button 
                      onClick={() => setShowSyncModal(false)}
                      className="px-5 py-2.5 rounded-xl border border-gray-800 hover:bg-gray-900 text-sm font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                    <button 
                      onClick={handleSyncStorage}
                      className="px-6 py-2.5 rounded-xl bg-[#1D9E75] hover:bg-[#178562] text-sm font-bold text-white transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <Database size={16} /> Scan Firebase Bucket
                    </button>
                    <button 
                      onClick={handleSyncLocalCodebase}
                      className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-sm font-bold text-white transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <Database size={16} /> Scan Local Codebase /papers
                    </button>
                    <button 
                      onClick={handleSeedJSON}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-sm font-bold text-white transition-all shadow-md flex items-center gap-2 cursor-pointer border border-[#D4AF37]/20"
                    >
                      <Database size={16} className="text-white animate-pulse" /> Ingest 100% Papers (JSON Seed)
                    </button>
                  </>
                ) : syncStatus === 'running' ? (
                  <>
                    <button 
                      onClick={() => setShowSyncModal(false)}
                      className="px-5 py-2.5 rounded-xl border border-gray-800 hover:bg-gray-900 text-sm font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Hide
                    </button>
                    <button 
                      disabled
                      className="px-6 py-2.5 rounded-xl bg-gray-900 text-gray-500 text-sm font-bold flex items-center gap-2 border border-gray-800"
                    >
                      <Loader2 size={16} className={`animate-spin ${syncType === 'repair' ? 'text-purple-400' : 'text-[#1D9E75]'}`} /> {syncType === 'repair' ? 'Repairing and writing...' : 'Synchronization in progress...'}
                    </button>
                  </>
                ) : syncStatus === 'completed' ? (
                  <button 
                    onClick={() => {
                      setShowSyncModal(false);
                      setSyncStatus('idle');
                    }}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md flex items-center gap-2 cursor-pointer ${syncType === 'repair' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-[#1D9E75] hover:bg-[#178562]'}`}
                  >
                    <Check size={16} /> Finish & Done
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        setShowSyncModal(false);
                        setSyncStatus('idle');
                      }}
                      className="px-5 py-2.5 rounded-xl border border-gray-800 hover:bg-gray-900 text-sm font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                    <button 
                      onClick={syncType === 'repair' ? handleBulkRepair : handleSyncStorage}
                      className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-bold text-white transition-colors cursor-pointer"
                    >
                      Retry {syncType === 'repair' ? 'Repair' : 'Sync'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
