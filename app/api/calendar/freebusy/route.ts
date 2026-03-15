import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { getValidAccessToken } from "@/lib/token-refresh";
import { fetchFreeBusy } from "@/lib/google-calendar";
import { computeConflicts } from "@/lib/freebusy";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const date = dateParam || new Date().toISOString().split("T")[0];

  const timeMin = `${date}T00:00:00Z`;
  const timeMax = `${date}T23:59:59Z`;

  // Get user's profile + pair info
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("pair_id")
    .eq("id", user.id)
    .single();

  if (!profile?.pair_id) {
    // Not paired — return own data only
    try {
      const token = await getValidAccessToken(user.id);
      const you = await fetchFreeBusy(token, timeMin, timeMax);
      return NextResponse.json({
        you,
        partner: [],
        conflicts: [],
        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("FreeBusy error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Get pair status and partner
  const { data: pair } = await supabaseAdmin
    .from("pairs")
    .select("status, profiles(id)")
    .eq("id", profile.pair_id)
    .single();

  if (!pair || pair.status !== "ACTIVE") {
    try {
      const token = await getValidAccessToken(user.id);
      const you = await fetchFreeBusy(token, timeMin, timeMax);
      return NextResponse.json({
        you,
        partner: [],
        conflicts: [],
        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("FreeBusy error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const members = (pair.profiles || []) as { id: string }[];
  const partner = members.find((m) => m.id !== user.id);

  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 500 });
  }

  try {
    const [yourToken, partnerToken] = await Promise.all([
      getValidAccessToken(user.id),
      getValidAccessToken(partner.id),
    ]);

    const [yourBusy, partnerBusy] = await Promise.all([
      fetchFreeBusy(yourToken, timeMin, timeMax),
      fetchFreeBusy(partnerToken, timeMin, timeMax),
    ]);

    const conflicts = computeConflicts(yourBusy, partnerBusy);

    return NextResponse.json({
      you: yourBusy,
      partner: partnerBusy,
      conflicts,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("FreeBusy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
