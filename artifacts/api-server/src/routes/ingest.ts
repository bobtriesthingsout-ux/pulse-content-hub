import { Router } from "express";
import { db } from "@workspace/db";
import { sources, contentItems } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";

const router = Router();

// POST /api/ingest/youtube/:sourceId
router.post("/youtube/:sourceId", async (req, res) => {
  try {
    const { sourceId } = req.params;
    const [source] = await db.select().from(sources).where(eq(sources.id, sourceId));
    if (!source || source.type !== "youtube") {
      return res.status(404).json({ error: "YouTube source not found" });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing YOUTUBE_API_KEY" });

    const channelId = source.externalId;
    const sinceParam = req.query.since as string | undefined;
    const publishedAfter = sinceParam
      ? new Date(sinceParam).toISOString()
      : source.lastCheckedAt
        ? source.lastCheckedAt.toISOString()
        : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const searchUrl =
      `https://www.googleapis.com/youtube/v3/search` +
      `?key=${apiKey}&channelId=${channelId}&part=snippet&order=date` +
      `&type=video&publishedAfter=${encodeURIComponent(publishedAfter)}&maxResults=10`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json() as any;

    if (searchData.error) {
      return res.status(500).json({ error: `YouTube API error: ${searchData.error.message}` });
    }

    const items = searchData.items ?? [];
    let ingested = 0;

    for (const item of items) {
      const videoId = item.id?.videoId;
      if (!videoId) continue;

      // Deduplicate
      const existing = await db.select().from(contentItems).where(eq(contentItems.externalId, videoId));
      if (existing.length > 0) continue;

      const title = item.snippet?.title ?? "Untitled";
      const publishedAt = new Date(item.snippet?.publishedAt ?? Date.now());
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      // Use description as rawText for now — full transcript via AssemblyAI comes in Session 3
      const rawText = item.snippet?.description ?? "";

      await db.insert(contentItems).values({
        sourceId: source.id,
        externalId: videoId,
        title,
        publishedAt,
        originalUrl: videoUrl,
        rawText,
        type: "video",
      });
      ingested++;
    }

    await db.update(sources).set({ lastCheckedAt: new Date() }).where(eq(sources.id, sourceId));
    res.json({ ingested, message: `Ingested ${ingested} new video(s) from ${source.name}` });
  } catch (err) {
    console.error("YouTube ingestion error:", err);
    res.status(500).json({ error: "YouTube ingestion failed" });
  }
});

// POST /api/ingest/rss/:sourceId — handles both podcasts and blogs
router.post("/rss/:sourceId", async (req, res) => {
  try {
    const { sourceId } = req.params;
    const [source] = await db.select().from(sources).where(eq(sources.id, sourceId));
    if (!source || !["podcast", "blog"].includes(source.type)) {
      return res.status(404).json({ error: "RSS source not found" });
    }

    const feedUrl = source.externalId;
    const feedRes = await fetch(feedUrl, {
      headers: { "User-Agent": "Pulse Content Hub/1.0" },
    });
    if (!feedRes.ok) {
      return res.status(500).json({ error: `Failed to fetch RSS feed (HTTP ${feedRes.status}): ${feedUrl}` });
    }

    const feedText = await feedRes.text();
    const parser = new XMLParser({ ignoreAttributes: false, cdataTagName: "__cdata", processEntities: false });
    const parsed = parser.parse(feedText);
    const rawItems = parsed?.rss?.channel?.item;
    if (!rawItems) {
      return res.json({ ingested: 0, message: "No items found in RSS feed" });
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

      // GUID can be a string or an object with #text
      const guidRaw = item.guid;
      const guid = typeof guidRaw === "object" ? guidRaw["#text"] ?? guidRaw.__cdata : guidRaw ?? item.link;
      if (!guid) continue;

      const titleRaw = item.title;
      const title = typeof titleRaw === "object" ? titleRaw.__cdata ?? String(titleRaw) : String(titleRaw ?? "Untitled");
      const link = typeof item.link === "string" ? item.link : String(item.link ?? "");

      // Grab best available text content, strip HTML tags
      const descriptionRaw = item["content:encoded"] ?? item.description ?? "";
      const description = typeof descriptionRaw === "object"
        ? descriptionRaw.__cdata ?? ""
        : String(descriptionRaw);
      const rawText = description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

      // Deduplicate
      const existing = await db.select().from(contentItems).where(eq(contentItems.externalId, String(guid)));
      if (existing.length > 0) continue;

      await db.insert(contentItems).values({
        sourceId: source.id,
        externalId: String(guid),
        title,
        publishedAt,
        originalUrl: link,
        rawText,
        type: source.type === "podcast" ? "podcast" : "article",
      });
      ingested++;
    }

    await db.update(sources).set({ lastCheckedAt: new Date() }).where(eq(sources.id, sourceId));
    res.json({ ingested, message: `Ingested ${ingested} new item(s) from ${source.name}` });
  } catch (err) {
    console.error("RSS ingestion error:", err);
    res.status(500).json({ error: "RSS ingestion failed" });
  }
});

// POST /api/ingest/all — trigger all active sources
router.post("/all", async (_req, res) => {
  try {
    const allSources = await db.select().from(sources).where(eq(sources.status, "active"));
    const results: Record<string, any> = {};
    const base = `http://localhost:${process.env.PORT ?? 3000}/api/ingest`;

    for (const source of allSources) {
      try {
        if (source.type === "youtube") {
          const r = await fetch(`${base}/youtube/${source.id}`, { method: "POST" });
          results[source.name] = await r.json();
        } else if (source.type === "podcast" || source.type === "blog") {
          const r = await fetch(`${base}/rss/${source.id}`, { method: "POST" });
          results[source.name] = await r.json();
        } else {
          results[source.name] = { message: "Skipped — not yet implemented" };
        }
      } catch (e: any) {
        results[source.name] = { error: e.message };
      }
    }
    res.json(results);
  } catch (err) {
    console.error("Bulk ingestion error:", err);
    res.status(500).json({ error: "Bulk ingestion failed" });
  }
});

export default router;