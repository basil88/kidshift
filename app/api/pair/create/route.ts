import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePairCode } from "@/lib/pair-code";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { pair: true },
  });

  if (user?.pairId) {
    return NextResponse.json(
      { error: "Already in a pair" },
      { status: 400 }
    );
  }

  // Generate unique code (retry if collision)
  let code: string;
  let attempts = 0;
  do {
    code = generatePairCode();
    const existing = await prisma.pair.findUnique({ where: { code } });
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    return NextResponse.json(
      { error: "Could not generate unique code" },
      { status: 500 }
    );
  }

  const pair = await prisma.pair.create({
    data: {
      code,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      users: { connect: { id: session.user.id } },
    },
  });

  return NextResponse.json({ code: pair.code, id: pair.id });
}
