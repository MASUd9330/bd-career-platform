import { posts, jobDetails, organizations } from "@/db/schema";

type PostRow = typeof posts.$inferSelect;
type JobDetailsRow = typeof jobDetails.$inferSelect;
type OrganizationRow = typeof organizations.$inferSelect;

/**
 * Builds schema.org JobPosting JSON-LD. Google requires validThrough,
 * datePosted, title, description, and hiringOrganization at minimum for
 * rich results eligibility — this throws early if those are missing so
 * a broken schema never ships silently.
 */
export function buildJobPostingSchema(
  post: PostRow,
  details: JobDetailsRow,
  org: OrganizationRow | null,
  siteUrl: string
) {
  if (!post.publishedAt) {
    throw new Error(`Cannot build JobPosting schema for unpublished post ${post.id}`);
  }

  const isExpired = details.validThrough ? details.validThrough < new Date() : false;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: post.title,
    description: post.content || post.excerpt || post.title,
    datePosted: post.publishedAt.toISOString(),
    hiringOrganization: {
      "@type": "Organization",
      name: org?.name ?? post.sourceName ?? "Unknown",
      sameAs: org?.officialWebsite ?? undefined,
      logo: org?.logoUrl ?? undefined,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: details.jobLocation ?? "Bangladesh",
        addressCountry: "BD",
      },
    },
    identifier: {
      "@type": "PropertyValue",
      name: org?.name ?? post.sourceName ?? "Unknown",
      value: String(post.id),
    },
    url: `${siteUrl}/jobs/${post.slug}`,
  };

  if (details.validThrough) {
    schema.validThrough = details.validThrough.toISOString();
  }
  if (details.employmentType) {
    schema.employmentType = mapEmploymentType(details.employmentType);
  }
  if (details.salaryMin || details.salaryMax) {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "BDT",
      value: {
        "@type": "QuantitativeValue",
        minValue: details.salaryMin ?? undefined,
        maxValue: details.salaryMax ?? undefined,
        unitText: "MONTH",
      },
    };
  }
  if (details.education) {
    schema.educationRequirements = details.education;
  }
  if (details.experience) {
    schema.experienceRequirements = details.experience;
  }

  // Google recommends explicitly marking expired postings so they age
  // out of rich results instead of showing stale "apply now" listings.
  if (isExpired) {
    schema.validThrough = details.validThrough!.toISOString();
  }

  return schema;
}

function mapEmploymentType(type: string): string {
  const map: Record<string, string> = {
    full_time: "FULL_TIME",
    contractual: "CONTRACTOR",
    internship: "INTERN",
    part_time: "PART_TIME",
    temporary: "TEMPORARY",
  };
  return map[type] ?? "OTHER";
}
