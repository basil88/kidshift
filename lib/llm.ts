import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { getValidAccessToken } from "@/lib/token-refresh";
import { fetchFreeBusy } from "@/lib/google-calendar";
import { BusySlot } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const TOOL_NAME = "check_partner_availability";
const MAX_HISTORY_MESSAGES = 10; // 5 exchanges (user + assistant)

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
          description: "The start date to check, in YYYY-MM-DD format.",
        },
        date_end: {
          type: "string",
          description:
            "Optional end date in YYYY-MM-DD format. Use this to check a multi-day range (e.g., for 'next meeting' queries, check today through the next few days). If omitted, only checks the single date.",
        },
        time_start: {
          type: "string",
          description:
            "Optional start time in HH:MM (24h) format. If omitted, checks from the start of the day (or from now if checking today).",
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
  const now = new Date();
  const today = now.toLocaleDateString("en-CA", { timeZone: timezone });
  const currentTime = now.toLocaleTimeString("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const name = partnerName || "your partner";
  return `You are a helpful calendar assistant. The user is asking about their partner's calendar availability.

Today's date: ${today}
Current time: ${currentTime}
User's timezone: ${timezone}
Partner's name: ${name}

You only have access to free/busy data — you can see WHEN the partner is busy, but NOT what the events are (no titles, descriptions, or attendees).

When the user asks about availability:
1. Use the ${TOOL_NAME} tool to check the calendar.
2. Interpret the results and give a clear, concise answer.
3. For "next meeting" or "when is the next" questions, check from NOW onwards (use today's date with time_start set to the current time). If nothing found today, use date_end to check the next few days.
4. When reporting results, only include meetings that haven't already passed (i.e., after ${currentTime} today).

If the user asks a follow-up question (like "are you sure?", "really?", "what about tomorrow?"), use the conversation history to understand what they're referring to and re-check the calendar if needed.

Keep responses short and conversational. Use the partner's name naturally.
If a time slot is free, say so directly. If busy, mention the busy window(s) without speculating about what the events are.
When showing times, use 24-hour format (e.g., "15:00" not "3:00 PM").`;
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
  input: { date: string; date_end?: string; time_start?: string; time_end?: string }
): Promise<string> {
  const { date, date_end, time_start, time_end } = input;

  let timeMin: string;
  let timeMax: string;

  if (time_start) {
    timeMin = toISO(date, time_start, timezone);
    if (time_end) {
      timeMax = toISO(date_end || date, time_end, timezone);
    } else {
      // No end time — check through end of the (last) day
      timeMax = toISO(date_end || date, "23:59", timezone);
    }
  } else {
    // Whole day or multi-day range
    timeMin = toISO(date, "00:00", timezone);
    timeMax = toISO(date_end || date, "23:59", timezone);
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
  // Uses formatToParts for reliable offset calculation (no string parsing)
  const [year, month, day] = date.split("-").map(Number);
  const [hour, min] = time.split(":").map(Number);

  // Start with a UTC guess
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, min, 0));

  // Use formatToParts to reliably extract timezone components
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(utcGuess);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0");

  const tzYear = get("year");
  const tzMonth = get("month");
  const tzDay = get("day");
  let tzHour = get("hour");
  if (tzHour === 24) tzHour = 0; // midnight edge case
  const tzMin = get("minute");

  // Build UTC date from timezone parts to compute offset
  const tzAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, 0);
  const offsetMs = tzAsUtc - utcGuess.getTime();

  // Subtract the offset to get the real UTC time
  return new Date(utcGuess.getTime() - offsetMs).toISOString();
}

function formatBusySlots(slots: BusySlot[], timezone: string): string {
  if (slots.length === 0) {
    return "No busy slots found — the calendar is completely free for this time range.";
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const formatted = slots.map((slot) => {
    const startDate = new Date(slot.start);
    const endDate = new Date(slot.end);
    const date = dateFormatter.format(startDate);
    const start = formatter.format(startDate);
    const end = formatter.format(endDate);
    return `${date}: ${start} – ${end}`;
  });

  return `Busy slots:\n${formatted.join("\n")}`;
}

// --- Conversation history ---

async function getConversationHistory(
  chatId: number
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const { data } = await supabaseAdmin
    .from("telegram_messages")
    .select("role, content")
    .eq("telegram_chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(MAX_HISTORY_MESSAGES);

  return (data || []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}

async function saveMessage(
  chatId: number,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  await supabaseAdmin.from("telegram_messages").insert({
    telegram_chat_id: chatId,
    role,
    content,
  });

  // Prune old messages — keep only the most recent ones
  const { data: messages } = await supabaseAdmin
    .from("telegram_messages")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .order("created_at", { ascending: false })
    .range(MAX_HISTORY_MESSAGES, MAX_HISTORY_MESSAGES + 100);

  if (messages && messages.length > 0) {
    const idsToDelete = messages.map((m) => m.id);
    await supabaseAdmin
      .from("telegram_messages")
      .delete()
      .in("id", idsToDelete);
  }
}

// Main entry point: process a natural language calendar query
export async function processCalendarQuery(
  message: string,
  userId: string,
  chatId: number
): Promise<string> {
  const partnerInfo = await getPartnerInfo(userId);
  if (!partnerInfo) {
    return "You're not paired with a partner yet. Open the app and pair with your partner first!";
  }

  const { partnerId, partnerName, userTimezone } = partnerInfo;
  const systemPrompt = buildSystemPrompt(userTimezone, partnerName);

  // Get conversation history and append current message
  const history = await getConversationHistory(chatId);
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  // Save user message
  await saveMessage(chatId, "user", message);

  // First call: let Claude parse the question and decide to use the tool
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages,
  });

  // If Claude wants to use the tool, execute it and send the result back
  if (response.stop_reason === "tool_use") {
    const toolBlock = response.content.find((b) => b.type === "tool_use");

    if (toolBlock && toolBlock.type === "tool_use") {
      const toolResult = await executeToolCall(
        partnerId,
        userTimezone,
        toolBlock.input as { date: string; date_end?: string; time_start?: string; time_end?: string }
      );

      // Second call: Claude formats the result into a natural language answer
      const finalResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages: [
          ...messages,
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

      const textBlock = finalResponse.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );
      const answer = textBlock?.text || "Sorry, I couldn't process that request.";
      await saveMessage(chatId, "assistant", answer);
      return answer;
    }
  }

  // Claude responded directly without using the tool
  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  const answer = textBlock?.text || "Sorry, I couldn't process that request.";
  await saveMessage(chatId, "assistant", answer);
  return answer;
}
