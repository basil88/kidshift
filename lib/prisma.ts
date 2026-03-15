import { PrismaClient } from "@/lib/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Strip sslmode from URL — we configure SSL explicitly below
  const url = process.env.DATABASE_URL!.replace(/[?&]sslmode=[^&]*/g, "");
  const cleanUrl = url.endsWith("?") ? url.slice(0, -1) : url;

  const adapter = new PrismaPg({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
