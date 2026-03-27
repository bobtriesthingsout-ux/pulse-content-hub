import { Router } from "express";
import { db } from "@workspace/db";
import { contentItems } from "@workspace/db/schema";
import { isNull, or, eq } from "drizzle-orm";
import { summarizeContent } from "../lib/summarize";

const router = Router();

// POST /api/summarize/all — summarize all items missing a summary
router.post("/all", async (req, res) => {
  try {
    // Find all items with no tldr yet
    const unsummarized = await db
      .select()
      .from(contentItems)
      .where(isNull(contentItems.summaryTldr));

    if (unsummarized.length === 0) {
      return res.json({ summarized: 0, message: "All items already have summaries" });
    }

    let summarized = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of unsummarized) {
      if (!item.rawText || item.rawText.trim().length < 50) {
        // Not enough text to summarize meaningfully
        await db
          .update(contentItems)
          .set({ summaryTldr: "No content available for summarization." })
          .where(eq(contentItems.id, item.id));
        continue;
      }

      try {
        const summary = await summarizeContent(item.type, item.title, item.rawText);
        await db
          .update(contentItems)
          .set({
            summaryTldr: summary.tldr,
            summaryTakeaways: JSON.stringify(summary.takeaways),
            summaryQuotes: JSON.stringify(summary.quotes),
          })
          .where(eq(contentItems.id, item.id));
        summarized++;
        // Small delay to avoid hitting rate limits
        await new Promise(r => setTimeout(r, 300));
      } catch (err: any) {
        failed++;
        errors.push(`${item.title}: ${err.message}`);
        console.error(`Failed to summarize "${item.title}":`, err.message);
      }
    }

    res.json({
      summarized,
      failed,
      total: unsummarized.length,
      message: `Summarized ${summarized} of ${unsummarized.length} items`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error("Summarize all error:", err.message);
    res.status(500).json({ error: "Summarization failed" });
  }
});

// POST /api/summarize/:id — summarize a single item by ID
router.post("/:id", async (req, res) => {
  try {
    const [item] = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.id, req.params.id));

    if (!item) return res.status(404).json({ error: "Content item not found" });
    if (!item.rawText || item.rawText.trim().length < 50) {
      return res.status(400).json({ error: "Not enough raw text to summarize" });
    }

    const summary = await summarizeContent(item.type, item.title, item.rawText);
    await db
      .update(contentItems)
      .set({
        summaryTldr: summary.tldr,
        summaryTakeaways: JSON.stringify(summary.takeaways),
        summaryQuotes: JSON.stringify(summary.quotes),
      })
      .where(eq(contentItems.id, item.id));

    res.json({ success: true, summary });
  } catch (err: any) {
    console.error("Summarize single error:", err.message);
    res.status(500).json({ error: err.message ?? "Summarization failed" });
  }
});

export default router;