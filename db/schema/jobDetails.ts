import { pgTable, serial, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { posts } from "./posts";

export const jobDetails = pgTable("job_details", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id).notNull().unique(),

  vacancy: integer("vacancy"),
  employmentType: varchar("employment_type", { length: 50 }), // full_time | contractual | internship
  jobLocation: varchar("job_location", { length: 255 }),

  education: text("education"),
  experience: text("experience"),
  ageLimit: varchar("age_limit", { length: 100 }),

  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryText: varchar("salary_text", { length: 255 }), // fallback for non-numeric pay scales

  applicationStart: timestamp("application_start"),
  applicationDeadline: timestamp("application_deadline"),

  applicationMethod: varchar("application_method", { length: 100 }), // online | postal | in_person
  applicationUrl: text("application_url"),
  officialNoticeUrl: text("official_notice_url"),

  validThrough: timestamp("valid_through"), // mirrors JobPosting schema.org field
});
