import { db } from "@/lib/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";

async function approveAll() {
  const pending = await db.select({ id: posts.id, title: posts.title }).from(posts).where(eq(posts.status, "needs_review"));
  console.log(`Approving ${pending.length} posts...`);

  for (const p of pending) {
    await db.update(posts).set({ status: "published", publishedAt: new Date() }).where(eq(posts.id, p.id));
    console.log(`  Published: ${p.title}`);
  }

  console.log("Done.");
}

approveAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
