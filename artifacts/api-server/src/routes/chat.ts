import { Router } from "express";
import { db } from "@workspace/db";
import { contentItems, sources } from "@workspace/db/schema";
import { eq, isNotNull } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Simple keyword search — finds items relevant to the query
function scoreItem(item: any, query: string): number {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 3);
  let score = 0;

  const title = (item.title ?? "").toLowerCase();
  const tldr = (item.summaryTldr ?? "").toLowerCase();
  const takeaways = (item.summaryTakeaways ?? "").toLowerCase();
  const sourceName = (item.sourceName ?? "").toLowerCase();

  for (const word of words) {
    if (title.includes(word)) score += 3;
    if (tldr.includes(word)) score += 2;
    if (takeaways.includes(word)) score += 1;
    if (sourceName.includes(word)) score += 2;
  }
  return score;
}

// POST /api/chat
router.post("/", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    }

    // Fetch all summarized items with their source info
    const rows = await db
      .select({ item: contentItems, source: sources })
      .from(contentItems)
      .innerJoin(sources, eq(contentItems.sourceId, sources.id))
      .where(isNotNull(contentItems.summaryTldr));

    const enriched = rows.map(r => ({
      ...r.item,
      sourceName: r.source.name,
      sourceType: r.source.type,
      takeaways: r.item.summaryTakeaways ? JSON.parse(r.item.summaryTakeaways) : [],
    }));

    // Score and pick top 8 most relevant items
    const scored = enriched
      .map(item => ({ item, score: scoreItem(item, message) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .filter(s => s.score > 0)
      .map(s => s.item);

    // If nothing scored, fall back to the 6 most recent items
    const contextItems = scored.length > 0
      ? scored
      : enriched
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
          .slice(0, 6);

    // Build context block for Claude
    const contextBlock = contextItems.map((item, i) => {
      const date = new Date(item.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const takeawayLines = item.takeaways.length > 0
        ? `Key points:\n${item.takeaways.map((t: string) => `- ${t}`).join("\n")}`
        : "";
      return `[${i + 1}] "${item.title}" — ${item.sourceName} (${date})
Summary: ${item.summaryTldr}
${takeawayLines}
ID: ${item.id}
Source ID: ${item.sourceId}`.trim();
    }).join("\n\n---\n\n");

    const systemPrompt = `You are Pulse AI, a research assistant that helps users query their personal content library.
You have access to summaries of content the user has ingested — YouTube videos, podcasts, newsletters, and blog posts.

Rules:
- Answer based ONLY on the content provided. Do not use outside knowledge.
- Always cite your sources using the format [Source Name · Date] inline in your answer.
- If the content doesn't contain enough information to answer well, say so honestly.
- Be specific and concrete — quote or paraphrase actual points from the content.
- Keep answers focused and well-structured. Use bold for key terms where helpful.
- At the end of your response, include a JSON block listing the source IDs you cited, in this exact format:
<citations>
[{"id": "item-id-here", "sourceId": "source-id-here", "text": "Short display label"}]
</citations>`;

    const userPrompt = `Here is the relevant content from my library:\n\n${contextBlock}\n\n---\n\nMy question: ${message}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = response.content
      .filter(b => b.type === "text")
      .map(b => (b as any).text)
      .join("");

    // Parse citations block out of the response
    const citationMatch = rawText.match(/<citations>([\s\S]*?)<\/citations>/);
    let citations: { id: string; sourceId: string; text: string }[] = [];
    let content = rawText.replace(/<citations>[\s\S]*?<\/citations>/, "").trim();

    if (citationMatch) {
      try {
        citations = JSON.parse(citationMatch[1].trim());
      } catch {
        // Citations parsing failed — still return the answer
      }
    }

    res.json({ content, citations });
  } catch (err: any) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Chat request failed" });
  }
});

export default router;