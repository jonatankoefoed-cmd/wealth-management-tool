import { getPrismaClient } from "@/lib/prisma";

export async function requireDefaultUserId(): Promise<string> {
  const prisma = getPrismaClient();
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    throw new Error("No user found. Run seed first using Node 20 scripts.");
  }
  return user.id;
}
