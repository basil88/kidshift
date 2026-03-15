import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.pairId) {
    return NextResponse.json({ error: "Not in a pair" }, { status: 400 });
  }

  await prisma.$transaction([
    // Remove both users from the pair
    prisma.user.updateMany({
      where: { pairId: user.pairId },
      data: { pairId: null },
    }),
    // Mark pair as dissolved
    prisma.pair.update({
      where: { id: user.pairId },
      data: { status: "DISSOLVED" },
    }),
  ]);

  return NextResponse.json({ success: true });
}
