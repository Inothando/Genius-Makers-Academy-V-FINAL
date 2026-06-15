import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));
const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  appId: config.appId
});
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, config.firestoreDatabaseId || '(default)');

async function check() {
  const snap = await getDocs(collection(db, 'past-papers'));
  console.log('Total documents in past-papers:', snap.size);
  if (snap.size > 0) {
    console.log('First doc:', snap.docs[0].data());
  }
}
check().catch(console.error);
