import { NextRequest, NextResponse } from "next/server";

// One-time webhook registration endpoint
// Call this once after deployment to register the webhook with Telegram
export async function GET(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token || !secret) {
    return NextResponse.json(
      { error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  // Derive the webhook URL from the request
  const url = new URL(request.url);
  const webhookUrl = `${url.protocol}//${url.host}/api/telegram/webhook`;

  const response = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
      }),
    }
  );

  const result = await response.json();
  return NextResponse.json({ webhookUrl, telegram: result });
}
