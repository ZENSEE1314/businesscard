"use client";

import { useState } from "react";
import { Nfc, Check, Loader2 } from "lucide-react";

// Minimal Web NFC typing (not yet in the standard DOM lib).
interface NDEFReaderLike {
  write: (message: {
    records: { recordType: string; data: string }[];
  }) => Promise<void>;
}
type NDEFReaderCtor = new () => NDEFReaderLike;

type State = "idle" | "writing" | "done" | "error" | "unsupported";

// Writes the card URL to a physical NFC tag/sticker held to the phone. Tapping
// that tag on another phone then opens this card (where Save Contact lives).
// Web NFC write is Android-Chrome only; elsewhere we explain the alternative.
export function NfcButton({ url }: { url: string }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function writeTag() {
    const Ctor = (window as unknown as { NDEFReader?: NDEFReaderCtor })
      .NDEFReader;
    if (!Ctor) {
      setState("unsupported");
      setMessage(
        "NFC writing needs Chrome on Android. On other devices, use the QR code or Save Contact button.",
      );
      return;
    }
    try {
      setState("writing");
      setMessage("Hold an NFC tag or sticker to the back of your phone…");
      const reader = new Ctor();
      await reader.write({ records: [{ recordType: "url", data: url }] });
      setState("done");
      setMessage("Saved to your NFC tag! Tap it on a phone to share your card.");
    } catch (err) {
      setState("error");
      setMessage(
        err instanceof Error && err.name === "NotAllowedError"
          ? "NFC permission was denied. Allow NFC and try again."
          : "Couldn't write the tag. Make sure NFC is on and hold the tag steady.",
      );
    }
  }

  return (
    <div>
      <button
        onClick={writeTag}
        disabled={state === "writing"}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-medium hover:bg-surface-2 disabled:opacity-60"
      >
        {state === "writing" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "done" ? (
          <Check className="h-4 w-4 text-success" />
        ) : (
          <Nfc className="h-4 w-4" />
        )}
        Save to NFC tag
      </button>
      {message && (
        <p
          className={`mt-1.5 text-xs ${state === "error" ? "text-danger" : "text-muted"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
