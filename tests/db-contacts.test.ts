import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { addContact, removeContact, listContacts, ContactError } from "@/lib/contacts";
import { getTopConnections } from "@/features/cards/connections";
import { dbEnabled, testDb, cleanupDb, makeUser } from "./db-helpers";

// DB-backed contact tests. Skipped without TEST_DATABASE_URL.
describe.skipIf(!dbEnabled)("contacts (database)", () => {
  beforeAll(async () => {
    await cleanupDb();
  });

  afterAll(async () => {
    await testDb().$disconnect();
  });

  it("saves a contact and prevents duplicates", async () => {
    const prisma = testDb();
    const owner = await makeUser("owner@test.local", "owner1");
    const target = await makeUser("target@test.local", "target1");

    const created = await addContact({
      ownerUserId: owner.id,
      contactUserId: target.id,
      source: "QR_SCAN",
      sourceCardId: "target1",
    });
    expect(created).not.toBeNull();

    // Second save returns the existing row instead of duplicating.
    const again = await addContact({
      ownerUserId: owner.id,
      contactUserId: target.id,
    });
    expect(again?.id).toBe(created!.id);
    expect(await prisma.contact.count({ where: { ownerUserId: owner.id } })).toBe(1);
  });

  it("rejects saving yourself as a contact", async () => {
    const user = await makeUser("selfy@test.local", "selfy");
    await expect(
      addContact({ ownerUserId: user.id, contactUserId: user.id }),
    ).rejects.toBeInstanceOf(ContactError);
  });

  it("lets a user delete their own contact but not someone else's", async () => {
    const prisma = testDb();
    const a = await makeUser("del-a@test.local", "dela");
    const b = await makeUser("del-b@test.local", "delb");
    const c = await makeUser("del-c@test.local", "delc");

    const ab = await addContact({ ownerUserId: a.id, contactUserId: b.id });
    const cb = await addContact({ ownerUserId: c.id, contactUserId: b.id });

    // c cannot delete a's relationship row.
    await expect(removeContact(c.id, ab!.id)).rejects.toBeInstanceOf(ContactError);
    expect(await prisma.contact.count({ where: { id: ab!.id } })).toBe(1);

    // a deletes their own row.
    await removeContact(a.id, ab!.id);
    expect(await prisma.contact.count({ where: { id: ab!.id } })).toBe(0);

    void cb;
  });

  it("lists contacts with search and hides deactivated accounts", async () => {
    const prisma = testDb();
    const owner = await makeUser("list-owner@test.local", "listowner");
    const alice = await makeUser("alice@test.local", "aliceco");
    const bob = await makeUser("bob@test.local", "bobco");

    await prisma.profile.update({
      where: { userId: alice.id },
      data: { companyName: "Alpha Trading" },
    });
    await prisma.profile.update({
      where: { userId: bob.id },
      data: { companyName: "Beta Bakery" },
    });

    await addContact({ ownerUserId: owner.id, contactUserId: alice.id });
    await addContact({ ownerUserId: owner.id, contactUserId: bob.id });

    const all = await listContacts(owner.id);
    expect(all).toHaveLength(2);

    const searched = await listContacts(owner.id, { search: "alpha" });
    expect(searched).toHaveLength(1);
    expect(searched[0]!.contact.profile?.username).toBe("aliceco");

    // Deactivate bob → hidden from the list.
    await prisma.user.update({ where: { id: bob.id }, data: { status: "SUSPENDED" } });
    const afterDeactivate = await listContacts(owner.id);
    expect(afterDeactivate).toHaveLength(1);
  });

  it("signup-style reciprocal saves create both directions once", async () => {
    const prisma = testDb();
    const cardOwner = await makeUser("cardowner@test.local", "cardowner");
    const newcomer = await makeUser("newcomer@test.local", "newcomer");

    // What register/route.ts does after a card signup:
    await addContact({
      ownerUserId: newcomer.id,
      contactUserId: cardOwner.id,
      source: "SHARED_LINK",
      sourceCardId: "cardowner",
    });
    await addContact({
      ownerUserId: cardOwner.id,
      contactUserId: newcomer.id,
      source: "CARD_SIGNUP",
      sourceCardId: "cardowner",
    });

    expect(
      await prisma.contact.count({
        where: { OR: [{ ownerUserId: cardOwner.id }, { contactUserId: cardOwner.id }] },
      }),
    ).toBe(2);

    // The newcomer appears in the card owner's top connections.
    const connections = await getTopConnections(cardOwner.id);
    expect(connections.some((c) => c.username === "newcomer")).toBe(true);
  });

  it("top connections never exceed seven and exclude self", async () => {
    const hub = await makeUser("hub@test.local", "hubuser");
    for (let i = 0; i < 9; i++) {
      const u = await makeUser(`conn${i}@test.local`, `conn${i}`);
      await addContact({ ownerUserId: u.id, contactUserId: hub.id });
    }
    const connections = await getTopConnections(hub.id);
    expect(connections.length).toBeLessThanOrEqual(7);
    expect(connections.every((c) => c.userId !== hub.id)).toBe(true);
    expect(connections.map((c) => c.rank)).toEqual(
      connections.map((_, i) => i + 1),
    );
  });
});