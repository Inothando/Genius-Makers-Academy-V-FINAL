import express from "express";
try {
  const mod = await import("./server.js"); // Wait, it's server.ts
  console.log("IMPORTED");
} catch (e) {
  console.error("ERROR IMPORTING:", e);
}
