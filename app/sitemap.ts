import { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { posts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
const URLS_PER_SITEMAP = 45000; // stay comfortably under Google's 50k limit

/**
 * Next.js only auto-discovers a single sitemap.ts at the root. For a
 * multi-sitemap setup we generate a sitemap index here and serve the
 * per-type chunks from app/sitemaps/[type]/[page]/route.ts (see that file).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const types = ["job", "admission", "result", "exam", "article"] as const;
  const entries: MetadataRoute.Sitemap = [];

  for (const type of types) {
    const [{ count }] = await db
      .select({ count: db.$count(posts, and(eq(posts.type, type), eq(posts.status, "published"))) })
      .from(posts)
      .limit(1)
      .catch(() => [{ count: 0 }]);

    const pageCount = Math.max(1, Math.ceil(count / URLS_PER_SITEMAP));
    for (let page = 1; page <= pageCount; page++) {
      entries.push({
        url: `${SITE_URL}/sitemaps/${type}/${page}.xml`,
        lastModified: new Date(),
      });
    }
  }

  // static/organization sitemap
  entries.push({ url: `${SITE_URL}/sitemaps/organizations/1.xml`, lastModified: new Date() });

  return entries;
}
