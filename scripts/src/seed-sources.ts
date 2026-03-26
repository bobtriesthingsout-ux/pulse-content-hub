import { db } from "@workspace/db";
import { sources } from "@workspace/db/schema";

const SOURCES = [
  // YouTube — externalId is the channel ID used by YouTube Data API
  {
    name: "Futurepedia",
    type: "youtube" as const,
    url: "https://www.youtube.com/@futurepedia_io",
    externalId: "UC_RovKmk0OCbuZjA8f08opw",
    status: "active" as const,
  },
  {
    name: "Exponential View",
    type: "youtube" as const,
    url: "https://www.youtube.com/@ExponentialView",
    externalId: "UCygH8N-CIpwKituGw24Tzyg",
    status: "active" as const,
  },
  {
    name: "Dwarkesh Patel",
    type: "youtube" as const,
    url: "https://www.youtube.com/@DwarkeshPatel",
    externalId: "UCXl4i9dYBrFOabk0xGmbkRA",
    status: "active" as const,
  },
  // Podcasts — externalId is the verified RSS feed URL
  {
    name: "The Startup Ideas Podcast",
    type: "podcast" as const,
    url: "https://open.spotify.com/show/6aB0v6amo3a8hgTCjlTlvh",
    externalId: "https://rss2.flightcast.com/ordbkg8yojpehffas7vr7qpc.xml",
    status: "active" as const,
  },
  {
    name: "The Ezra Klein Show",
    type: "podcast" as const,
    url: "https://open.spotify.com/show/3oB5noYIwEB2dMAREj2F7S",
    externalId: "https://feeds.simplecast.com/82FI35Px",
    status: "active" as const,
  },
  {
    name: "The Martell Method",
    type: "podcast" as const,
    url: "https://open.spotify.com/show/0Ff64cpIWetsisnKKbVCst",
    externalId: "https://anchor.fm/s/102ae1cf0/podcast/rss",
    status: "active" as const,
  },
  // Blogs — externalId is the RSS feed URL
  {
    name: "Paul Graham",
    type: "blog" as const,
    url: "https://paulgraham.com/articles.html",
    externalId: "https://filipesilva.github.io/paulgraham-rss/feed.rss",
    status: "active" as const,
  },
];

async function seed() {
  console.log("Seeding sources...");
  const existing = await db.select().from(sources);
  const existingNames = new Set(existing.map(s => s.name));

  for (const source of SOURCES) {
    if (existingNames.has(source.name)) {
      console.log(`Skipping "${source.name}" — already exists`);
      continue;
    }
    await db.insert(sources).values(source);
    console.log(`Added: ${source.name}`);
  }
  console.log("Done seeding.");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});