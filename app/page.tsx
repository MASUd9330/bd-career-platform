import { db } from "@/lib/db";
import { posts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export default async function HomePage() {
  const latestJobs = await db
    .select({ id: posts.id, title: posts.title, slug: posts.slug })
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt))
    .limit(10)
    .catch(() => []); // tolerate empty DB on first deploy

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        {process.env.NEXT_PUBLIC_SITE_NAME ?? "BD Career Platform"}
      </h1>
      <p className="text-gray-600 mb-8">বাংলাদেশের সর্বশেষ চাকরি, ভর্তি ও ফলাফল এক জায়গায়</p>

      <h2 className="text-xl font-semibold mb-4">Latest Jobs</h2>
      {latestJobs.length === 0 ? (
        <p className="text-gray-500">No jobs published yet — run the crawl pipeline to populate the site.</p>
      ) : (
        <ul className="space-y-3">
          {latestJobs.map((job) => (
            <li key={job.id}>
              <a href={`/jobs/${job.slug}`} className="text-blue-600 hover:underline">
                {job.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
