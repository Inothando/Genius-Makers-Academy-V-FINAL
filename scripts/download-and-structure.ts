import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  appId: config.appId
});

const db = initializeFirestore(app, {}, config.firestoreDatabaseId || '(default)');

async function downloadPdfs() {
  console.log('📬 Reading current past papers local registry...');
  const jsonPath = path.join(process.cwd(), 'src/data/past-papers.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Local past-papers.json registry not found at ${jsonPath}`);
    return;
  }
  const papers = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as any[];
  console.log(`✅ Loaded ${papers.length} registry entries.`);

  let downloadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  // Use high concurrency of 80 workers for extreme download speed on Google Cloud's network backbone
  const CONCURRENCY = 80;
  const queue = [...papers];
  const activeWorkers: Promise<void>[] = [];

  const updateProgress = () => {
    const total = papers.length;
    const processed = downloadedCount + skippedCount + errorCount;
    if (processed % 100 === 0 || processed === total) {
      console.log(`📊 Progress: ${processed}/${total} processed (Downloaded: ${downloadedCount}, Skipped: ${skippedCount}, Errors: ${errorCount})`);
    }
  };

  const processPaper = async (paper: any) => {
    const storagePath = paper.storagePath;
    const fileUrl = paper.fileUrl;
    if (!storagePath || !fileUrl) {
      skippedCount++;
      return;
    }

    // Exact cloud storage path format, e.g. "past-papers/..."
    const localRelative = storagePath; 
    const localAbsolute = path.join(process.cwd(), 'public', localRelative);

    // If PDF file exists locally, we just skip downloading it
    if (fs.existsSync(localAbsolute)) {
      skippedCount++;
      // We still update the paper's URL locally to point to the local relative server path
      paper.fileUrl = '/' + localRelative;
      return;
    }

    // Ensure directory exists
    fs.mkdirSync(path.dirname(localAbsolute), { recursive: true });

    let success = false;
    let attempts = 3;
    while (attempts > 0 && !success) {
      try {
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(localAbsolute, Buffer.from(buffer));
        success = true;
        downloadedCount++;
        paper.fileUrl = '/' + localRelative;
      } catch (err: any) {
        attempts--;
        if (attempts === 0) {
          console.error(`❌ Failed to download ${paper.id}: ${err.message}`);
          errorCount++;
        } else {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }
  };

  const worker = async () => {
    while (queue.length > 0) {
      const paper = queue.shift();
      if (!paper) break;
      await processPaper(paper);
      updateProgress();
    }
  };

  console.log(`🚀 Spawning ${CONCURRENCY} concurrent workers to download and structure all PDFs...`);
  for (let i = 0; i < CONCURRENCY; i++) {
    activeWorkers.push(worker());
  }

  await Promise.all(activeWorkers);

  console.log('\n====================================================');
  console.log(`🎉 Downloading complete! Total papers downloaded/already existed: ${downloadedCount + skippedCount}`);
  console.log(`Failed downloads: ${errorCount}`);
  console.log('====================================================');

  console.log('📝 STEP 4: Saving updated metadata registry to CDE...');
  const updatedDataStr = JSON.stringify(papers, null, 2);
  fs.writeFileSync(path.join(process.cwd(), 'src/data/past-papers.json'), updatedDataStr);
  fs.writeFileSync(path.join(process.cwd(), 'public', 'past-papers.json'), updatedDataStr);
  console.log('✅ Local registries updated successfully!');
}

downloadPdfs().catch(console.error);
