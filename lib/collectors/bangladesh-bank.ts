import { SourceAdapter, RawPost, ExtractedPost, fetchHtml } from "./base";

/**
 * TEMPLATE ADAPTER — Bangladesh Bank career notices.
 *
 * NOTE: The CSS selectors below are placeholders. Before using this in
 * production, inspect the real bb.org.bd career/notice page HTML and
 * update `LISTING_URL` + the selectors in `fetchLatest`/`extract`.
 * This file exists to show the *shape* every adapter should follow.
 */

const LISTING_URL = "https://www.bb.org.bd/en/index.php/career/recruitment";

export const bangladeshBankAdapter: SourceAdapter = {
  key: "bangladesh-bank",
  contentType: "job",

  async fetchLatest(): Promise<RawPost[]> {
    const html = await fetchHtml(LISTING_URL);

    // Placeholder parsing — replace with real DOM parsing (e.g. cheerio)
    // once the actual markup is confirmed. Kept dependency-free here so
    // this compiles without extra installs.
    const rows = extractListingRows(html);

    return rows.map((row) => ({
      sourceUrl: row.url,
      title: row.title,
      publishedAt: row.date,
      html: row.rawRowHtml,
    }));
  },

  async extract(raw: RawPost): Promise<ExtractedPost> {
    const detailHtml = await fetchHtml(raw.sourceUrl);
    const { text, attachmentUrls } = parseDetailPage(detailHtml);

    return {
      sourceUrl: raw.sourceUrl,
      title: raw.title,
      publishedAt: raw.publishedAt,
      text,
      attachmentUrls,
    };
  },
};

// --- placeholder parsing helpers -------------------------------------
// Swap these for cheerio-based selectors once real markup is inspected.

function extractListingRows(
  _html: string
): { url: string; title: string; date: Date | null; rawRowHtml: string }[] {
  // TODO: parse with cheerio, e.g.:
  // const $ = cheerio.load(html);
  // $('.notice-list tr').each((_, el) => { ... });
  return [];
}

function parseDetailPage(_html: string): { text: string; attachmentUrls: string[] } {
  // TODO: parse with cheerio — extract main content text + any PDF links
  return { text: "", attachmentUrls: [] };
}
