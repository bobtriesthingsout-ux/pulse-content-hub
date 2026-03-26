import { Router } from "express";
import { db } from "@workspace/db";
import { sources, insertSourceSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// GET /api/sources — list all sources
router.get("/", async (_req, res) => {
  try {
    const all = await db.select().from(sources).orderBy(sources.createdAt);
    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sources" });
  }
});

// POST /api/sources — add a new source
router.post("/", async (req, res) => {
  try {
    const parsed = insertSourceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const [created] = await db.insert(sources).values(parsed.data).returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create source" });
  }
});

// PATCH /api/sources/:id — update status (pause/resume)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const schema = z.object({ status: z.enum(["active", "paused"]) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const [updated] = await db
      .update(sources)
      .set({ status: parsed.data.status })
      .where(eq(sources.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Source not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update source" });
  }
});

// DELETE /api/sources/:id — hard delete (rare, but useful for mistakes)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(sources).where(eq(sources.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete source" });
  }
});

export default router;