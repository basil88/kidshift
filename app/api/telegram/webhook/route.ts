import { NextRequest, NextResponse } from "next/server";
import { getBot } from "@/lib/telegram";
import { redeemTelegramLinkCode, getUserIdFromChat } from "@/lib/telegram-auth";
import { processCalendarQuery } from "@/lib/llm";

let _initialized = false;

async function ensureHandlers() {
  if (_initialized) return;
  _initialized = true;

  const bot = getBot();

  // grammy requires init() before handleUpdate() in serverless environments
  await bot.init();

  // Handle /start command — account linking
  bot.command("start", async (ctx) => {
    const code = ctx.match?.trim();

    if (!code) {
      await ctx.reply(
        "Welcome! To link your KidShift account:\n\n" +
          "1. Open the KidShift app\n" +
          "2. Go to Dashboard → Connect Telegram\n" +
          "3. Send me the code you get\n\n" +
          "Or use /start CODE"
      );
      return;
    }

    const chatId = ctx.chat.id;
    const username = ctx.from?.username;

    const result = await redeemTelegramLinkCode(code, chatId, username);

    if (result.success) {
      await ctx.reply(
        "Account linked! You can now ask me about your partner's calendar.\n\n" +
          'Try: "Is my partner free today at 3pm?"'
      );
    } else {
      await ctx.reply(result.error || "Failed to link account.");
    }
  });

  // Handle text messages — calendar queries
  bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = await getUserIdFromChat(chatId);

    if (!userId) {
      await ctx.reply(
        "Your Telegram isn't linked to a KidShift account yet.\n\n" +
          "Open the app → Dashboard → Connect Telegram to get a linking code."
      );
      return;
    }

    await ctx.replyWithChatAction("typing");

    try {
      const answer = await processCalendarQuery(ctx.message.text, userId);
      await ctx.reply(answer);
    } catch (error) {
      console.error("Error processing calendar query:", error);
      await ctx.reply(
        "Sorry, something went wrong. Please try again in a moment."
      );
    }
  });
}

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  // Verify webhook secret
  const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret && headerSecret !== secret) {
    console.error("Webhook secret mismatch");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureHandlers();
    const bot = getBot();
    const body = await req.json();
    console.log("Received update:", JSON.stringify(body).slice(0, 500));
    await bot.handleUpdate(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
