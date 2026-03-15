import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await request.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("pair_id")
    .eq("id", user.id)
    .single();

  if (profile?.pair_id) {
    return NextResponse.json({ error: "Already in a pair" }, { status: 400 });
  }

  const { data: pair } = await supabaseAdmin
    .from("pairs")
    .select("*, profiles(id)")
    .eq("code", code.toUpperCase())
    .single();

  if (!pair) {
    return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  }

  if (pair.status !== "PENDING") {
    return NextResponse.json({ error: "This pair is no longer available" }, { status: 400 });
  }

  if (new Date() > new Date(pair.expires_at)) {
    return NextResponse.json({ error: "Code has expired" }, { status: 400 });
  }

  const members = (pair.profiles || []) as { id: string }[];
  if (members.some((m) => m.id === user.id)) {
    return NextResponse.json({ error: "Cannot pair with yourself" }, { status: 400 });
  }

  // Join the pair and activate it
  await supabaseAdmin.from("profiles").update({ pair_id: pair.id }).eq("id", user.id);
  await supabaseAdmin.from("pairs").update({ status: "ACTIVE" }).eq("id", pair.id);

  return NextResponse.json({ success: true, pairId: pair.id });
}
