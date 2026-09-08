import { JobExtraction } from "@/lib/ai/schemas";

export type PublishDecision = "auto_publish" | "needs_review" | "reject";

export interface ScoreBreakdown {
  score: number;
  decision: PublishDecision;
  reasons: string[];
}

interface ScoringInput {
  extraction: JobExtraction;
  sourceLevel: "official_government" | "official_institution" | "verified_social" | "trusted_secondary" | "news_aggregator";
  isDuplicate: boolean;
  hasConflictingDates: boolean;
}

const SOURCE_LEVEL_POINTS: Record<ScoringInput["sourceLevel"], number> = {
  official_government: 30,
  official_institution: 30,
  verified_social: 15,
  trusted_secondary: 8,
  news_aggregator: 0,
};

export function scoreExtractedContent(input: ScoringInput): ScoreBreakdown {
  const { extraction: e } = input;
  let score = 0;
  const reasons: string[] = [];

  // Source trust
  const sourcePoints = SOURCE_LEVEL_POINTS[input.sourceLevel];
  score += sourcePoints;
  reasons.push(`source level (${input.sourceLevel}): +${sourcePoints}`);

  // Completeness signals
  if (e.applicationDeadline) {
    score += 10;
    reasons.push("valid deadline present: +10");
  }
  if (e.organizationName) {
    score += 10;
    reasons.push("organization identified: +10");
  }
  if (e.applicationUrl) {
    score += 10;
    reasons.push("official application URL present: +10");
  }
  const hasCoreFields = e.vacancy !== null && e.education !== null && e.salaryText !== null;
  if (hasCoreFields) {
    score += 15;
    reasons.push("complete core details (vacancy/education/salary): +15");
  }

  // Penalties
  if (input.isDuplicate) {
    score -= 50;
    reasons.push("duplicate content: -50");
  }
  if (!e.applicationUrl && !e.organizationName) {
    score -= 50;
    reasons.push("missing source/organization identification: -50");
  }
  if (input.hasConflictingDates) {
    score -= 30;
    reasons.push("conflicting dates detected: -30");
  }
  if (e.extractionConfidence === "low") {
    score -= 20;
    reasons.push("AI extraction confidence low: -20");
  } else if (e.extractionConfidence === "medium") {
    score -= 8;
    reasons.push("AI extraction confidence medium: -8");
  }

  let decision: PublishDecision;
  if (score >= 80) decision = "auto_publish";
  else if (score >= 60) decision = "needs_review";
  else decision = "reject";

  return { score, decision, reasons };
}
