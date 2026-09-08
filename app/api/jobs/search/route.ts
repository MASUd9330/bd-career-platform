import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, jobDetails, organizations } from "@/db/schema";
import { eq, and, ilike, gte, lte, desc, SQL } from "drizzle-orm";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const category = params.get("category"); // categorySlug
  const district = params.get("district");
  const keyword = params.get("q");
  const minSalary = params.get("minSalary");
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));

  const conditions: (SQL | undefined)[] = [eq(posts.status, "published"), eq(posts.type, "job")];

  if (category) conditions.push(eq(posts.categorySlug, category));
  if (district) conditions.push(ilike(jobDetails.jobLocation, `%${district}%`));
  if (keyword) conditions.push(ilike(posts.title, `%${keyword}%`));
  if (minSalary) conditions.push(gte(jobDetails.salaryMin, parseInt(minSalary, 10)));

  const results = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
      organizationName: organizations.name,
      vacancy: jobDetails.vacancy,
      jobLocation: jobDetails.jobLocation,
      salaryText: jobDetails.salaryText,
      applicationDeadline: jobDetails.applicationDeadline,
    })
    .from(posts)
    .innerJoin(jobDetails, eq(jobDetails.postId, posts.id))
    .leftJoin(organizations, eq(organizations.id, posts.organizationId))
    .where(and(...conditions.filter(Boolean)))
    .orderBy(desc(posts.publishedAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return NextResponse.json({ results, page, pageSize: PAGE_SIZE });
}
