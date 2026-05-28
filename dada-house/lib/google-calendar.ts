import { google } from "googleapis";
import { ALL_SLOTS } from "./slots";

export { ALL_SLOTS };

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID!;

function getAuth() {
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
}

function slotToDate(dateStr: string, slot: string): Date {
  const [datePart] = dateStr.split("T");
  const [time, meridiem] = slot.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  // Houston is UTC-6 (CDT) or UTC-5 (CST) — using UTC-5 as approximation
  return new Date(`${datePart}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00-05:00`);
}

export async function getBusySlots(dateStr: string): Promise<string[]> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return []; // Google Calendar not configured — all slots available
  }

  try {
    const auth = getAuth();
    const calendar = google.calendar({ version: "v3", auth });

    const dayStart = new Date(`${dateStr}T00:00:00-05:00`);
    const dayEnd = new Date(`${dateStr}T23:59:59-05:00`);

    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        items: [{ id: CALENDAR_ID }],
      },
    });

    const busy = res.data.calendars?.[CALENDAR_ID]?.busy ?? [];

    return ALL_SLOTS.filter((slot) => {
      const slotStart = slotToDate(dateStr, slot);
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // +1h

      return busy.some((b) => {
        const busyStart = new Date(b.start!);
        const busyEnd = new Date(b.end!);
        // Overlap: slot starts before busy ends AND slot ends after busy starts
        return slotStart < busyEnd && slotEnd > busyStart;
      });
    });
  } catch (err) {
    console.error("Google Calendar error:", err);
    return [];
  }
}
