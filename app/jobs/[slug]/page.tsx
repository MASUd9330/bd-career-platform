import { db } from "@/lib/db";
import { posts, jobDetails, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { buildJobPostingSchema } from "@/lib/seo/schema";
import { buildBreadcrumbSchema } from "@/lib/seo/article-schema";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

async function getJobPost(slug: string) {
  const [post] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
  if (!post || post.type !== "job") return null;

  const [details] = await db.select().from(jobDetails).where(eq(jobDetails.postId, post.id)).limit(1);
  const org = post.organizationId
    ? (await db.select().from(organizations).where(eq(organizations.id, post.organizationId)).limit(1))[0]
    : null;

  return { post, details, org: org ?? null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getJobPost(slug);
  if (!data) return {};

  return {
    title: data.post.seoTitle ?? data.post.title,
    description: data.post.seoDescription ?? data.post.excerpt ?? undefined,
    alternates: { canonical: data.post.canonicalUrl ?? `${SITE_URL}/jobs/${data.post.slug}` },
    openGraph: {
      title: data.post.seoTitle ?? data.post.title,
      description: data.post.seoDescription ?? undefined,
      images: data.post.featuredImage ? [data.post.featuredImage] : undefined,
    },
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getJobPost(slug);
  if (!data || data.post.status === "rejected" || data.post.status === "draft") {
    notFound();
  }

  const { post, details, org } = data;
  const isExpired = post.status === "expired" || (details?.validThrough && details.validThrough < new Date());

  const jsonLd = details ? buildJobPostingSchema(post, details, org, SITE_URL) : null;
  const breadcrumbLd = buildBreadcrumbSchema([
    { name: "Home", url: SITE_URL },
    { name: "Jobs", url: `${SITE_URL}/jobs` },
    { name: post.title, url: `${SITE_URL}/jobs/${post.slug}` },
  ]);

  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <nav className="text-sm text-gray-500 mb-4">
        <a href="/">Home</a> / <a href="/jobs">Jobs</a> / {post.title}
      </nav>

      <h1 className="text-2xl font-bold mb-2">{post.title}</h1>

      <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <span>Last updated: {post.updatedAt.toLocaleDateString("en-GB")}</span>
        {post.sourceUrl && (
          <span className="inline-flex items-center gap-1 text-green-700">
            ✓ Official Source Verified
          </span>
        )}
      </div>

      {isExpired && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 mb-6">
          এই চাকরির আবেদনের সময়সীমা শেষ হয়েছে।
        </div>
      )}

      {details && (
        <section className="bg-gray-50 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3 text-sm">
          {org?.name && <Info label="Organization" value={org.name} />}
          {details.vacancy != null && <Info label="Vacancy" value={String(details.vacancy)} />}
          {details.education && <Info label="Qualification" value={details.education} />}
          {details.salaryText && <Info label="Salary" value={details.salaryText} />}
          {details.applicationDeadline && (
            <Info label="Deadline" value={details.applicationDeadline.toLocaleDateString("en-GB")} />
          )}
          {details.jobLocation && <Info label="Location" value={details.jobLocation} />}
        </section>
      )}

      {!isExpired && details?.applicationUrl && (
        <a
          href={details.applicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-600 text-white px-5 py-2 rounded-md mb-6"
        >
          Apply Online
        </a>
      )}

      <div className="prose max-w-none mb-8" dangerouslySetInnerHTML={{ __html: post.content ?? "" }} />

      <footer className="border-t pt-4 mt-8 text-sm text-gray-500">
        <p>Information Source: {post.sourceName}</p>
        {post.sourcePublishedAt && <p>Official Publication: {post.sourcePublishedAt.toLocaleDateString("en-GB")}</p>}
        <p>
          <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
            Visit Official Website
          </a>
        </p>
        <p>Last Verified: {post.updatedAt.toLocaleDateString("en-GB")}</p>
      </footer>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
