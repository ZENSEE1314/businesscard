"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Pencil, X } from "lucide-react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client";

interface Project {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  link: string | null;
}

const EMPTY = { title: "", description: "", imageUrl: "", link: "" };

/**
 * Manage the portfolio projects shown on the member's card. Others can rate and
 * comment on each project from the public card.
 */
export function ProjectsManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await apiFetch<{ projects: Project[] }>("/api/projects");
      if (res.ok && res.data) setProjects(res.data.projects);
      setLoading(false);
    })();
  }, []);

  function reset() {
    setForm({ ...EMPTY });
    setEditingId(null);
    setError(null);
  }

  async function save() {
    if (!form.title.trim()) {
      setError("Add a project title.");
      return;
    }
    setBusy(true);
    setError(null);
    const body = JSON.stringify(form);
    const res = editingId
      ? await apiFetch<{ project: Project }>(`/api/projects/${editingId}`, { method: "PATCH", body })
      : await apiFetch<{ project: Project }>("/api/projects", { method: "POST", body });
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Could not save the project.");
      return;
    }
    const saved = res.data.project;
    setProjects((prev) =>
      editingId ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved],
    );
    reset();
  }

  async function remove(id: string) {
    if (!confirm("Delete this project?")) return;
    const prev = projects;
    setProjects((p) => p.filter((x) => x.id !== id));
    const res = await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) setProjects(prev);
  }

  function edit(p: Project) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      description: p.description ?? "",
      imageUrl: p.imageUrl ?? "",
      link: p.link ?? "",
    });
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="font-semibold">Projects</h2>
        <p className="text-sm text-muted">
          Add projects you’ve done before. Others can rate and comment on them.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted">
          <Loader2 className="inline h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : projects.length > 0 ? (
        <ul className="space-y-2">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.title}</p>
                {p.description && (
                  <p className="truncate text-xs text-muted">{p.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => edit(p)}
                aria-label="Edit project"
                className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted hover:bg-surface-2"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label="Delete project"
                className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted hover:bg-red-50 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No projects yet.</p>
      )}

      <div className="rounded-xl border border-border bg-surface-2 p-3">
        <p className="mb-2 text-sm font-medium">
          {editingId ? "Edit project" : "Add a project"}
        </p>
        <div className="space-y-2">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Brand redesign for X" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What you did and the outcome" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label>Image URL (optional)</Label>
              <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
            </div>
            <div>
              <Label>Link (optional)</Label>
              <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…" />
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Save changes" : "Add project"}
            </Button>
            {editingId && (
              <Button type="button" size="sm" variant="ghost" onClick={reset}>
                <X className="h-4 w-4" /> Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
