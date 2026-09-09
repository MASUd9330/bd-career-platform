import { db } from "@/lib/db";
import { posts, sources, rawContents, organizations } from "@/db/schema";
import { sql } from "drizzle-orm";
import { writeFileSync } from "fs";

async function dumpStatus() {
  const [sourceCount] = await db.select({ count: sql<number>`count(*)` }).from(sources);
  const [orgCount] = await db.select({ count: sql<number>`count(*)` }).from(organizations);
  const [rawCount] = await db.select({ count: sql<number>`count(*)` }).from(rawContents);
  const postsByStatus = await db
    .select({ status: posts.status, count: sql<number>`count(*)` })
    .from(posts)
    .groupBy(posts.status);

  const recentRaw = await db
    .select({ sourceUrl: rawContents.sourceUrl, fetchedAt: rawContents.fetchedAt, processed: rawContents.processed, error: rawContents.processingError })
    .from(rawContents)
    .orderBy(sql`${rawContents.fetchedAt} desc`)
    .limit(10);

  const recentPosts = await db
    .select({ title: posts.title, status: posts.status, slug: posts.slug })
    .from(posts)
    .orderBy(sql`${posts.createdAt} desc`)
    .limit(10);

  const result = {
    timestamp: new Date().toISOString(),
    sourceCount: sourceCount.count,
    orgCount: orgCount.count,
    rawContentCount: rawCount.count,
    postsByStatus,
    recentRawContents: recentRaw,
    recentPosts,
  };

  writeFileSync("debug-status.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

dumpStatus()
  .then(() => process.exit(0))
  .catch((err) => {
    writeFileSync("debug-status.json", JSON.stringify({ error: String(err) }, null, 2));
    console.error(err);
    process.exit(0); // exit 0 so the workflow can still commit the error file
  });
