import "server-only";
import { prisma } from "@/lib/db/prisma";

// Reads a JSON system setting, falling back to a default.
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  return row.value as T;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export async function getMembershipBank(): Promise<BankDetails> {
  return getSetting<BankDetails>("membershipBank", {
    bankName: "Bank BCA",
    accountNumber: "0000000000",
    accountHolder: "Member Club",
  });
}
