"use client";

import { useState } from "react";
import { Nfc, Check, Loader2, IdCard, UserPlus } from "lucide-react";

// Minimal Web NFC typing (not yet in the standard DOM lib).
interface NDEFReaderLike {
  write: (message: {
    records: { recordType: string; data: string }[];
  }) => Promise<void>;
}
type NDEFReaderCtor = new () => NDEFReaderLike;

type Mode = "card" | "contact";
type State = "idle" | "writing" | "done" | "error" | "unsupported";

// Programs a physical NFC tag/sticker held to the phone. A website cannot make
// the phone itself act as a tappable tag (no browser card-emulation exists), so
// this writes to a blank NFC tag which people then tap. Two modes:
//   card    -> tag opens the profile card
//   contact -> tag opens the vCard download (a tap saves the contact)
export function NfcButton({
  cardUrl,
  vcardUrl,
}: {
  cardUrl: string;
  vcardUrl: string;
}) {
  const [state, setState] = useState<State>("idle");
  const [mode, setMode] = useState<Mode | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function writeTag(target: Mode) {
    const Ctor = (window as unknown as { NDEFReader?: NDEFReaderCtor })
      .NDEFReader;
    if (!Ctor) {
      setState("unsupported");
      setMessage(
        "NFC programming needs Chrome on Android. On other devices, use the QR code or Save Contact button instead.",
      );
      return;
    }
    const url = target === "contact" ? vcardUrl : cardUrl;
    try {
      setMode(target);
      setState("writing");
      setMessage("Hold a blank NFC tag or sticker to the back of your phone…");
      const reader = new Ctor();
      await reader.write({ records: [{ recordType: "url", data: url }] });
      setState("done");
      setMessage(
        target === "contact"
          ? "Done! Tapping this tag now saves your contact to a phone."
          : "Done! Tapping this tag now opens your card.",
      );
    } catch (err) {
      setState("error");
      setMessage(
        err instanceof Error && err.name === "NotAllowedError"
          ? "NFC permission was denied. Turn on NFC and try again."
          : "Couldn't write the tag. Make sure NFC is on and hold a tag steady against the phone.",
      );
    }
  }

  const writing = state === "writing";

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Nfc className="h-4 w-4" /> Program an NFC tag
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => writeTag("card")}
          disabled={writing}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-surface-2 text-xs font-medium hover:bg-border disabled:opacity-60"
        >
          {writing && mode === "card" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : state === "done" && mode === "card" ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <IdCard className="h-4 w-4" />
          )}
          Opens my card
        </button>
        <button
          onClick={() => writeTag("contact")}
          disabled={writing}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-surface-2 text-xs font-medium hover:bg-border disabled:opacity-60"
        >
          {writing && mode === "contact" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : state === "done" && mode === "contact" ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Saves my contact
        </button>
      </div>
      <p
        className={`mt-2 text-xs ${state === "error" ? "text-danger" : "text-muted"}`}
      >
        {message ??
          "Tap your phone to a blank NFC card or sticker to program it. Then anyone who taps that card gets your details."}
      </p>
    </div>
  );
}
