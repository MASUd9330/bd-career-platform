import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, jobDetails, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\u0980-\u09FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    title,
    organizationName,
    vacancy,
    education,
    jobLocation,
    salaryText,
    applicationDeadline,
    applicationUrl,
    sourceUrl,
    excerpt,
  } = body;

  if (!title || !organizationName || !sourceUrl) {
    return NextResponse.json(
      { error: "title, organizationName and sourceUrl are required" },
      { status: 400 }
    );
  }

  // Find or create the organization
  const orgSlug = slugify(organizationName);
  let [org] = await db.select().from(organizations).where(eq(organizations.slug, orgSlug)).limit(1);
  if (!org) {
    [org] = await db
      .insert(organizations)
      .values({ name: organizationName, slug: orgSlug, type: "government" })
      .returning();
  }

  // Make the post slug unique by appending a short suffix if needed
  let slug = slugify(title);
  const [existing] = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug)).limit(1);
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const deadline = applicationDeadline ? new Date(applicationDeadline) : null;

  const [post] = await db
    .insert(posts)
    .values({
      type: "job",
      title,
      slug,
      excerpt: excerpt || null,
      content: excerpt || null,
      organizationId: org.id,
      status: "published",
      publishedAt: new Date(),
      sourceUrl,
      sourceName: organizationName,
      aiGenerated: false,
      seoTitle: title,
      seoDescription: excerpt || null,
    })
    .returning();

  await db.insert(jobDetails).values({
    postId: post.id,
    vacancy: vacancy ? parseInt(vacancy, 10) : null,
    education: education || null,
    jobLocation: jobLocation || null,
    salaryText: salaryText || null,
    applicationDeadline: deadline,
    applicationUrl: applicationUrl || null,
    validThrough: deadline,
  });

  return NextResponse.json({ success: true, slug: post.slug });
}
