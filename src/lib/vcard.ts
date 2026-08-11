// Standards-compliant vCard 3.0 generation. Only fields the profile owner has
// marked public should be passed in — callers are responsible for filtering.

export interface VCardData {
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  organization?: string | null;
  title?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  profileUrl?: string | null;
  note?: string | null;
}

function escape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateVCard(data: VCardData): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];

  const last = data.lastName ?? "";
  const first = data.firstName ?? data.fullName;
  lines.push(`N:${escape(last)};${escape(first)};;;`);
  lines.push(`FN:${escape(data.fullName)}`);

  if (data.organization) lines.push(`ORG:${escape(data.organization)}`);
  if (data.title) lines.push(`TITLE:${escape(data.title)}`);
  if (data.phone) lines.push(`TEL;TYPE=CELL,VOICE:${escape(data.phone)}`);
  if (data.whatsapp && data.whatsapp !== data.phone) {
    lines.push(`TEL;TYPE=WhatsApp:${escape(data.whatsapp)}`);
  }
  if (data.email) lines.push(`EMAIL;TYPE=INTERNET:${escape(data.email)}`);
  if (data.website) lines.push(`URL:${escape(data.website)}`);
  if (data.profileUrl) lines.push(`URL:${escape(data.profileUrl)}`);
  if (data.address) lines.push(`ADR;TYPE=WORK:;;${escape(data.address)};;;;`);
  if (data.note) lines.push(`NOTE:${escape(data.note)}`);

  lines.push("END:VCARD");
  // vCard requires CRLF line endings.
  return lines.join("\r\n");
}

// A safe ASCII filename for the downloaded .vcf.
export function vcardFilename(fullName: string): string {
  const base = fullName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${base || "contact"}.vcf`;
}
