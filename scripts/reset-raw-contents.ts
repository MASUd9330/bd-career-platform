import { db } from "@/lib/db";
import { rawContents } from "@/db/schema";
import { sql } from "drizzle-orm";

async function reset() {
  await db.delete(rawContents);
  console.log("raw_contents cleared.");
}

reset()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
