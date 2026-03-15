import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

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

  if (!profile?.pair_id) {
    return NextResponse.json({ error: "Not in a pair" }, { status: 400 });
  }

  // Remove both users from the pair
  await supabaseAdmin
    .from("profiles")
    .update({ pair_id: null })
    .eq("pair_id", profile.pair_id);

  // Mark pair as dissolved
  await supabaseAdmin
    .from("pairs")
    .update({ status: "DISSOLVED" })
    .eq("id", profile.pair_id);

  return NextResponse.json({ success: true });
}
