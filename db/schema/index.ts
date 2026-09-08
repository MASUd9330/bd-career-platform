import { relations } from "drizzle-orm";
import { posts } from "./posts";
import { jobDetails } from "./jobDetails";
import { admissionDetails } from "./admissionDetails";
import { resultDetails } from "./resultDetails";
import { organizations } from "./organizations";
import { sources, rawContents } from "./sources";

export * from "./organizations";
export * from "./sources";
export * from "./posts";
export * from "./jobDetails";
export * from "./admissionDetails";
export * from "./resultDetails";
export * from "./alerts";

export const postsRelations = relations(posts, ({ one }) => ({
  organization: one(organizations, {
    fields: [posts.organizationId],
    references: [organizations.id],
  }),
  source: one(sources, {
    fields: [posts.sourceId],
    references: [sources.id],
  }),
  jobDetails: one(jobDetails, {
    fields: [posts.id],
    references: [jobDetails.postId],
  }),
  admissionDetails: one(admissionDetails, {
    fields: [posts.id],
    references: [admissionDetails.postId],
  }),
  resultDetails: one(resultDetails, {
    fields: [posts.id],
    references: [resultDetails.postId],
  }),
}));

export const sourcesRelations = relations(sources, ({ many, one }) => ({
  rawContents: many(rawContents),
  organization: one(organizations, {
    fields: [sources.organizationId],
    references: [organizations.id],
  }),
}));

export const rawContentsRelations = relations(rawContents, ({ one }) => ({
  source: one(sources, {
    fields: [rawContents.sourceId],
    references: [sources.id],
  }),
}));
