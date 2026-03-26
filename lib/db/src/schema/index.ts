import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const sourceTypeEnum = pgEnum("source_type", ["youtube", "podcast", "newsletter", "blog"]);
export const sourceStatusEnum = pgEnum("source_status", ["active", "paused"]);

export const sources = pgTable("sources", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  type: sourceTypeEnum("type").notNull(),
  url: text("url").notNull(),
  externalId: text("external_id").notNull(), // channel ID for YouTube, RSS URL for podcasts/blogs, email for newsletters
  status: sourceStatusEnum("status").notNull().default("active"),
  lastCheckedAt: timestamp("last_checked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contentItems = pgTable("content_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourceId: text("source_id").notNull().references(() => sources.id),
  externalId: text("external_id").notNull().unique(), // YouTube video ID, RSS item GUID, Gmail message ID
  title: text("title").notNull(),
  publishedAt: timestamp("published_at").notNull(),
  ingestedAt: timestamp("ingested_at").notNull().defaultNow(),
  originalUrl: text("original_url").notNull(),
  rawText: text("raw_text"),
  summaryTldr: text("summary_tldr"),
  summaryTakeaways: text("summary_takeaways"), // stored as JSON array string
  summaryQuotes: text("summary_quotes"),       // stored as JSON array string
  type: text("type").notNull(),                // video | podcast | newsletter | article
});

export const dailyReadStatus = pgTable("daily_read_status", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  date: text("date").notNull().unique(), // YYYY-MM-DD
  isRead: boolean("is_read").notNull().default(false),
});

export const insertSourceSchema = createInsertSchema(sources).omit({ id: true, createdAt: true });
export const selectSourceSchema = createSelectSchema(sources);
export const insertContentItemSchema = createInsertSchema(contentItems).omit({ id: true, ingestedAt: true });
export const insertDailyReadStatusSchema = createInsertSchema(dailyReadStatus).omit({ id: true });