import { pgTable, serial, varchar, timestamp, integer, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { posts } from "./posts";

export const alertChannelEnum = pgEnum("alert_channel", ["email", "telegram"]);

/**
 * A subscriber can be identified by email OR a telegram chat id — one of
 * the two is required. filters drives which new posts trigger a
 * notification (category, district, keyword).
 */
export const alertSubscriptions = pgTable("alert_subscriptions", {
  id: serial("id").primaryKey(),
  channel: alertChannelEnum("channel").notNull(),
  email: varchar("email", { length: 255 }),
  telegramChatId: varchar("telegram_chat_id", { length: 100 }),

  filters: jsonb("filters"), // { categorySlug?, district?, keywords?: string[] }

  isActive: boolean("is_active").default(true).notNull(),
  verifiedAt: timestamp("verified_at"), // email confirmation timestamp; telegram is self-verifying via /start
  unsubscribeToken: varchar("unsubscribe_token", { length: 64 }).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Deadline reminders already sent, so we never remind the same subscriber twice for the same post. */
export const alertDeliveries = pgTable("alert_deliveries", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").references(() => alertSubscriptions.id).notNull(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  deliveryType: varchar("delivery_type", { length: 30 }).notNull(), // new_post | deadline_reminder
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

/** Anonymous "saved jobs" via a browser-set device token — no full account system needed for v1. */
export const savedJobs = pgTable("saved_jobs", {
  id: serial("id").primaryKey(),
  deviceToken: varchar("device_token", { length: 100 }).notNull(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
});
