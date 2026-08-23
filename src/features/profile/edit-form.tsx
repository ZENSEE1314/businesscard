"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, ImagePlus, Video, X } from "lucide-react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client";

type Dict = Record<string, unknown>;

function useForm<T extends Dict>(initial: T) {
  const [state, setState] = useState<T>(initial);
  function set<K extends keyof T>(key: K, value: T[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }
  return { state, set };
}

function ImageUpload({
  label,
  folder,
  value,
  onChange,
  kind = "image",
}: {
  label: string;
  folder: string;
  value: string | null;
  onChange: (url: string) => void;
  kind?: "image" | "video";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.ok) {
      setError(json.error ?? "Upload failed.");
      return;
    }
    onChange(json.data.url as string);
  }

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface-2 text-muted">
          {value ? (
            kind === "video" ? (
              <video src={value} className="h-full w-full object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <Upload className="h-5 w-5" />
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            Remove
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={kind === "video" ? "video/*" : "image/*"}
          className="hidden"
          onChange={onFile}
        />
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}

export interface MediaItemState {
  id: string;
  kind: "IMAGE" | "VIDEO";
  section: "PRODUCT" | "INTRO";
  url: string;
  caption: string | null;
}

function MediaManager({
  title,
  section,
  folder,
  initial,
}: {
  title: string;
  section: "PRODUCT" | "INTRO";
  folder: string;
  initial: MediaItemState[];
}) {
  const [items, setItems] = useState<MediaItemState[]>(initial);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);

  async function add(file: File, kind: "IMAGE" | "VIDEO") {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const up = await fetch("/api/upload", { method: "POST", body: fd });
    const uj = await up.json().catch(() => ({}));
    if (up.ok && uj.ok) {
      const res = await apiFetch<{ media: MediaItemState }>("/api/business/media", {
        method: "POST",
        body: JSON.stringify({ section, kind, url: uj.data.url }),
      });
      if (res.ok && res.data) setItems((i) => [...i, res.data!.media]);
    }
    setBusy(false);
  }

  async function remove(id: string) {
    const res = await apiFetch(`/api/business/media/${id}`, { method: "DELETE" });
    if (res.ok) setItems((i) => i.filter((x) => x.id !== id));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label className="mb-0">{title}</Label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => imgRef.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Photo
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => vidRef.current?.click()}>
            <Video className="h-4 w-4" /> Video
          </Button>
        </div>
      </div>
      <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) add(f, "IMAGE"); e.target.value = ""; }} />
      <input ref={vidRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) add(f, "VIDEO"); e.target.value = ""; }} />
      {items.length === 0 ? (
        <p className="text-xs text-muted">No {title.toLowerCase()} yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((m) => (
            <div key={m.id} className="relative overflow-hidden rounded-lg border border-border bg-surface-2">
              {m.kind === "VIDEO" ? (
                <video src={m.url} className="aspect-square w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="aspect-square w-full object-cover" />
              )}
              <button type="button" onClick={() => remove(m.id)} className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white" aria-label="Remove">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TagInput({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  function add(raw: string) {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !value.includes(s));
    if (parts.length) onChange([...value, ...parts].slice(0, 12));
    setDraft("");
  }
  return (
    <div>
      <Label>{label}</Label>
      {hint && <p className="-mt-1 mb-1.5 text-xs text-muted">{hint}</p>}
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
            >
              {t}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== t))}
                aria-label={`Remove ${t}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        value={draft}
        placeholder={placeholder ?? "Type and press Enter"}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
      />
    </div>
  );
}

interface Props {
  role: string;
  profile: Dict;
  business: Dict | null;
  categories: { id: string; name: string }[];
  media?: MediaItemState[];
}

export function ProfileEditForm({
  role,
  profile,
  business,
  categories,
  media = [],
}: Props) {
  const router = useRouter();
  const p = useForm({
    fullName: (profile.fullName as string) ?? "",
    displayName: (profile.displayName as string) ?? "",
    headline: (profile.headline as string) ?? "",
    canHelp: (profile.canHelp as string[]) ?? [],
    lookingFor: (profile.lookingFor as string[]) ?? [],
    jobTitle: (profile.jobTitle as string) ?? "",
    companyName: (profile.companyName as string) ?? "",
    bio: (profile.bio as string) ?? "",
    phone: (profile.phone as string) ?? "",
    whatsapp: (profile.whatsapp as string) ?? "",
    email: (profile.email as string) ?? "",
    website: (profile.website as string) ?? "",
    address: (profile.address as string) ?? "",
    city: (profile.city as string) ?? "",
    country: (profile.country as string) ?? "",
    instagram: (profile.instagram as string) ?? "",
    facebook: (profile.facebook as string) ?? "",
    tiktok: (profile.tiktok as string) ?? "",
    linkedin: (profile.linkedin as string) ?? "",
    telegram: (profile.telegram as string) ?? "",
    twitter: (profile.twitter as string) ?? "",
    showPhone: (profile.showPhone as boolean) ?? true,
    showEmail: (profile.showEmail as boolean) ?? true,
    showWhatsapp: (profile.showWhatsapp as boolean) ?? true,
    showAddress: (profile.showAddress as boolean) ?? true,
    avatarUrl: (profile.avatarUrl as string) ?? "",
    coverUrl: (profile.coverUrl as string) ?? "",
    coverVideoUrl: (profile.coverVideoUrl as string) ?? "",
  });

  const b = useForm({
    name: (business?.name as string) ?? "",
    ownerName: (business?.ownerName as string) ?? "",
    showOwner: (business?.showOwner as boolean) ?? true,
    headline: (business?.headline as string) ?? "",
    canHelp: (business?.canHelp as string[]) ?? [],
    lookingFor: (business?.lookingFor as string[]) ?? [],
    description: (business?.description as string) ?? "",
    categoryId: (business?.categoryId as string) ?? "",
    phone: (business?.phone as string) ?? "",
    whatsapp: (business?.whatsapp as string) ?? "",
    email: (business?.email as string) ?? "",
    website: (business?.website as string) ?? "",
    address: (business?.address as string) ?? "",
    mapUrl: (business?.mapUrl as string) ?? "",
    city: (business?.city as string) ?? "",
    country: (business?.country as string) ?? "",
    instagram: (business?.instagram as string) ?? "",
    facebook: (business?.facebook as string) ?? "",
    tiktok: (business?.tiktok as string) ?? "",
    linkedin: (business?.linkedin as string) ?? "",
    telegram: (business?.telegram as string) ?? "",
    twitter: (business?.twitter as string) ?? "",
    logoUrl: (business?.logoUrl as string) ?? "",
    coverUrl: (business?.coverUrl as string) ?? "",
    coverVideoUrl: (business?.coverVideoUrl as string) ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isBusiness = role === "BUSINESS" && business;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const profileRes = await apiFetch("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(p.state),
    });
    if (!profileRes.ok) {
      setSaving(false);
      setError(profileRes.error ?? "Could not save.");
      return;
    }

    if (isBusiness) {
      const bizRes = await apiFetch("/api/business", {
        method: "PATCH",
        body: JSON.stringify(b.state),
      });
      if (!bizRes.ok) {
        setSaving(false);
        setError(bizRes.error ?? "Could not save business profile.");
        return;
      }
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
          Saved! Your card is updated.
        </div>
      )}

      {/* Personal */}
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Your details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUpload
            label="Profile photo"
            folder="avatar"
            value={p.state.avatarUrl || null}
            onChange={(url) => p.set("avatarUrl", url)}
          />
          <ImageUpload
            label="Cover image"
            folder="cover"
            value={p.state.coverUrl || null}
            onChange={(url) => p.set("coverUrl", url)}
          />
          <ImageUpload
            kind="video"
            label="Cover video (optional)"
            folder="cover-video"
            value={p.state.coverVideoUrl || null}
            onChange={(url) => p.set("coverVideoUrl", url)}
          />
        </div>
        <Field label="Full name" value={p.state.fullName} onChange={(v) => p.set("fullName", v)} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name" value={p.state.displayName} onChange={(v) => p.set("displayName", v)} />
          <Field label="Job title" value={p.state.jobTitle} onChange={(v) => p.set("jobTitle", v)} />
        </div>
        <Field label="Company" value={p.state.companyName} onChange={(v) => p.set("companyName", v)} />
        <Field
          label="What I do (headline)"
          value={p.state.headline}
          onChange={(v) => p.set("headline", v)}
          placeholder="e.g. Professional crypto education & trading community"
        />
        <TagInput
          label="I can help with"
          hint="Add tags — press Enter or comma"
          value={p.state.canHelp}
          onChange={(v) => p.set("canHelp", v)}
          placeholder="e.g. Marketing, Distribution, Investment"
        />
        <TagInput
          label="I'm looking for"
          hint="What do you want from your network?"
          value={p.state.lookingFor}
          onChange={(v) => p.set("lookingFor", v)}
          placeholder="e.g. Investors, Distributors, Partners"
        />
        <div>
          <Label>Bio</Label>
          <Textarea rows={3} value={p.state.bio} onChange={(e) => p.set("bio", e.target.value)} />
        </div>
      </Card>

      {/* Contact + privacy */}
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" value={p.state.phone} onChange={(v) => p.set("phone", v)} />
          <Field label="WhatsApp" value={p.state.whatsapp} onChange={(v) => p.set("whatsapp", v)} />
          <Field label="Email" type="email" value={p.state.email} onChange={(v) => p.set("email", v)} />
          <Field label="Website" value={p.state.website} onChange={(v) => p.set("website", v)} placeholder="https://" />
          <Field label="City" value={p.state.city} onChange={(v) => p.set("city", v)} />
          <Field label="Country" value={p.state.country} onChange={(v) => p.set("country", v)} />
        </div>
        <Field label="Address" value={p.state.address} onChange={(v) => p.set("address", v)} />
        <div className="grid grid-cols-2 gap-2 pt-1 text-sm">
          {(
            [
              ["showPhone", "Show phone"],
              ["showWhatsapp", "Show WhatsApp"],
              ["showEmail", "Show email"],
              ["showAddress", "Show address"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={p.state[key] as boolean}
                onChange={(e) => p.set(key, e.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              {label}
            </label>
          ))}
        </div>
      </Card>

      {/* Socials */}
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Social links</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Instagram" value={p.state.instagram} onChange={(v) => p.set("instagram", v)} />
          <Field label="Facebook" value={p.state.facebook} onChange={(v) => p.set("facebook", v)} />
          <Field label="TikTok" value={p.state.tiktok} onChange={(v) => p.set("tiktok", v)} />
          <Field label="LinkedIn" value={p.state.linkedin} onChange={(v) => p.set("linkedin", v)} />
          <Field label="Telegram" value={p.state.telegram} onChange={(v) => p.set("telegram", v)} />
          <Field label="X / Twitter" value={p.state.twitter} onChange={(v) => p.set("twitter", v)} />
        </div>
      </Card>

      {/* Business */}
      {isBusiness && (
        <Card className="space-y-4 p-5">
          <h2 className="font-semibold">Business profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageUpload
              label="Business logo"
              folder="logo"
              value={b.state.logoUrl || null}
              onChange={(url) => b.set("logoUrl", url)}
            />
            <ImageUpload
              label="Business cover"
              folder="business-cover"
              value={b.state.coverUrl || null}
              onChange={(url) => b.set("coverUrl", url)}
            />
            <ImageUpload
              kind="video"
              label="Cover video (optional)"
              folder="cover-video"
              value={b.state.coverVideoUrl || null}
              onChange={(url) => b.set("coverVideoUrl", url)}
            />
          </div>
          <Field label="Business name" value={b.state.name} onChange={(v) => b.set("name", v)} required />
          <div>
            <Label>Category</Label>
            <select
              value={b.state.categoryId}
              onChange={(e) => b.set("categoryId", e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="What we do (headline)"
            value={b.state.headline}
            onChange={(v) => b.set("headline", v)}
            placeholder="e.g. B2B logistics connecting SG & Indonesia"
          />
          <TagInput
            label="We can help with"
            value={b.state.canHelp}
            onChange={(v) => b.set("canHelp", v)}
            placeholder="e.g. Manufacturing, Packaging, Supply Chain"
          />
          <TagInput
            label="We're looking for"
            value={b.state.lookingFor}
            onChange={(v) => b.set("lookingFor", v)}
            placeholder="e.g. Distributors, Retailers, Partners"
          />
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={b.state.description} onChange={(e) => b.set("description", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" value={b.state.phone} onChange={(v) => b.set("phone", v)} />
            <Field label="WhatsApp" value={b.state.whatsapp} onChange={(v) => b.set("whatsapp", v)} />
            <Field label="Email" type="email" value={b.state.email} onChange={(v) => b.set("email", v)} />
            <Field label="Website" value={b.state.website} onChange={(v) => b.set("website", v)} placeholder="https://" />
            <Field label="City" value={b.state.city} onChange={(v) => b.set("city", v)} />
            <Field label="Country" value={b.state.country} onChange={(v) => b.set("country", v)} />
          </div>
          <Field label="Address" value={b.state.address} onChange={(v) => b.set("address", v)} />
          <Field label="Map link" value={b.state.mapUrl} onChange={(v) => b.set("mapUrl", v)} placeholder="https://maps.google.com/…" />

          <div className="space-y-4 border-t border-border pt-4">
            <MediaManager
              title="Introduction"
              section="INTRO"
              folder="intro"
              initial={media.filter((m) => m.section === "INTRO")}
            />
            <MediaManager
              title="Products & Services"
              section="PRODUCT"
              folder="product"
              initial={media.filter((m) => m.section === "PRODUCT")}
            />
          </div>
        </Card>
      )}

      <div className="sticky bottom-16 z-10 md:bottom-0">
        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
