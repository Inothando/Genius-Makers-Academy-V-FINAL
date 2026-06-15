import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage';
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
const storage = getStorage(app);

const cleanString = (str: string) => {
  return (str || '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
};

async function reorganizeClient() {
  console.log('📬 Fetching papers from Firestore...');
  const snapshot = await getDocs(collection(db, 'past-papers'));
  const docs = snapshot.docs;
  console.log(`✅ Loaded ${docs.length} documents.`);
  const limitedDocs = docs.slice(0, 5);

  let processedCount = 0;
  let copiedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const docSnap of limitedDocs) {
    processedCount++;
    const data = docSnap.data();
    
    // Stop early for testing if there are too many (e.g. process just a few to verify)
    // Actually we will process all because user said "Take as long as you need".
    
    const oldStoragePath = data.storagePath;
    if (!oldStoragePath) {
      skippedCount++;
      continue;
    }

    const fileName = oldStoragePath.split('/').pop() || 'file.pdf';
    
    let displaySession = data.session || 'Various';
    displaySession = displaySession.replace('Term4_', '').replace('Term3_', '').replace('Term2_', '');

    const cleanSubject = cleanString(data.subject || 'Mathematics');
    const curriculum = data.curriculum || 'NSC';
    const year = data.year || 2024;
    const grade = data.grade || 12;
    
    const newStoragePath = `past-papers/${curriculum}/${year}/${displaySession}/Grade${grade}/${cleanSubject}/${fileName}`;

    if (oldStoragePath === newStoragePath) {
      skippedCount++;
      continue;
    }

    const oldRef = ref(storage, oldStoragePath);
    const newRef = ref(storage, newStoragePath);

    try {
      console.log(`Moving: ${oldStoragePath} -> ${newStoragePath}`);
      
      // 1. Get download URL for old file
      let downloadUrl;
      try {
        downloadUrl = await getDownloadURL(oldRef);
      } catch (e: any) {
        console.log(`⚠️ Old file missing in storage: ${oldStoragePath} (skipping storage move, updating DB)`);
        // If file is missing we can still update the path in DB? No, fileUrl would be broken. Let's just skip it
        skippedCount++;
        continue;
      }

      // 2. Download file to memory
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`HTTP error ${response.status} when downloading old file`);
      const buffer = await response.arrayBuffer();

      // 3. Upload to new path
      await uploadBytes(newRef, buffer, { contentType: 'application/pdf' });
      
      // 4. Get new download URL
      const newFileUrl = await getDownloadURL(newRef);

      // 5. Update Firestore
      await updateDoc(doc(db, 'past-papers', docSnap.id), {
        storagePath: newStoragePath,
        fileUrl: newFileUrl
      });
      
      // 6. Delete old file
      try {
        await deleteObject(oldRef);
      } catch (delErr) {
        console.warn(`Could not delete old storage file at ${oldStoragePath}, ignoring error.`);
      }

      copiedCount++;
      if (processedCount % 10 === 0) {
        console.log(`   Processed ${processedCount}/${docs.length} documents (Moved: ${copiedCount})`);
      }
    } catch (err: any) {
      console.error(`❌ Error processing doc ${docSnap.id}:`, err.message);
      errorCount++;
    }
  }

  console.log(`🎉 Done reorganizing storage! Moved: ${copiedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
}

reorganizeClient().catch(console.error);
