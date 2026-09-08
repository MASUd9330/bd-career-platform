import { db } from "@/lib/db";
import { sources, rawContents, posts, jobDetails } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAdapter } from "@/lib/collectors/registry";
import { hashContent, findDuplicateByHash, findLikelyDuplicatePost } from "@/lib/content/duplicate";
import { extractJobPosting } from "@/lib/ai/gemini";
import { scoreExtractedContent } from "@/lib/content/scoring";
import { broadcastNewPost } from "@/lib/alerts/telegram";
import { postToFacebook } from "@/lib/alerts/facebook";

/**
 * Run with: npm run collect
 * Intended to be triggered by a GitHub Actions cron (see .github/workflows/crawl.yml)
 */
async function runCrawl() {
  const activeSources = await db.select().from(sources).where(eq(sources.isActive, true));

  for (const source of activeSources) {
    console.log(`\n--- Crawling: ${source.name} (${source.adapterKey}) ---`);
    try {
      const adapter = getAdapter(source.adapterKey);
      const rawPosts = await adapter.fetchLatest();
      console.log(`Found ${rawPosts.length} entries`);

      for (const rawPost of rawPosts) {
        await processOneEntry(source, adapter, rawPost);
      }

      await db
        .update(sources)
        .set({ lastCrawledAt: new Date(), lastSuccessAt: new Date(), consecutiveFailures: 0 })
        .where(eq(sources.id, source.id));
    } catch (err) {
      console.error(`Source ${source.name} failed:`, err);
      await db
        .update(sources)
        .set({
          lastCrawledAt: new Date(),
          consecutiveFailures: source.consecutiveFailures + 1,
        })
        .where(eq(sources.id, source.id));
    }
  }
}

async function processOneEntry(
  source: typeof sources.$inferSelect,
  adapter: ReturnType<typeof getAdapter>,
  rawPost: Awaited<ReturnType<typeof adapter.fetchLatest>>[number]
) {
  const extracted = await adapter.extract(rawPost);
  const contentHash = hashContent(extracted.text);

  // Step 1: exact duplicate check via hash
  const dupRawId = await findDuplicateByHash(contentHash);
  if (dupRawId) {
    console.log(`  Skipping duplicate (hash match): ${extracted.title}`);
    return;
  }

  // Persist raw content for audit trail, regardless of what happens next
  await db.insert(rawContents).values({
    sourceId: source.id,
    sourceUrl: extracted.sourceUrl,
    extractedText: extracted.text,
    contentHash,
  });

  if (adapter.contentType !== "job") {
    console.log(`  Content type "${adapter.contentType}" pipeline not wired yet — raw content saved only.`);
    return;
  }

  // Step 2: Gemini structured extraction (job pipeline)
  const { data: extraction, error } = await extractJobPosting({
    sourceTitle: extracted.title,
    sourceText: extracted.text,
    sourceUrl: extracted.sourceUrl,
  });

  if (!extraction) {
    console.error(`  Gemini extraction failed: ${error}`);
    return;
  }

  // Step 3: fuzzy duplicate check by title/org (catches mirrors across sources)
  const likelyDupPostId = await findLikelyDuplicatePost({
    normalizedTitle: extraction.title,
    organizationId: null, // TODO: resolve organizationId from extraction.organizationName
    applicationDeadline: extraction.applicationDeadline ? new Date(extraction.applicationDeadline) : null,
  });

  // Step 4: score and decide
  const { score, decision, reasons } = scoreExtractedContent({
    extraction,
    sourceLevel: source.level,
    isDuplicate: Boolean(likelyDupPostId),
    hasConflictingDates: false, // TODO: cross-check dates against source text
  });

  console.log(`  Score: ${score} -> ${decision}`);
  reasons.forEach((r) => console.log(`    ${r}`));

  if (decision === "reject") {
    console.log("  Rejected — not saved as a post.");
    return;
  }

  const status = decision === "auto_publish" ? "published" : "needs_review";

  const [insertedPost] = await db
    .insert(posts)
    .values({
      type: "job",
      title: extraction.title,
      slug: extraction.slug,
      excerpt: extraction.summary,
      content: extraction.introduction,
      status,
      publishedAt: status === "published" ? new Date() : null,
      sourceId: source.id,
      sourceUrl: extracted.sourceUrl,
      sourceName: source.name,
      sourcePublishedAt: extracted.publishedAt,
      originalHash: contentHash,
      aiGenerated: true,
      aiModel: "gemini-2.0-flash",
      qualityScore: score,
      seoTitle: extraction.seoTitle,
      seoDescription: extraction.metaDescription,
    })
    .returning({ id: posts.id });

  await db.insert(jobDetails).values({
    postId: insertedPost.id,
    vacancy: extraction.vacancy,
    employmentType: extraction.employmentType,
    education: extraction.education,
    experience: extraction.experience,
    ageLimit: extraction.ageLimit,
    salaryText: extraction.salaryText,
    applicationStart: extraction.applicationStart ? new Date(extraction.applicationStart) : null,
    applicationDeadline: extraction.applicationDeadline ? new Date(extraction.applicationDeadline) : null,
    applicationMethod: extraction.applicationMethod,
    applicationUrl: extraction.applicationUrl,
    validThrough: extraction.applicationDeadline ? new Date(extraction.applicationDeadline) : null,
  });

  console.log(`  Saved as post #${insertedPost.id} (${status})`);

  // Only broadcast auto-published posts immediately — needs_review posts
  // get broadcast later, from the admin panel, once a human approves them.
  if (status === "published") {
    const [fullPost] = await db.select().from(posts).where(eq(posts.id, insertedPost.id)).limit(1);
    const [fullJobDetails] = await db
      .select()
      .from(jobDetails)
      .where(eq(jobDetails.postId, insertedPost.id))
      .limit(1);

    await broadcastNewPost(fullPost, fullJobDetails ?? null).catch((err) =>
      console.error("  Telegram broadcast failed:", err)
    );

    const fbResult = await postToFacebook(fullPost, fullJobDetails ?? null);
    if (!fbResult.success) {
      console.error("  Facebook post failed:", fbResult.error);
    }
  }
}

runCrawl()
  .then(() => {
    console.log("\nCrawl complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Crawl failed:", err);
    process.exit(1);
  });
