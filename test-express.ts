import express from "express";
const app = express();
try {
  app.get("*all", (req, res) => res.send("ok"));
  console.log("SUCCESS");
} catch (e) {
  console.error("ERROR:", e);
}
