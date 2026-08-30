"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/client";

/**
 * Edits an owner's private label (category) and notes for a saved contact.
 * Opens an inline panel; saves via PATCH /api/contacts/:id.
 */
export function EditContactButton({
  contactId,
  name,
  initialCategory,
  initialNotes,
  categorySuggestions = [],
}: {
  contactId: string;
  name: string;
  initialCategory: string | null;
  initialNotes: string | null;
  categorySuggestions?: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(initialCategory ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await apiFetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify({ category: category.trim() || null, notes: notes.trim() || null }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not save.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label={`Edit ${name}`}
        title="Edit category & notes"
        className="grid h-10 w-10 place-items-center rounded-lg border border-border text-muted hover:bg-surface-2"
      >
        <Pencil className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="absolute right-2 top-2 z-10 w-64 rounded-xl border border-border bg-surface p-3 shadow-lg">
      <p className="mb-2 text-xs font-semibold text-muted">Edit {name}</p>
      <label className="block text-xs font-medium">Category</label>
      <input
        list="contact-categories"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="e.g. Supplier, Investor, Lead"
        className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm outline-none focus:border-brand-500"
      />
      <datalist id="contact-categories">
        {categorySuggestions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <label className="mt-2 block text-xs font-medium">Notes</label>
      <textarea
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Private notes about this contact"
        className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-500"
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={busy}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
