import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a research assistant summarizing content for a busy professional. Your job is to extract the most valuable and specific information.
Rules:
- Be specific and concrete. Never say "they discussed X" or "the author explains Y" — state the actual argument, finding, or conclusion.
- Each takeaway must be a standalone sentence that delivers real information. Bad: "He talked about the importance of distribution." Good: "Distribution is more important than product quality in the early stage — most failed startups had decent products but no go-to-market."
- Prioritize: counterintuitive claims, specific frameworks, named tactics, concrete numbers, and strong opinions over general summaries.
- Each takeaway must cover a distinct point — do not restate or rephrase the tldr or another takeaway, even if the source repeats itself.
- If a standout quote exists (pithy, memorable, specific), include it. If not, leave quotes empty.
- Always return valid JSON and nothing else — no markdown, no backticks, no preamble.`;

const USER_PROMPT = (type: string, title: string, text: string) => {
  const typeInstructions: Record<string, string> = {
    podcast: "Focus on the strongest arguments made and any concrete frameworks, mental models, or named strategies discussed.",
    newsletter: "Focus on the central thesis and any specific recommendations, predictions, or data points.",
    video: "Focus on the core lesson or argument. If it's a tutorial, extract the key principles, not the steps.",
    article: "Focus on the central claim and the best evidence or reasoning used to support it.",
  };
  const hint = typeInstructions[type] ?? "Focus on the central argument and most specific, actionable insights.";
  const wordCount = text.split(/\s+/).length;
  const targetWords = Math.max(80, Math.min(Math.round(wordCount / 4), 400));
  const targetTakeaways = Math.max(2, Math.min(Math.round(wordCount / 200), 7));

  return `Summarize this ${type} titled "${title}".
${hint}

Length guidance:
- Aim for roughly ${targetWords} words across the tldr and takeaways combined.
- Include ${targetTakeaways} takeaways (scaled to the depth of the source content).

Return ONLY a JSON object in exactly this format:
{
  "tldr": "2-3 sentences capturing the central argument or conclusion and why it matters — not just what the content covers",
  "takeaways": [
    "Full-sentence takeaway with specific detail"
  ],
  "quotes": [
    "Only include if a quote is genuinely pithy or memorable — exact words, attributed if possible"
  ]
}

Content:
${text.substring(0, 8000)}`;
};

export interface Summary {
  tldr: string;
  takeaways: string[];
  quotes: string[];
}

export async function summarizeContent(
  type: string,
  title: string,
  rawText: string
): Promise<Summary> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: USER_PROMPT(type, title, rawText) }
    ],
  });

  const text = response.content
    .filter(b => b.type === "text")
    .map(b => (b as any).text)
    .join("");

  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean) as Summary;

  return {
    tldr: parsed.tldr ?? "",
    takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways : [],
    quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
  };
}