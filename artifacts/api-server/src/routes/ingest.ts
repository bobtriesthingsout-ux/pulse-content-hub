import { summarizeContent } from "../lib/summarize";
import { Router } from "express";
import { db } from "@workspace/db";
import { sources, contentItems } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";

const router = Router();

// ─── YouTube ──────────────────────────────────────────────────────────────────

async function ingestYouTube(source: typeof sources.$inferSelect) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("Missing YOUTUBE_API_KEY");

  const channelId = source.externalId;
  const publishedAfter = source.lastCheckedAt
    ? source.lastCheckedAt.toISOString()
    : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const searchUrl =
    `https://www.googleapis.com/youtube/v3/search` +
    `?key=${apiKey}&channelId=${channelId}&part=snippet&order=date` +
    `&type=video&publishedAfter=${encodeURIComponent(publishedAfter)}&maxResults=10`;

  const searchRes = await fetch(searchUrl);
  const searchData = (await searchRes.json()) as any;

  if (searchData.error) {
    throw new Error(`YouTube API error: ${searchData.error.message}`);
  }

  const items = searchData.items ?? [];
  let ingested = 0;

  for (const item of items) {
    const videoId = item.id?.videoId;
    if (!videoId) continue;

    const existing = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.externalId, videoId));
    if (existing.length > 0) continue;

    const title = item.snippet?.title ?? "Untitled";
    const rawText = item.snippet?.description ?? "";
    let summaryTldr = null;
    let summaryTakeaways = null;
    let summaryQuotes = null;

    if (rawText.trim().length >= 50) {
      try {
        const summary = await summarizeContent("video", title, rawText);
        summaryTldr = summary.tldr;
        summaryTakeaways = JSON.stringify(summary.takeaways);
        summaryQuotes = JSON.stringify(summary.quotes);
      } catch (e: any) {
        console.error(`Summary failed for "${title}":`, e.message);
      }
    }

    await db.insert(contentItems).values({
      sourceId: source.id,
      externalId: videoId,
      title,
      publishedAt: new Date(item.snippet?.publishedAt ?? Date.now()),
      originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      rawText,
      summaryTldr,
      summaryTakeaways,
      summaryQuotes,
      type: "video",
    });
    ingested++;
  }

  await db
    .update(sources)
    .set({ lastCheckedAt: new Date() })
    .where(eq(sources.id, source.id));
  return {
    ingested,
    message: `Ingested ${ingested} new video(s) from ${source.name}`,
  };
}

// ─── RSS (podcasts + blogs) ───────────────────────────────────────────────────

async function ingestRSS(source: typeof sources.$inferSelect) {
  const feedUrl = source.externalId;
  const feedRes = await fetch(feedUrl, {
    headers: { "User-Agent": "Pulse Content Hub/1.0" },
  });
  if (!feedRes.ok) {
    throw new Error(
      `Failed to fetch RSS feed (HTTP ${feedRes.status}): ${feedUrl}`,
    );
  }

  const feedText = await feedRes.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataTagName: "__cdata",
    processEntities: false,
  });
  const parsed = parser.parse(feedText);
  const rawItems = parsed?.rss?.channel?.item;
  if (!rawItems) {
    return { ingested: 0, message: "No items found in RSS feed" };
  }

  const itemArray: any[] = Array.isArray(rawItems) ? rawItems : [rawItems];
  const cutoff = source.lastCheckedAt
    ? source.lastCheckedAt
    : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  let ingested = 0;

  for (const item of itemArray) {
    const pubDateRaw = item.pubDate ?? item["dc:date"];
    const publishedAt = pubDateRaw ? new Date(pubDateRaw) : new Date();
    if (publishedAt < cutoff) continue;

    const guidRaw = item.guid;
    const guid =
      typeof guidRaw === "object"
        ? (guidRaw["#text"] ?? guidRaw.__cdata)
        : (guidRaw ?? item.link);
    if (!guid) continue;

    const titleRaw = item.title;
    const title =
      typeof titleRaw === "object"
        ? (titleRaw.__cdata ?? String(titleRaw))
        : String(titleRaw ?? "Untitled");

    const link =
      typeof item.link === "string" ? item.link : String(item.link ?? "");

    const descriptionRaw = item["content:encoded"] ?? item.description ?? "";
    const description =
      typeof descriptionRaw === "object"
        ? (descriptionRaw.__cdata ?? "")
        : String(descriptionRaw);
    const rawText = description
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const existing = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.externalId, String(guid)));
    if (existing.length > 0) continue;

    let summaryTldr = null;
    let summaryTakeaways = null;
    let summaryQuotes = null;
    const contentType = source.type === "podcast" ? "podcast" : "article";

    if (rawText.trim().length >= 50) {
      try {
        const summary = await summarizeContent(contentType, title, rawText);
        summaryTldr = summary.tldr;
        summaryTakeaways = JSON.stringify(summary.takeaways);
        summaryQuotes = JSON.stringify(summary.quotes);
      } catch (e: any) {
        console.error(`Summary failed for "${title}":`, e.message);
      }
    }

    await db.insert(contentItems).values({
      sourceId: source.id,
      externalId: String(guid),
      title,
      publishedAt,
      originalUrl: link,
      rawText,
      summaryTldr,
      summaryTakeaways,
      summaryQuotes,
      type: contentType,
    });
    ingested++;
  }

  await db
    .update(sources)
    .set({ lastCheckedAt: new Date() })
    .where(eq(sources.id, source.id));
  return {
    ingested,
    message: `Ingested ${ingested} new item(s) from ${source.name}`,
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post("/youtube/:sourceId", async (req, res) => {
  try {
    const [source] = await db
      .select()
      .from(sources)
      .where(eq(sources.id, req.params.sourceId));
    if (!source || source.type !== "youtube") {
      return res.status(404).json({ error: "YouTube source not found" });
    }
    const result = await ingestYouTube(source);
    res.json(result);
  } catch (err: any) {
    console.error("YouTube ingest error:", err.message);
    res.status(500).json({ error: err.message ?? "YouTube ingestion failed" });
  }
});

router.post("/rss/:sourceId", async (req, res) => {
  try {
    const [source] = await db
      .select()
      .from(sources)
      .where(eq(sources.id, req.params.sourceId));
    if (!source || !["podcast", "blog"].includes(source.type)) {
      return res.status(404).json({ error: "RSS source not found" });
    }
    const result = await ingestRSS(source);
    res.json(result);
  } catch (err: any) {
    console.error("RSS ingest error:", err.message);
    res.status(500).json({ error: err.message ?? "RSS ingestion failed" });
  }
});

// POST /api/ingest/all — directly calls ingest functions, no self-HTTP calls
router.post("/all", async (_req, res) => {
  try {
    const allSources = await db
      .select()
      .from(sources)
      .where(eq(sources.status, "active"));
    const results: Record<string, any> = {};

    for (const source of allSources) {
      try {
        if (source.type === "youtube") {
          results[source.name] = await ingestYouTube(source);
        } else if (source.type === "podcast" || source.type === "blog") {
          results[source.name] = await ingestRSS(source);
        } else {
          results[source.name] = { message: "Skipped — not yet implemented" };
        }
      } catch (e: any) {
        results[source.name] = { error: e.message };
      }
    }
    res.json(results);
  } catch (err: any) {
    console.error("Bulk ingest error:", err.message);
    res.status(500).json({ error: "Bulk ingestion failed" });
  }
});

export default router;
