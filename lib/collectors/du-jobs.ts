import * as cheerio from "cheerio";
import { SourceAdapter, RawPost, ExtractedPost, fetchHtml } from "./base";

/**
 * University of Dhaka Job Portal (jobs.du.ac.bd).
 *
 * Structure notes (verified against live site, Sept 2026):
 * - Homepage lists job cards, each linking to /job_details/{id}
 * - Each detail page has labelled fields: Office, Pay Scale, Deadline,
 *   Job Type, a "Job Details" text block, and a circular PDF link.
 * - No robots.txt restriction observed on / or /job_details/*.
 *
 * This adapter uses label-based text extraction rather than brittle
 * CSS class selectors, since exact class names can change with site
 * updates but the visible labels (Office/Pay Scale/Deadline/etc.) are
 * more stable UI text.
 */

const BASE_URL = "https://jobs.du.ac.bd";

export const duJobsAdapter: SourceAdapter = {
  key: "du-jobs",
  contentType: "job",

  async fetchLatest(): Promise<RawPost[]> {
    const html = await fetchHtml(BASE_URL);
    const $ = cheerio.load(html);

    const seen = new Set<string>();
    const posts: RawPost[] = [];

    $("a[href*='/job_details/']").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      const match = href.match(/job_details\/(\d+)/);
      if (!match) return;
      const id = match[1];
      if (seen.has(id)) return;
      seen.add(id);

      // Title is usually the link text itself, or the nearest heading
      const linkText = $(el).text().trim();
      const headingText = $(el).closest("article, .job-card, div").find("h1,h2,h3,h4,h5,h6").first().text().trim();
      const title = headingText || linkText || `Job ${id}`;

      posts.push({
        sourceUrl: `${BASE_URL}/job_details/${id}`,
        title,
        publishedAt: null, // resolved more reliably in extract() from the detail page
        html: "",
      });
    });

    // Only fetch the most recent ~30 to avoid re-processing the entire archive every run
    return posts.slice(0, 30);
  },

  async extract(raw: RawPost): Promise<ExtractedPost> {
    const html = await fetchHtml(raw.sourceUrl);
    const $ = cheerio.load(html);

    const pageText = $("body").text().replace(/\s+/g, " ").trim();

    const title = $("h1,h2,h3,h4,h5,h6").first().text().trim() || raw.title;

    // Circular PDF attachment
    const attachmentUrls: string[] = [];
    $("a[href$='.pdf']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) attachmentUrls.push(href.startsWith("http") ? href : `${BASE_URL}${href}`);
    });

    // "Job Details" section — the long descriptive paragraph
    let jobDetailsText = "";
    const detailsHeading = $("*").filter((_, el) => $(el).text().trim() === "Job Details").first();
    if (detailsHeading.length) {
      jobDetailsText = detailsHeading.nextAll().first().text().trim();
    }
    if (!jobDetailsText) {
      // Fallback: grab the longest paragraph on the page
      let longest = "";
      $("p").each((_, el) => {
        const t = $(el).text().trim();
        if (t.length > longest.length) longest = t;
      });
      jobDetailsText = longest;
    }

    const publishedMatch = pageText.match(/Published:\s*([\d-]{10})/);
    const publishedAt = publishedMatch ? new Date(publishedMatch[1]) : raw.publishedAt;

    // Build a clean text blob for Gemini — label lines + full details paragraph
    const officeMatch = pageText.match(/Office\s+([^\n]+?)(?=Pay Scale|Deadline|Job Type|$)/);
    const payScaleMatch = pageText.match(/Pay Scale\s*([^\n]+?)(?=Deadline|Job Type|Office|$)/);
    const deadlineMatch = pageText.match(/Deadline\s*([\d-]{10})/);
    const jobTypeMatch = pageText.match(/Job Type\s*([A-Za-z\s]+?)(?=Download|Office|Pay Scale|$)/);

    const structuredSummary = [
      `Title: ${title}`,
      officeMatch ? `Office: ${officeMatch[1].trim()}` : "",
      payScaleMatch ? `Pay Scale: ${payScaleMatch[1].trim()}` : "",
      deadlineMatch ? `Deadline: ${deadlineMatch[1].trim()}` : "",
      jobTypeMatch ? `Job Type: ${jobTypeMatch[1].trim()}` : "",
      "",
      "Job Details:",
      jobDetailsText,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      sourceUrl: raw.sourceUrl,
      title,
      publishedAt,
      text: structuredSummary,
      attachmentUrls,
    };
  },
};
