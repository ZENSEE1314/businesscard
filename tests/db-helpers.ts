// Shared helpers for DB-backed integration tests.
// These suites self-skip unless TEST_DATABASE_URL points at a disposable
// Postgres database (never production).

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "";
export const dbEnabled = TEST_DATABASE_URL.length > 0;

let client: PrismaClient | null = null;

export function testDb(): PrismaClient {
  if (!client) {
    client = new PrismaClient({
      datasources: { db: { url: TEST_DATABASE_URL } },
    });
  }
  return client;
}

export async function cleanupDb(): Promise<void> {
  const prisma = testDb();
  // Order matters for FKs; deleteAllData-style cleanup of our tables.
  await prisma.pointTransaction.deleteMany();
  await prisma.dailyCheckIn.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.session.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSetting.deleteMany();
}

export async function makeUser(email: string, username: string) {
  const prisma = testDb();
  return prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash("TestPass123", 4),
      profile: { create: { username, fullName: username } },
    },
  });
}