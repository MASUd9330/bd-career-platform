import { db } from "@/lib/db";
import { posts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
const PAGE_SIZE = 45000;

const TYPE_TO_PATH: Record<string, string> = {
  job: "jobs",
  admission: "admission",
  result: "results",
  exam: "exam",
  article: "career",
};

export async function GET(
  _req: Request,
  { params }: { params: { type: string; page: string } }
) {
  const type = params.type;
  const page = parseInt(params.page, 10) || 1;
  const path = TYPE_TO_PATH[type];

  if (!path) {
    return new Response("Not found", { status: 404 });
  }

  const rows = await db
    .select({ slug: posts.slug, updatedAt: posts.updatedAt })
    .from(posts)
    .where(and(eq(posts.type, type as any), eq(posts.status, "published")))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const urls = rows
    .map(
      (r) => `
  <url>
    <loc>${SITE_URL}/${path}/${r.slug}</loc>
    <lastmod>${r.updatedAt.toISOString()}</lastmod>
  </url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
