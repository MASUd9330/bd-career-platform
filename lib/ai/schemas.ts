import { z } from "zod";

/**
 * Gemini must return exactly this shape (via responseSchema / structured
 * output mode). Anything it can't find in the source text must be `null`
 * — the prompt explicitly forbids inventing facts, and this schema makes
 * every field optional/nullable so Gemini isn't pressured to fill gaps.
 */
export const jobExtractionSchema = z.object({
  title: z.string(),
  seoTitle: z.string(),
  metaDescription: z.string().max(160),
  summary: z.string(), // 2-3 sentence plain summary
  introduction: z.string(), // short intro paragraph, Bangla

  organizationName: z.string().nullable(),
  vacancy: z.number().nullable(),
  employmentType: z.string().nullable(),
  jobLocation: z.string().nullable(),

  education: z.string().nullable(),
  experience: z.string().nullable(),
  ageLimit: z.string().nullable(),

  salaryText: z.string().nullable(),

  applicationStart: z.string().nullable(), // ISO date string or null
  applicationDeadline: z.string().nullable(),
  applicationMethod: z.string().nullable(),
  applicationUrl: z.string().nullable(),

  importantDates: z.array(z.object({ label: z.string(), date: z.string().nullable() })),
  requirements: z.array(z.string()),
  applicationProcess: z.array(z.string()),
  importantNotes: z.array(z.string()),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })),

  slug: z.string(),
  keywords: z.array(z.string()),

  /** Gemini's own confidence flag — low confidence routes to manual review regardless of score. */
  extractionConfidence: z.enum(["high", "medium", "low"]),
});

export type JobExtraction = z.infer<typeof jobExtractionSchema>;
