import { posts, organizations } from "@/db/schema";

type PostRow = typeof posts.$inferSelect;
type OrganizationRow = typeof organizations.$inferSelect;

/** Used for admission/result/article posts — job posts should use buildJobPostingSchema instead. */
export function buildArticleSchema(post: PostRow, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? post.seoDescription ?? undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    image: post.featuredImage ?? undefined,
    url: `${siteUrl}/${typeToPath(post.type)}/${post.slug}`,
  };
}

export function buildBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildOrganizationSchema(org: OrganizationRow, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name,
    url: org.officialWebsite ?? `${siteUrl}/organization/${org.slug}`,
    logo: org.logoUrl ?? undefined,
    sameAs: org.officialWebsite ? [org.officialWebsite] : undefined,
  };
}

function typeToPath(type: PostRow["type"]): string {
  const map: Record<PostRow["type"], string> = {
    job: "jobs",
    admission: "admission",
    result: "results",
    exam: "exam",
    notice: "notice",
    article: "career",
  };
  return map[type];
}
