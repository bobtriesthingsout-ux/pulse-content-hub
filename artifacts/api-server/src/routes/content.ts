import { Router } from "express";
import { db } from "@workspace/db";
import { contentItems, sources, dailyReadStatus } from "@workspace/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// GET /api/content
// Optional query params: ?sourceId=xxx&date=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    const { sourceId, date } = req.query;

    let query = db
      .select({ item: contentItems, source: sources })
      .from(contentItems)
      .innerJoin(sources, eq(contentItems.sourceId, sources.id))
      .orderBy(desc(contentItems.publishedAt));

    if (sourceId) {
      query = query.where(eq(contentItems.sourceId, String(sourceId))) as typeof query;
    }
    if (date) {
      const start = new Date(`${date}T00:00:00Z`);
      const end = new Date(`${date}T23:59:59Z`);
      query = query.where(
        and(gte(contentItems.publishedAt, start), lte(contentItems.publishedAt, end))
      ) as typeof query;
    }

    const rows = await query;
    const result = rows.map(r => ({
      ...r.item,
      sourceName: r.source.name,
      sourceType: r.source.type,
      takeaways: r.item.summaryTakeaways ? JSON.parse(r.item.summaryTakeaways) : [],
      quotes: r.item.summaryQuotes ? JSON.parse(r.item.summaryQuotes) : [],
    }));
    res.json(result);
  } catch (err) {
    console.error("GET /api/content error:", err);
    res.status(500).json({ error: "Failed to fetch content" });
  }
});

// GET /api/content/read-status
router.get("/read-status", async (_req, res) => {
  try {
    const rows = await db.select().from(dailyReadStatus);
    const result: Record<string, boolean> = {};
    for (const r of rows) result[r.date] = r.isRead;
    res.json(result);
  } catch (err) {
    console.error("GET /api/content/read-status error:", err);
    res.status(500).json({ error: "Failed to fetch read status" });
  }
});

// POST /api/content/read-status
router.post("/read-status", async (req, res) => {
  try {
    const schema = z.object({ date: z.string(), isRead: z.boolean() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { date, isRead } = parsed.data;
    const existing = await db
      .select()
      .from(dailyReadStatus)
      .where(eq(dailyReadStatus.date, date));

    if (existing.length > 0) {
      await db.update(dailyReadStatus).set({ isRead }).where(eq(dailyReadStatus.date, date));
    } else {
      await db.insert(dailyReadStatus).values({ date, isRead });
    }
    res.json({ date, isRead });
  } catch (err) {
    console.error("POST /api/content/read-status error:", err);
    res.status(500).json({ error: "Failed to update read status" });
  }
});

export default router;