import { GoogleAuth } from "google-auth-library";

const INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const BATCH_ENDPOINT = "https://indexing.googleapis.com/batch";
const MAX_BATCH_SIZE = 100; // Google's hard limit per batch request

const auth = new GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/indexing"],
});

type NotificationType = "URL_UPDATED" | "URL_DELETED";

interface IndexingRequest {
  url: string;
  type: NotificationType;
}

/**
 * NOTE: The Indexing API is officially scoped by Google to JobPosting and
 * BroadcastEvent (livestream) pages. Only call this for job post URLs —
 * using it for admission/result/article pages risks quota issues and
 * doesn't guarantee indexing for non-eligible content types.
 */
export async function notifyIndexing(requests: IndexingRequest[]): Promise<void> {
  if (requests.length === 0) return;

  const client = await auth.getClient();
  const token = await client.getAccessToken();

  for (let i = 0; i < requests.length; i += MAX_BATCH_SIZE) {
    const batch = requests.slice(i, i + MAX_BATCH_SIZE);
    await sendBatch(batch, token.token!);
  }
}

async function sendBatch(batch: IndexingRequest[], accessToken: string): Promise<void> {
  const boundary = "batch_boundary";
  const body = batch
    .map(
      (req) => `--${boundary}
Content-Type: application/http
Content-Transfer-Encoding: binary

POST ${INDEXING_ENDPOINT}
Content-Type: application/json

${JSON.stringify({ url: req.url, type: req.type })}
`
    )
    .join("") + `--${boundary}--`;

  const res = await fetch(BATCH_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/mixed; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Indexing API batch failed: ${res.status} ${text}`);
  }
}

export async function notifyJobPublished(url: string) {
  await notifyIndexing([{ url, type: "URL_UPDATED" }]);
}

export async function notifyJobExpired(url: string) {
  // Google recommends URL_UPDATED (not DELETED) for expired-but-still-live
  // pages — DELETED is only for pages that return 404/410.
  await notifyIndexing([{ url, type: "URL_UPDATED" }]);
}
