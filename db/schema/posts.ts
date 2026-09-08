import { pgTable, serial, text, varchar, timestamp, integer, boolean, real, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { sources } from "./sources";

export const postTypeEnum = pgEnum("post_type", [
  "job",
  "admission",
  "result",
  "exam",
  "notice",
  "article",
]);

export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "needs_review",
  "published",
  "expired",
  "rejected",
]);

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  type: postTypeEnum("type").notNull(),

  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),

  excerpt: text("excerpt"),
  content: text("content"), // rendered body (from AI structured output, assembled)

  organizationId: integer("organization_id").references(() => organizations.id),
  categorySlug: varchar("category_slug", { length: 100 }),

  status: postStatusEnum("status").default("draft").notNull(),
  publishedAt: timestamp("published_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),

  // provenance — every post traces back to a real source
  sourceId: integer("source_id").references(() => sources.id),
  sourceUrl: text("source_url").notNull(),
  sourceName: varchar("source_name", { length: 255 }),
  sourcePublishedAt: timestamp("source_published_at"),
  originalHash: varchar("original_hash", { length: 64 }),

  aiGenerated: boolean("ai_generated").default(true).notNull(),
  aiModel: varchar("ai_model", { length: 100 }),
  qualityScore: real("quality_score"), // scoring engine output, drives auto-publish vs review

  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: varchar("seo_description", { length: 500 }),
  canonicalUrl: text("canonical_url"),
  featuredImage: text("featured_image"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
