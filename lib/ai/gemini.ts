import { GoogleGenerativeAI } from "@google/generative-ai";
import { jobExtractionSchema, JobExtraction } from "./schemas";
import { JOB_EXTRACTION_SYSTEM_PROMPT, buildJobExtractionPrompt } from "./prompts";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Convert the Zod schema's shape into a Gemini responseSchema-compatible
// JSON schema. Kept minimal/manual here rather than pulling in a
// zod-to-json-schema dependency, since the shape is small and stable.
const jobResponseSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    seoTitle: { type: "string" },
    metaDescription: { type: "string" },
    summary: { type: "string" },
    introduction: { type: "string" },
    organizationName: { type: "string", nullable: true },
    vacancy: { type: "number", nullable: true },
    employmentType: { type: "string", nullable: true },
    jobLocation: { type: "string", nullable: true },
    education: { type: "string", nullable: true },
    experience: { type: "string", nullable: true },
    ageLimit: { type: "string", nullable: true },
    salaryText: { type: "string", nullable: true },
    applicationStart: { type: "string", nullable: true },
    applicationDeadline: { type: "string", nullable: true },
    applicationMethod: { type: "string", nullable: true },
    applicationUrl: { type: "string", nullable: true },
    importantDates: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, date: { type: "string", nullable: true } },
        required: ["label", "date"],
      },
    },
    requirements: { type: "array", items: { type: "string" } },
    applicationProcess: { type: "array", items: { type: "string" } },
    importantNotes: { type: "array", items: { type: "string" } },
    faq: {
      type: "array",
      items: {
        type: "object",
        properties: { question: { type: "string" }, answer: { type: "string" } },
        required: ["question", "answer"],
      },
    },
    slug: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
    extractionConfidence: { type: "string", enum: ["high", "medium", "low"] },
  },
  required: [
    "title", "seoTitle", "metaDescription", "summary", "introduction",
    "organizationName", "vacancy", "employmentType", "jobLocation",
    "education", "experience", "ageLimit", "salaryText",
    "applicationStart", "applicationDeadline", "applicationMethod", "applicationUrl",
    "importantDates", "requirements", "applicationProcess", "importantNotes", "faq",
    "slug", "keywords", "extractionConfidence",
  ],
};

export async function extractJobPosting(params: {
  sourceTitle: string;
  sourceText: string;
  sourceUrl: string;
}): Promise<{ data: JobExtraction | null; error: string | null }> {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    systemInstruction: JOB_EXTRACTION_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: jobResponseSchema as any,
      temperature: 0.2, // low temperature — this is extraction, not creative writing
    },
  });

  try {
    const result = await model.generateContent(buildJobExtractionPrompt(params));
    const rawJson = result.response.text();
    const parsed = JSON.parse(rawJson);

    // Zod re-validation on top of Gemini's own schema conformance —
    // schema-conforming JSON can still be semantically wrong, so we
    // validate again app-side rather than trusting the model output blindly.
    const validated = jobExtractionSchema.safeParse(parsed);
    if (!validated.success) {
      return { data: null, error: `Schema validation failed: ${validated.error.message}` };
    }

    return { data: validated.data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown Gemini error" };
  }
}
