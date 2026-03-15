import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      pair: {
        include: { users: true },
      },
    },
  });

  if (!user?.pair) {
    return NextResponse.json({ paired: false });
  }

  const partner = user.pair.users.find((u) => u.id !== session.user!.id);

  return NextResponse.json({
    paired: true,
    pair: {
      id: user.pair.id,
      code: user.pair.code,
      status: user.pair.status,
      partner: partner
        ? { name: partner.name, image: partner.image }
        : null,
    },
  });
}
