// Boot-time guard: remove throwaway test accounts. @example.com is IANA-
// reserved for testing, so no real member ever uses it — safe to delete on
// every deploy, keeping verification/test data out of production.
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
