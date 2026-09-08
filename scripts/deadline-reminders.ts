import { db } from "@/lib/db";
import { posts, jobDetails, alertSubscriptions, alertDeliveries, savedJobs } from "@/db/schema";
import { eq, and, gte, lte, notInArray } from "drizzle-orm";

const REMINDER_WINDOW_DAYS = 3; // remind when deadline is within 3 days
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

/**
 * Run with: tsx scripts/deadline-reminders.ts (add to package.json + a
 * daily GitHub Actions workflow the same way as expire.yml)
 */
async function sendDeadlineReminders() {
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + REMINDER_WINDOW_DAYS);

  const closingSoon = await db
    .select({ post: posts, details: jobDetails })
    .from(posts)
    .innerJoin(jobDetails, eq(jobDetails.postId, posts.id))
    .where(
      and(
        eq(posts.status, "published"),
        gte(jobDetails.applicationDeadline, now),
        lte(jobDetails.applicationDeadline, windowEnd)
      )
    );

  console.log(`${closingSoon.length} jobs closing within ${REMINDER_WINDOW_DAYS} days`);

  for (const { post, details } of closingSoon) {
    // Remind everyone who saved this specific job (device-token based, no email needed)
    const savers = await db.select().from(savedJobs).where(eq(savedJobs.postId, post.id));
    console.log(`  "${post.title}" saved by ${savers.length} devices — reminder would surface in-app for these`);
    // NOTE: since saved jobs are anonymous device tokens (no email/telegram
    // attached), delivery for these happens client-side (push notification
    // or in-app badge) rather than server-initiated — see savedJobs schema comment.

    // Remind telegram subscribers who haven't already been reminded for this post
    const alreadyNotified = await db
      .select({ subscriptionId: alertDeliveries.subscriptionId })
      .from(alertDeliveries)
      .where(and(eq(alertDeliveries.postId, post.id), eq(alertDeliveries.deliveryType, "deadline_reminder")));

    const alreadyNotifiedIds = alreadyNotified.map((r) => r.subscriptionId);

    const subs = await db
      .select()
      .from(alertSubscriptions)
      .where(
        and(
          eq(alertSubscriptions.channel, "telegram"),
          eq(alertSubscriptions.isActive, true),
          alreadyNotifiedIds.length ? notInArray(alertSubscriptions.id, alreadyNotifiedIds) : undefined
        )
      );

    for (const sub of subs) {
      if (!sub.telegramChatId) continue;
      try {
        await sendReminder(sub.telegramChatId, post, details);
        await db.insert(alertDeliveries).values({
          subscriptionId: sub.id,
          postId: post.id,
          deliveryType: "deadline_reminder",
        });
      } catch (err) {
        console.error(`  Reminder failed for subscriber ${sub.id}:`, err);
      }
    }
  }
}

async function sendReminder(
  chatId: string,
  post: typeof posts.$inferSelect,
  details: typeof jobDetails.$inferSelect
) {
  const daysLeft = Math.ceil(
    (details.applicationDeadline!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const text = `⏰ Reminder: "${post.title}" এর আবেদনের শেষ তারিখ আর ${daysLeft} দিন বাকি।\n\n${SITE_URL}/jobs/${post.slug}`;

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) throw new Error(`Telegram reminder failed: ${res.status}`);
}

sendDeadlineReminders()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Deadline reminder run failed:", err);
    process.exit(1);
  });
