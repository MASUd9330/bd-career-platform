import { pgTable, serial, varchar, timestamp, integer, text, jsonb } from "drizzle-orm/pg-core";
import { posts } from "./posts";

export const admissionDetails = pgTable("admission_details", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id).notNull().unique(),

  program: varchar("program", { length: 255 }),
  academicYear: varchar("academic_year", { length: 20 }),

  applicationStart: timestamp("application_start"),
  applicationDeadline: timestamp("application_deadline"),
  admissionTestDate: timestamp("admission_test_date"),
  resultDate: timestamp("result_date"),

  eligibility: text("eligibility"),
  gpaRequirement: varchar("gpa_requirement", { length: 100 }),
  applicationFee: varchar("application_fee", { length: 100 }),

  applicationUrl: text("application_url"),
  noticeUrl: text("notice_url"),

  units: jsonb("units"), // e.g. [{ name: "Unit A", subjects: [...] }]
  importantDates: jsonb("important_dates"), // [{ label, date }]
});
