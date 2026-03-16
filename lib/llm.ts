import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { getValidAccessToken } from "@/lib/token-refresh";
import { fetchFreeBusy } from "@/lib/google-calendar";
import { BusySlot } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const TOOL_NAME = "check_partner_availability";

const tools: Anthropic.Tool[] = [
  {
    name: TOOL_NAME,
    description:
      "Check the partner's calendar availability for a given date/time range. Returns a list of busy time slots. If only a date is given (no specific time), returns all busy slots for that day.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description: "The date to check, in YYYY-MM-DD format.",
        },
        time_start: {
          type: "string",
          description:
            "Optional start time in HH:MM (24h) format. If omitted, checks the whole day.",
        },
        time_end: {
          type: "string",
          description:
            "Optional end time in HH:MM (24h) format. If omitted and time_start is given, checks a 1-hour window from time_start.",
        },
      },
      required: ["date"],
    },
  },
];

function buildSystemPrompt(
  timezone: string,
  partnerName: string | null
): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  const name = partnerName || "your partner";
  return `You are a helpful calendar assistant. The user is asking about their partner's calendar availability.

Today's date: ${today}
User's timezone: ${timezone}
Partner's name: ${name}

You only have access to free/busy data — you can see WHEN the partner is busy, but NOT what the events are (no titles, descriptions, or attendees).

When the user asks about availability:
1. Use the ${TOOL_NAME} tool to check the calendar.
2. Interpret the results and give a clear, concise answer.

Keep responses short and conversational. Use the partner's name naturally.
If a time slot is free, say so directly. If busy, mention the busy window(s) without speculating about what the events are.
When showing times, use 12-hour format (e.g., "3:00 PM" not "15:00").`;
}

// Look up partner for a given user
async function getPartnerInfo(userId: string): Promise<{
  partnerId: string;
  partnerName: string | null;
  userTimezone: string;
} | null> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("pair_id, timezone")
    .eq("id", userId)
    .single();

  if (!profile?.pair_id) return null;

  const { data: pair } = await supabaseAdmin
    .from("pairs")
    .select("status, profiles(id, name)")
    .eq("id", profile.pair_id)
    .single();

  if (!pair || pair.status !== "ACTIVE") return null;

  const members = (pair.profiles || []) as { id: string; name: string | null }[];
  const partner = members.find((m) => m.id !== userId);
  if (!partner) return null;

  return {
    partnerId: partner.id,
    partnerName: partner.name,
    userTimezone: profile.timezone || "America/New_York",
  };
}

// Execute the tool call: fetch partner's free/busy data
async function executeToolCall(
  partnerId: string,
  timezone: string,
  input: { date: string; time_start?: string; time_end?: string }
): Promise<string> {
  const { date, time_start, time_end } = input;

  let timeMin: string;
  let timeMax: string;

  if (time_start) {
    // Specific time window
    timeMin = toISO(date, time_start, timezone);
    if (time_end) {
      timeMax = toISO(date, time_end, timezone);
    } else {
      // Default to 1-hour window
      const [h, m] = time_start.split(":").map(Number);
      const endH = h + 1;
      timeMax = toISO(date, `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`, timezone);
    }
  } else {
    // Whole day
    timeMin = toISO(date, "00:00", timezone);
    timeMax = toISO(date, "23:59", timezone);
  }

  try {
    const token = await getValidAccessToken(partnerId);
    const busy = await fetchFreeBusy(token, timeMin, timeMax);
    return formatBusySlots(busy, timezone);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "NO_GOOGLE_TOKENS" || msg === "NO_REFRESH_TOKEN") {
      return "Error: Partner's Google Calendar is not connected or their token has expired. They need to re-authenticate in the app.";
    }
    return `Error fetching calendar: ${msg}`;
  }
}

function toISO(date: string, time: string, timezone: string): string {
  // Convert "date + time in user's timezone" to a UTC ISO string
  const [year, month, day] = date.split("-").map(Number);
  const [hour, min] = time.split(":").map(Number);

  // Start with a UTC guess
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, min, 0));

  // Find how far the target timezone is from UTC at this instant
  const utcStr = utcGuess.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = utcGuess.toLocaleString("en-US", { timeZone: timezone });
  const offsetMs = new Date(tzStr).getTime() - new Date(utcStr).getTime();

  // Subtract the offset: user says "3 PM in UTC+2" → 1 PM UTC
  return new Date(utcGuess.getTime() - offsetMs).toISOString();
}

function formatBusySlots(slots: BusySlot[], timezone: string): string {
  if (slots.length === 0) {
    return "No busy slots found — the calendar is completely free for this time range.";
  }

  const formatted = slots.map((slot) => {
    const start = new Date(slot.start).toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const end = new Date(slot.end).toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${start} – ${end}`;
  });

  return `Busy slots:\n${formatted.join("\n")}`;
}

// Main entry point: process a natural language calendar query
export async function processCalendarQuery(
  message: string,
  userId: string
): Promise<string> {
  const partnerInfo = await getPartnerInfo(userId);
  if (!partnerInfo) {
    return "You're not paired with a partner yet. Open the app and pair with your partner first!";
  }

  const { partnerId, partnerName, userTimezone } = partnerInfo;
  const systemPrompt = buildSystemPrompt(userTimezone, partnerName);

  // First call: let Claude parse the question and decide to use the tool
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages: [{ role: "user", content: message }],
  });

  // If Claude wants to use the tool, execute it and send the result back
  if (response.stop_reason === "tool_use") {
    const toolBlock = response.content.find((b) => b.type === "tool_use");

    if (toolBlock && toolBlock.type === "tool_use") {
      const toolResult = await executeToolCall(
        partnerId,
        userTimezone,
        toolBlock.input as { date: string; time_start?: string; time_end?: string }
      );

      // Second call: Claude formats the result into a natural language answer
      const finalResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages: [
          { role: "user", content: message },
          { role: "assistant", content: response.content },
          {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolBlock.id,
                content: toolResult,
              },
            ],
          },
        ],
      });

      // Extract text from the final response
      const textBlock = finalResponse.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );
      return textBlock?.text || "Sorry, I couldn't process that request.";
    }
  }

  // Claude responded directly without using the tool
  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  return textBlock?.text || "Sorry, I couldn't process that request.";
}
