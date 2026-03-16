import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { generateTelegramLinkCode } from "@/lib/telegram-auth";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const code = await generateTelegramLinkCode(user.id);
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "kidshift_cal_bot";
    const botUrl = `https://t.me/${botUsername}?start=${code}`;

    return NextResponse.json({ code, botUrl });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate link code" },
      { status: 500 }
    );
  }
}
