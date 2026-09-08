import { pgTable, serial, varchar, timestamp, integer, text } from "drizzle-orm/pg-core";
import { posts } from "./posts";

export const resultDetails = pgTable("result_details", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id).notNull().unique(),

  resultType: varchar("result_type", { length: 100 }), // ssc | hsc | university | admission | job_exam
  examName: varchar("exam_name", { length: 255 }),
  year: varchar("year", { length: 10 }),

  publishedDate: timestamp("published_date"),

  officialResultUrl: text("official_result_url").notNull(), // never faked, always required
  howToCheck: text("how_to_check"),
  smsMethod: text("sms_method"),
  requiredInformation: text("required_information"), // roll/reg number etc, what user needs to check
});
