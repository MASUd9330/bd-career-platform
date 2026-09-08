import { pgTable, serial, text, varchar, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const sourceLevelEnum = pgEnum("source_level", [
  "official_government",
  "official_institution",
  "verified_social",
  "trusted_secondary",
  "news_aggregator",
]);

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  baseUrl: text("base_url").notNull(),
  level: sourceLevelEnum("level").notNull(),
  adapterKey: varchar("adapter_key", { length: 100 }).notNull(), // matches lib/collectors/<adapterKey>.ts
  isActive: boolean("is_active").default(true).notNull(),
  lastCrawledAt: timestamp("last_crawled_at"),
  lastSuccessAt: timestamp("last_success_at"),
  consecutiveFailures: integer("consecutive_failures").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// raw fetched pages before any AI processing — kept for audit + duplicate detection
export const rawContents = pgTable("raw_contents", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").references(() => sources.id).notNull(),
  sourceUrl: text("source_url").notNull(),
  rawHtml: text("raw_html"),
  extractedText: text("extracted_text"),
  contentHash: varchar("content_hash", { length: 64 }).notNull(), // sha256, for duplicate detection
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  processed: boolean("processed").default(false).notNull(),
  processingError: text("processing_error"),
});
