import { posts, jobDetails } from "@/db/schema";

const PAGE_ID = process.env.FACEBOOK_PAGE_ID!;
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
const GRAPH_API_VERSION = "v21.0";

function formatFacebookMessage(
  post: typeof posts.$inferSelect,
  details: typeof jobDetails.$inferSelect | null
): string {
  const lines = [post.title, ""];
  if (details?.vacancy != null) lines.push(`পদসংখ্যা: ${details.vacancy}`);
  if (details?.education) lines.push(`যোগ্যতা: ${details.education}`);
  if (details?.applicationDeadline) {
    lines.push(`আবেদনের শেষ তারিখ: ${details.applicationDeadline.toLocaleDateString("en-GB")}`);
  }
  lines.push("", `বিস্তারিত: ${SITE_URL}/jobs/${post.slug}`);
  return lines.join("\n");
}

/** Called right after a post is auto-published or approved from review. */
export async function postToFacebook(
  post: typeof posts.$inferSelect,
  details: typeof jobDetails.$inferSelect | null
): Promise<{ success: boolean; error?: string }> {
  if (!PAGE_ID || !PAGE_ACCESS_TOKEN) {
    return { success: false, error: "Facebook page credentials not configured" };
  }

  const message = formatFacebookMessage(post, details);
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PAGE_ID}/feed`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        link: `${SITE_URL}/jobs/${post.slug}`,
        access_token: PAGE_ACCESS_TOKEN,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, error: `Facebook API error: ${res.status} ${errBody}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
