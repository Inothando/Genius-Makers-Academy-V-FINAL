import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

try {
  console.log("Init app...");
  initializeApp();
  console.log("Get firestore...");
  const db = getFirestore();
  console.log("Done:", db.databaseId);
} catch (e) {
  console.error("ERROR:", e);
}
