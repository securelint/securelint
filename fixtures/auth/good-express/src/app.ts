import express from "express";

const app = express();

function requireAuth(_req: any, _res: any, next: any) {
  next();
}

/** @protected */
app.get("/me", requireAuth, async (_req, res) => {
  res.json({ ok: true });
});

export default app;
