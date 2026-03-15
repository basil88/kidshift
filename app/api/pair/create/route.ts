import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { generatePairCode } from "@/lib/pair-code";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("pair_id")
    .eq("id", user.id)
    .single();

  if (profile?.pair_id) {
    return NextResponse.json({ error: "Already in a pair" }, { status: 400 });
  }

  // Generate unique code
  let code: string = "";
  for (let i = 0; i < 10; i++) {
    code = generatePairCode();
    const { data: existing } = await supabaseAdmin
      .from("pairs")
      .select("id")
      .eq("code", code)
      .single();
    if (!existing) break;
    if (i === 9) {
      return NextResponse.json({ error: "Could not generate unique code" }, { status: 500 });
    }
  }

  const { data: pair, error } = await supabaseAdmin.from("pairs").insert({
    code,
    status: "PENDING",
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }).select().single();

  if (error) {
    return NextResponse.json({ error: "Failed to create pair" }, { status: 500 });
  }

  await supabaseAdmin.from("profiles").update({ pair_id: pair.id }).eq("id", user.id);

  return NextResponse.json({ code: pair.code, id: pair.id });
}
