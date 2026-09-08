import { db } from "@/lib/db";
import { alertSubscriptions, alertDeliveries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { posts, jobDetails } from "@/db/schema";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID; // public channel, e.g. @bdcareerplatform
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

async function sendTelegramMessage(chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`Telegram send failed for ${chatId}: ${res.status} ${await res.text()}`);
  }
}

function formatJobMessage(post: typeof posts.$inferSelect, details: typeof jobDetails.$inferSelect | null) {
  const lines = [
    `<b>${escapeHtml(post.title)}</b>`,
    "",
  ];
  if (details?.vacancy != null) lines.push(`👥 Vacancy: ${details.vacancy}`);
  if (details?.education) lines.push(`🎓 ${escapeHtml(details.education)}`);
  if (details?.applicationDeadline) {
    lines.push(`⏰ Deadline: ${details.applicationDeadline.toLocaleDateString("en-GB")}`);
  }
  lines.push("", `${SITE_URL}/jobs/${post.slug}`);
  return lines.join("\n");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Called right after a post is auto-published or approved from review. */
export async function broadcastNewPost(
  post: typeof posts.$inferSelect,
  details: typeof jobDetails.$inferSelect | null
) {
  const message = formatJobMessage(post, details);

  // 1. Public channel broadcast
  if (CHANNEL_ID) {
    try {
      await sendTelegramMessage(CHANNEL_ID, message);
    } catch (err) {
      console.error("Channel broadcast failed:", err);
    }
  }

  // 2. Individual subscribers matching filters (category/district/keywords)
  const subscribers = await db
    .select()
    .from(alertSubscriptions)
    .where(and(eq(alertSubscriptions.channel, "telegram"), eq(alertSubscriptions.isActive, true)));

  for (const sub of subscribers) {
    if (!sub.telegramChatId) continue;
    if (!matchesFilters(post, sub.filters as any)) continue;

    try {
      await sendTelegramMessage(sub.telegramChatId, message);
      await db.insert(alertDeliveries).values({
        subscriptionId: sub.id,
        postId: post.id,
        deliveryType: "new_post",
      });
    } catch (err) {
      console.error(`Failed to notify subscriber ${sub.id}:`, err);
    }
  }
}

function matchesFilters(
  post: typeof posts.$inferSelect,
  filters: { categorySlug?: string; district?: string; keywords?: string[] } | null
): boolean {
  if (!filters) return true; // no filter = wants everything
  if (filters.categorySlug && post.categorySlug !== filters.categorySlug) return false;
  if (filters.keywords?.length) {
    const title = post.title.toLowerCase();
    const hasMatch = filters.keywords.some((k) => title.includes(k.toLowerCase()));
    if (!hasMatch) return false;
  }
  return true;
}
