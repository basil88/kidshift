import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await request.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (user?.pairId) {
    return NextResponse.json(
      { error: "Already in a pair" },
      { status: 400 }
    );
  }

  const pair = await prisma.pair.findUnique({
    where: { code: code.toUpperCase() },
    include: { users: true },
  });

  if (!pair) {
    return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  }

  if (pair.status !== "PENDING") {
    return NextResponse.json(
      { error: "This pair is no longer available" },
      { status: 400 }
    );
  }

  if (new Date() > pair.expiresAt) {
    return NextResponse.json({ error: "Code has expired" }, { status: 400 });
  }

  if (pair.users.some((u) => u.id === session.user!.id)) {
    return NextResponse.json(
      { error: "Cannot pair with yourself" },
      { status: 400 }
    );
  }

  // Join the pair and activate it
  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { pairId: pair.id },
    }),
    prisma.pair.update({
      where: { id: pair.id },
      data: { status: "ACTIVE" },
    }),
  ]);

  return NextResponse.json({ success: true, pairId: pair.id });
}
