import { db } from "@/lib/db";
import { organizations, sources } from "@/db/schema";
import { eq } from "drizzle-orm";

async function seed() {
  let [org] = await db.select().from(organizations).where(eq(organizations.slug, "university-of-dhaka")).limit(1);
  if (!org) {
    [org] = await db
      .insert(organizations)
      .values({
        name: "University of Dhaka",
        nameBangla: "ঢাকা বিশ্ববিদ্যালয়",
        slug: "university-of-dhaka",
        type: "university",
        officialWebsite: "https://www.du.ac.bd",
      })
      .returning();
    console.log("Created organization: University of Dhaka");
  } else {
    console.log("Organization already exists: University of Dhaka");
  }

  const [existingSource] = await db.select().from(sources).where(eq(sources.adapterKey, "du-jobs")).limit(1);
  if (!existingSource) {
    await db.insert(sources).values({
      name: "University of Dhaka Job Portal",
      organizationId: org.id,
      baseUrl: "https://jobs.du.ac.bd",
      level: "official_institution",
      adapterKey: "du-jobs",
      isActive: true,
    });
    console.log("Created source: du-jobs");
  } else {
    console.log("Source already exists: du-jobs");
  }

  console.log("Seed complete.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
