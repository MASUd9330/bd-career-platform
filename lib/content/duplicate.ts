import { createHash } from "crypto";
import { db } from "@/lib/db";
import { rawContents, posts } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

/** Normalize text before hashing so trivial whitespace/case diffs don't create false-new content. */
function normalizeForHash(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\u0980-\u09FF\s]/g, "") // keep Bangla unicode range + word chars
    .trim();
}

export function hashContent(text: string): string {
  return createHash("sha256").update(normalizeForHash(text)).digest("hex");
}

/**
 * Checks whether this exact content (by hash) was already ingested from
 * any source in the last N days. Returns the existing raw_contents row
 * id if found, or null if this is genuinely new.
 */
export async function findDuplicateByHash(
  contentHash: string,
  withinDays = 90
): Promise<number | null> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - withinDays);

  const existing = await db
    .select({ id: rawContents.id })
    .from(rawContents)
    .where(and(eq(rawContents.contentHash, contentHash), gte(rawContents.fetchedAt, cutoff)))
    .limit(1);

  return existing[0]?.id ?? null;
}

/**
 * Softer duplicate check for when two different official sources publish
 * the same circular (e.g. a ministry site + the hiring org's own site).
 * Matches on normalized title + organization + deadline proximity rather
 * than exact hash, since wording can differ slightly between mirrors.
 */
export async function findLikelyDuplicatePost(params: {
  normalizedTitle: string;
  organizationId: number | null;
  applicationDeadline: Date | null;
}): Promise<number | null> {
  if (!params.organizationId) return null;

  const candidates = await db
    .select({ id: posts.id, title: posts.title })
    .from(posts)
    .where(eq(posts.organizationId, params.organizationId))
    .limit(50);

  const target = normalizeForHash(params.normalizedTitle);
  for (const c of candidates) {
    const candidateNorm = normalizeForHash(c.title);
    if (titleSimilarity(target, candidateNorm) > 0.85) {
      return c.id;
    }
  }
  return null;
}

/** Simple token-overlap similarity — good enough as a first pass; swap for a proper library if needed. */
function titleSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(" "));
  const setB = new Set(b.split(" "));
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}
