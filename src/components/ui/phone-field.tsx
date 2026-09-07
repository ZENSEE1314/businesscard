"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui";

interface Country {
  code: string;
  dial: string;
  name: string;
  flag: string;
}

// Common dial codes; Indonesia first as the app's primary market.
const COUNTRIES: Country[] = [
  { code: "ID", dial: "62", name: "Indonesia", flag: "🇮🇩" },
  { code: "MY", dial: "60", name: "Malaysia", flag: "🇲🇾" },
  { code: "SG", dial: "65", name: "Singapore", flag: "🇸🇬" },
  { code: "TH", dial: "66", name: "Thailand", flag: "🇹🇭" },
  { code: "PH", dial: "63", name: "Philippines", flag: "🇵🇭" },
  { code: "VN", dial: "84", name: "Vietnam", flag: "🇻🇳" },
  { code: "BN", dial: "673", name: "Brunei", flag: "🇧🇳" },
  { code: "KH", dial: "855", name: "Cambodia", flag: "🇰🇭" },
  { code: "MM", dial: "95", name: "Myanmar", flag: "🇲🇲" },
  { code: "LA", dial: "856", name: "Laos", flag: "🇱🇦" },
  { code: "CN", dial: "86", name: "China", flag: "🇨🇳" },
  { code: "HK", dial: "852", name: "Hong Kong", flag: "🇭🇰" },
  { code: "TW", dial: "886", name: "Taiwan", flag: "🇹🇼" },
  { code: "JP", dial: "81", name: "Japan", flag: "🇯🇵" },
  { code: "KR", dial: "82", name: "South Korea", flag: "🇰🇷" },
  { code: "IN", dial: "91", name: "India", flag: "🇮🇳" },
  { code: "AU", dial: "61", name: "Australia", flag: "🇦🇺" },
  { code: "NZ", dial: "64", name: "New Zealand", flag: "🇳🇿" },
  { code: "US", dial: "1", name: "United States", flag: "🇺🇸" },
  { code: "GB", dial: "44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "AE", dial: "971", name: "UAE", flag: "🇦🇪" },
  { code: "SA", dial: "966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "DE", dial: "49", name: "Germany", flag: "🇩🇪" },
  { code: "FR", dial: "33", name: "France", flag: "🇫🇷" },
  { code: "NL", dial: "31", name: "Netherlands", flag: "🇳🇱" },
];

const DEFAULT_DIAL = "62";

// Longest dial codes first so "+855" matches before "+8".
const BY_DIAL_LENGTH = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

/** Splits a stored value into a dial code + local number. */
function parseValue(value: string): { dial: string; local: string } {
  let s = (value || "").trim().replace(/[\s()\-.]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);

  if (s.startsWith("+")) {
    const digits = s.slice(1).replace(/\D/g, "");
    const match = BY_DIAL_LENGTH.find((c) => digits.startsWith(c.dial));
    if (match) return { dial: match.dial, local: digits.slice(match.dial.length) };
    return { dial: DEFAULT_DIAL, local: digits };
  }

  // Legacy / local-format value: keep it in the number box untouched.
  return { dial: DEFAULT_DIAL, local: s.replace(/\D/g, "") };
}

/**
 * Phone/WhatsApp input with a country-code dropdown. Stores the full
 * international number (e.g. "+628123456789"); a leading trunk "0" the user
 * types is dropped so it never doubles up with the country code.
 */
export function PhoneField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { dial, local } = useMemo(() => parseValue(value), [value]);

  function combine(nextDial: string, nextLocal: string) {
    const digits = nextLocal.replace(/\D/g, "").replace(/^0+/, "");
    onChange(digits ? `+${nextDial}${digits}` : "");
  }

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <select
          aria-label={`${label} country code`}
          value={dial}
          onChange={(e) => combine(e.target.value, local)}
          className="h-11 shrink-0 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.dial}>
              {c.flag} +{c.dial}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="812 3456 789"
          value={local}
          onChange={(e) => combine(dial, e.target.value)}
          className="h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>
    </div>
  );
}
