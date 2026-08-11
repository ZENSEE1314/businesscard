"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client";

interface UploadedImage {
  url: string;
  thumbUrl?: string;
  width?: number;
  height?: number;
}

const CTA_OPTIONS = [
  { value: "NONE", label: "No button" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "CALL", label: "Call" },
  { value: "WEBSITE", label: "Visit website" },
  { value: "CONTACT", label: "Contact us" },
] as const;

export function Composer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [location, setLocation] = useState("");
  const [ctaType, setCtaType] = useState<string>("NONE");
  const [ctaValue, setCtaValue] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 10 - images.length);
    if (!files.length) return;
    setUploading(true);
    setError(null);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "post");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setImages((imgs) => [...imgs, json.data as UploadedImage]);
      } else {
        setError(json.error ?? "Image upload failed.");
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    if (!body.trim()) {
      setError("Write something first.");
      return;
    }
    setPosting(true);
    setError(null);
    const res = await apiFetch("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        body,
        location,
        ctaType,
        ctaValue: ctaType === "NONE" ? "" : ctaValue,
        images,
      }),
    });
    setPosting(false);
    if (!res.ok) {
      setError(res.error ?? "Could not publish.");
      return;
    }
    setBody("");
    setLocation("");
    setCtaType("NONE");
    setCtaValue("");
    setImages([]);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm text-muted shadow-sm hover:bg-surface-2"
      >
        Share an update with your customers…
      </button>
    );
  }

  return (
    <Card className="mb-4 space-y-3 p-4">
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      <Textarea
        autoFocus
        rows={4}
        placeholder="What's new?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumbUrl ?? img.url} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Input placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />

      <div className="flex flex-wrap gap-2">
        <select
          value={ctaType}
          onChange={(e) => setCtaType(e.target.value)}
          className="h-11 rounded-lg border border-border bg-surface px-3 text-sm"
        >
          {CTA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {ctaType !== "NONE" && ctaType !== "CONTACT" && (
          <Input
            className="flex-1"
            placeholder={ctaType === "WEBSITE" ? "https://…" : "Phone / WhatsApp number"}
            value={ctaValue}
            onChange={(e) => setCtaValue(e.target.value)}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || images.length >= 10}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Photos
        </Button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={submit} disabled={posting}>
            {posting ? "Posting…" : "Post"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
