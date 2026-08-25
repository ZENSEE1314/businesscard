import { describe, it, expect } from "vitest";
import { generateVCard, vcardFilename } from "@/lib/vcard";

describe("generateVCard", () => {
  it("produces a standards-compliant vCard 3.0 with all provided fields", () => {
    const vcf = generateVCard({
      fullName: "Zen See",
      organization: "BridgeX",
      title: "Entrepreneur",
      phone: "+6281234567890",
      whatsapp: "+6281234567890",
      email: "zen@bridgex.app",
      website: "https://bridgex.app",
      address: "Batam, Indonesia",
      profileUrl: "https://app.bridgex.app/u/zen",
      note: "Met at a networking event",
    });

    expect(vcf.startsWith("BEGIN:VCARD\r\nVERSION:3.0")).toBe(true);
    expect(vcf).toContain("FN:Zen See");
    // Without explicit first/last names the whole name lands in the given-name
    // slot; phone contact apps match on FN anyway.
    expect(vcf).toContain("N:;Zen See;;;");
    expect(vcf).toContain("ORG:BridgeX");
    expect(vcf).toContain("TITLE:Entrepreneur");
    expect(vcf).toContain("TEL;TYPE=CELL,VOICE:+6281234567890");
    expect(vcf).toContain("EMAIL;TYPE=INTERNET:zen@bridgex.app");
    expect(vcf).toContain("URL:https://bridgex.app");
    expect(vcf).toContain("URL:https://app.bridgex.app/u/zen");
    // Commas in values must be escaped per the vCard spec.
    expect(vcf).toContain("ADR;TYPE=WORK:;;Batam\\, Indonesia;;;;");
    expect(vcf.endsWith("END:VCARD")).toBe(true);
  });

  it("escapes special characters", () => {
    const vcf = generateVCard({
      fullName: "Tan, Joe; Jr",
      organization: "A & B Co",
    });
    expect(vcf).toContain("FN:Tan\\, Joe\\; Jr");
    expect(vcf).toContain("ORG:A & B Co"); // & is legal in vCard values
  });

  it("omits empty optional fields and dedupes identical tel lines", () => {
    const vcf = generateVCard({ fullName: "Solo Person" });
    expect(vcf).not.toContain("TEL");
    expect(vcf).not.toContain("ORG");

    const same = generateVCard({ fullName: "X", phone: "+1234", whatsapp: "+1234" });
    expect(same.match(/TEL/g)?.length).toBe(1);
  });
});

describe("vcardFilename", () => {
  it("slugifies names safely", () => {
    expect(vcardFilename("Zen See")).toBe("zen-see.vcf");
    expect(vcardFilename("Budi Santoso (PT Maju)")).toBe("budi-santoso-pt-maju.vcf");
    expect(vcardFilename("李明")).toBe("contact.vcf"); // non-ASCII falls back
  });
});