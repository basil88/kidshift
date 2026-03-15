import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/token-refresh";
import { fetchFreeBusy } from "@/lib/google-calendar";
import { computeConflicts } from "@/lib/freebusy";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  // Default to today
  const date = dateParam || new Date().toISOString().split("T")[0];

  // Full day range in UTC
  const timeMin = `${date}T00:00:00Z`;
  const timeMax = `${date}T23:59:59Z`;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      pair: { include: { users: true } },
    },
  });

  if (!user?.pair || user.pair.status !== "ACTIVE") {
    // Return only user's own data if not paired
    try {
      const token = await getValidAccessToken(session.user.id);
      const you = await fetchFreeBusy(token, timeMin, timeMax);
      return NextResponse.json({
        you,
        partner: [],
        conflicts: [],
        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const partner = user.pair.users.find((u) => u.id !== session.user!.id);
  if (!partner) {
    return NextResponse.json(
      { error: "Partner not found" },
      { status: 500 }
    );
  }

  // Fetch tokens and busy data for both users in parallel
  try {
    const [yourToken, partnerToken] = await Promise.all([
      getValidAccessToken(session.user.id),
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
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
