"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client";

// Business Opportunities post form — paid members only (page passes the gate).
export function OpportunityForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    section: "",
    priceNote: "",
    imageUrl: "",
    whatsapp: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await apiFetch("/api/marketplace", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) {
      setForm({ title: "", description: "", section: "", priceNote: "", imageUrl: "", whatsapp: "" });
      setMsg("Listing published.");
      router.refresh();
    } else {
      setMsg(res.error ?? "Failed to publish.");
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="mk-title">Listing title</Label>
          <Input
            id="mk-title"
            required
            minLength={3}
            maxLength={120}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Handmade batik products"
          />
        </div>
        <div>
          <Label htmlFor="mk-section">Section</Label>
          <select
            id="mk-section"
            required
            value={form.section}
            onChange={(e) => set("section", e.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
          >
            <option value="" disabled>
              Choose a section…
            </option>
            <option value="INVESTORS">Looking for investors</option>
            <option value="CUSTOMERS">Looking for customers</option>
            <option value="SUPPLIERS">Looking for suppliers</option>
            <option value="DISTRIBUTORS">Looking for distributors</option>
            <option value="PARTNERSHIP">Partnership opportunities</option>
            <option value="JOBS">Job &amp; service requests</option>
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="mk-price">Price label</Label>
            <Input
              id="mk-price"
              maxLength={80}
              value={form.priceNote}
              onChange={(e) => set("priceNote", e.target.value)}
              placeholder="Rp 250.000 / Negotiable"
            />
          </div>
          <div>
            <Label htmlFor="mk-wa">WhatsApp (optional)</Label>
            <Input
              id="mk-wa"
              maxLength={40}
              value={form.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              placeholder="+62 812 …"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="mk-desc">Description</Label>
          <Textarea
            id="mk-desc"
            maxLength={2000}
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What are you offering?"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="mk-img">Image URL (optional)</Label>
            <Input
              id="mk-img"
              type="url"
              value={form.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
              placeholder="https://…"
            />
          </div>
          
        </div>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          Publish listing
        </Button>
      </form>
    </Card>
  );
}
