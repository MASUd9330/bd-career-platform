/**
 * Every source (BPSC, Bangladesh Bank, DU, Railway, etc.) implements this
 * interface. Keeping it uniform means adding source #50 doesn't touch
 * anything outside lib/collectors/.
 */

export interface RawPost {
  sourceUrl: string;
  title: string;
  publishedAt: Date | null;
  html: string; // raw fetched HTML of the listing entry or detail page
}

export interface ExtractedPost {
  sourceUrl: string;
  title: string;
  publishedAt: Date | null;
  text: string; // cleaned plain text, ready for Gemini
  attachmentUrls: string[]; // PDFs/circulars found on the page
}

export interface SourceAdapter {
  /** Unique key matching the `adapterKey` column in the `sources` table. */
  key: string;

  /** What kind of posts this source produces. */
  contentType: "job" | "admission" | "result" | "exam" | "notice";

  /** Fetch the latest listing page(s) and return lightweight raw entries. */
  fetchLatest(): Promise<RawPost[]>;

  /** Given a raw post, fetch full detail page (if needed) and extract clean text. */
  extract(raw: RawPost): Promise<ExtractedPost>;
}

/**
 * Shared fetch helper — every adapter should go through this so we get
 * consistent timeouts, user-agent, and error handling in one place.
 */
export async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BDCareerPlatformBot/1.0; +https://example.com/bot)",
      },
    });
    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}
