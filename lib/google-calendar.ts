import { BusySlot } from "@/lib/types";

// Fetch free/busy data from Google Calendar for a single user
export async function fetchFreeBusy(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<BusySlot[]> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: "primary" }],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("FreeBusy API error:", error);
    throw new Error("FREEBUSY_FETCH_FAILED");
  }

  const data = await response.json();
  const busy = data.calendars?.primary?.busy || [];

  return busy.map((slot: { start: string; end: string }) => ({
    start: slot.start,
    end: slot.end,
  }));
}
