const RESEND_API_BASE = "https://api.resend.com";
const MAX_PAGES = 3;
const PAGE_SIZE = 100;

export type EmailHistoryEntry = {
  id: string;
  to: string[];
  subject: string;
  createdAt: string;
  status: string;
};

/**
 * Resend has no server-side "filter by recipient" on its list endpoint, so this
 * pages through the most recent sends and filters client-side — fine at small
 * business volume, but only covers the last MAX_PAGES * PAGE_SIZE emails sent
 * account-wide, not full history once volume grows.
 */
export async function getEmailsSentTo(email: string): Promise<EmailHistoryEntry[]> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !email) return [];

  const target = email.toLowerCase();
  const matches: EmailHistoryEntry[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${RESEND_API_BASE}/emails`);
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (cursor) url.searchParams.set("after", cursor);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) break;
    const data = await res.json();

    for (const item of data.data ?? []) {
      const to: string[] = Array.isArray(item.to) ? item.to : [item.to];
      if (to.some((t) => t?.toLowerCase() === target)) {
        matches.push({
          id: item.id,
          to,
          subject: item.subject ?? "(no subject)",
          createdAt: item.created_at,
          status: item.last_event ?? "unknown",
        });
      }
    }

    if (!data.has_more || !data.data?.length) break;
    cursor = data.data[data.data.length - 1]?.id;
  }

  return matches;
}

/** Re-sends a previously sent email as-is (same from/to/subject/content), by fetching it from Resend first. */
export async function resendEmail(emailId: string): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Resend is not configured");

  const getRes = await fetch(`${RESEND_API_BASE}/emails/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!getRes.ok) throw new Error("Original email not found");
  const original = await getRes.json();

  const sendRes = await fetch(`${RESEND_API_BASE}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: original.from,
      to: original.to,
      subject: original.subject,
      html: original.html,
      text: original.text,
    }),
  });
  if (!sendRes.ok) {
    const err = await sendRes.json().catch(() => null);
    throw new Error(err?.message ?? "Failed to resend email");
  }

  return sendRes.json();
}
