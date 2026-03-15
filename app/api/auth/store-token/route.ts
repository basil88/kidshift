import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider_token, provider_refresh_token } = await request.json();

  if (!provider_token) {
    return NextResponse.json({ error: "No provider_token" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("google_tokens").upsert({
    user_id: user.id,
    access_token: provider_token,
    refresh_token: provider_refresh_token || null,
    expires_at: Math.floor(Date.now() / 1000 + 3600),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[STORE TOKEN] Upsert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("[STORE TOKEN] Saved token for user:", user.id);
  return NextResponse.json({ ok: true });
}
