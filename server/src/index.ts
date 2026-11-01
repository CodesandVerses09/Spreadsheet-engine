import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./db";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});
app.get("/", (_req, res) => {
  res.json({ name: "mini-spreadsheet-api", status: "running" });
});

app.get("/db-check", async (_req, res) => {
  try {
    const result = await pool.query("select now() as now");
    res.json({ ok: true, now: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});
app.post("/sheets", async (req, res) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name : "Untitled";
    const cells = req.body?.cells ?? {};
    const result = await pool.query(
      "insert into sheets (name, cells) values ($1, $2) returning id",
      [name, cells]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create sheet" });
  }
});

app.get("/sheets/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "select id, name, cells, updated_at from sheets where id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Sheet not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid sheet id" });
  }
});

app.put("/sheets/:id", async (req, res) => {
  try {
    const cells = req.body?.cells;
    if (typeof cells !== "object" || cells === null) {
      return res.status(400).json({ error: "cells must be an object" });
    }
    const result = await pool.query(
      "update sheets set cells = $1, updated_at = now() where id = $2 returning id",
      [cells, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Sheet not found" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid sheet id" });
  }
});
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`API listening on ${PORT}`));