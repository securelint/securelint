import express from "express";

const app = express();

/** @protected */
app.get("/me", async (_req, res) => {
  res.json({ ok: true });
});

export default app;
