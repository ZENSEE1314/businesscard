// ONE-SHOT: delete throwaway test accounts (removed after it runs).
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
try {
  const del = await prisma.user.deleteMany({
    where: { email: { endsWith: "@example.com" } },
  });
  console.log("DELTEST removed test accounts:", del.count);
} catch (e) {
  console.log("DELTESTERR", e?.message ?? String(e));
} finally {
  await prisma.$disconnect();
}
