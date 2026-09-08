import { db } from "@/lib/db";
import { posts, jobDetails } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { notifyJobExpired } from "@/lib/seo/indexing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

/**
 * Run with: npm run expire:jobs
 * Marks published jobs whose validThrough has passed as "expired".
 * Pages are NOT deleted — they stay live showing "application closed"
 * plus related active jobs, which keeps their SEO/internal-linking value.
 */
async function expireJobs() {
  const now = new Date();

  const expiring = await db
    .select({ postId: posts.id, slug: posts.slug })
    .from(posts)
    .innerJoin(jobDetails, eq(jobDetails.postId, posts.id))
    .where(
      and(
        eq(posts.status, "published"),
        eq(posts.type, "job"),
        lt(jobDetails.validThrough, now)
      )
    );

  console.log(`Found ${expiring.length} jobs to expire`);

  for (const job of expiring) {
    await db.update(posts).set({ status: "expired", updatedAt: now }).where(eq(posts.id, job.postId));

    try {
      await notifyJobExpired(`${SITE_URL}/jobs/${job.slug}`);
      console.log(`  Expired + notified: ${job.slug}`);
    } catch (err) {
      // Don't let an indexing API hiccup block the DB update — log and continue
      console.error(`  Indexing notification failed for ${job.slug}:`, err);
    }
  }

  console.log("Expiry run complete.");
}

expireJobs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Expire script failed:", err);
    process.exit(1);
  });
