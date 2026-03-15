import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
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
    return NextResponse.json({ paired: false });
  }

  const { data: pair } = await supabaseAdmin
    .from("pairs")
    .select("*, profiles(id, name, image)")
    .eq("id", profile.pair_id)
    .single();

  if (!pair) {
    return NextResponse.json({ paired: false });
  }

  const members = (pair.profiles || []) as { id: string; name: string | null; image: string | null }[];
  const partner = members.find((m) => m.id !== user.id);

  return NextResponse.json({
    paired: true,
    pair: {
      id: pair.id,
      code: pair.code,
      status: pair.status,
      partner: partner ? { name: partner.name, image: partner.image } : null,
    },
  });
}
