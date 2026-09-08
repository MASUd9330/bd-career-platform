import { pgTable, serial, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nameBangla: varchar("name_bangla", { length: 255 }),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 50 }).notNull(), // government | university | bank | company | board
  logoUrl: text("logo_url"),
  officialWebsite: text("official_website"),
  description: text("description"),
  district: varchar("district", { length: 100 }),

  // extra structured info that varies per org type
  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
