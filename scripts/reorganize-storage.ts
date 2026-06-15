import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

initializeApp({
  projectId: config.projectId,
  storageBucket: config.storageBucket
});

const databaseId = config.firestoreDatabaseId || '(default)';
const db = getFirestore(databaseId);
const bucket = getStorage().bucket();

const cleanString = (str: string) => {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
};

async function reorganize() {
  console.log('📬 Fetching papers from Firestore...');
  const snapshot = await db.collection('past-papers').get();
  console.log(`✅ Loaded ${snapshot.size} documents.`);

  let processedCount = 0;
  let copiedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    processedCount++;

    const oldStoragePath = data.storagePath;
    if (!oldStoragePath) {
      skippedCount++;
      continue;
    }

    const fileName = oldStoragePath.split('/').pop() || 'file.pdf';
    
    // session clean
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

    try {
      const oldFile = bucket.file(oldStoragePath);
      const newFile = bucket.file(newStoragePath);

      // Check if old file exists
      const [exists] = await oldFile.exists();
      if (!exists) {
        console.log(`⚠️ File missing in storage: ${oldStoragePath}`);
        // If they don't exist, we just skip or maybe update the path anyway? Let's skip.
        skippedCount++;
        continue;
      }

      console.log(`Moving: ${oldStoragePath} -> ${newStoragePath}`);
      
      // Copy and delete
      await oldFile.copy(newFile);
      await oldFile.delete();

      // Make new file public
      await newFile.makePublic();
      const newFileUrl = `https://storage.googleapis.com/${config.storageBucket}/${encodeURI(newStoragePath)}`;

      // Update Firestore
      await db.collection('past-papers').doc(docSnap.id).update({
        storagePath: newStoragePath,
        fileUrl: newFileUrl
      });

      copiedCount++;
      
      if (processedCount % 50 === 0) {
        console.log(`   Processed ${processedCount}/${snapshot.size} documents (Moved: ${copiedCount})`);
      }
    } catch (err: any) {
      console.error(`❌ Error processing doc ${docSnap.id}:`, err.message);
      errorCount++;
    }
  }

  console.log(`🎉 Done reorganizing storage! Moved: ${copiedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
}

reorganize().catch(console.error);
