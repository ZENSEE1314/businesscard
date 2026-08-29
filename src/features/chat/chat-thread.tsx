"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { cn } from "@/lib/utils";

export interface ThreadMessage {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor(
    (startOfToday.getTime() - startOfDay.getTime()) / 86_400_000,
  );
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

export function ChatThread({
  conversationId,
  meId,
  partnerName,
  disabled = false,
  initialMessages,
}: {
  conversationId: string;
  meId: string;
  partnerName: string;
  disabled?: boolean;
  initialMessages: ThreadMessage[];
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);

  // Keep the poller's view of the messages up to date (refs must not be
  // written during render).
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Keep the latest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Poll for new messages while the thread is open.
  useEffect(() => {
    if (disabled) return;
    let cancelled = false;
    async function poll() {
      const current = messagesRef.current;
      const last = current[current.length - 1];
      const qs = last ? `?after=${encodeURIComponent(last.createdAt)}` : "";
      const res = await apiFetch<{ messages: ThreadMessage[] }>(
        `/api/chat/conversations/${conversationId}/messages${qs}`,
      );
      if (cancelled || !res.ok) return;
      const fresh = res.data.messages ?? [];
      if (fresh.length === 0) return;
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        const additions = fresh.filter((m) => !known.has(m.id));
        return additions.length > 0 ? [...prev, ...additions] : prev;
      });
    }
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [conversationId, disabled]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const res = await apiFetch<{ message: ThreadMessage }>(
      `/api/chat/conversations/${conversationId}/messages`,
      { method: "POST", body: JSON.stringify({ body }) },
    );
    setSending(false);
    if (!res.ok) {
      setError(res.error ?? "Could not send. Please try again.");
      return;
    }
    setMessages((prev) => [...prev, res.data.message]);
    setDraft("");
  }

  // Day separators are derived purely from the message list — no mutation
  // during render.
  const withDays = messages.map((m, i) => {
    const day = dayLabel(m.createdAt);
    return {
      ...m,
      day,
      showDay: i === 0 || day !== dayLabel(messages[i - 1].createdAt),
    };
  });

  return (
    <div className="flex h-[calc(100dvh-11.5rem)] flex-col md:h-[calc(100dvh-9.5rem)]">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-1 overflow-y-auto px-1 py-3"
      >
        {messages.length === 0 && (
          <div className="grid h-full place-items-center px-6 text-center">
            <p className="text-sm text-muted">
              Say hello to {partnerName}! Messages are private between the two
              of you.
            </p>
          </div>
        )}
        {withDays.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id}>
              {m.showDay && (
                <div className="py-2 text-center">
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted">
                    {m.day}
                  </span>
                </div>
              )}
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%]",
                    mine
                      ? "rounded-br-md bg-primary text-primary-fg"
                      : "rounded-bl-md border border-border bg-surface",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={cn(
                      "mt-0.5 text-right text-[10px]",
                      mine ? "text-primary-fg/70" : "text-muted",
                    )}
                  >
                    {timeLabel(m.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="px-1 pb-1 text-xs text-danger">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex items-end gap-2 border-t border-border bg-surface p-3"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          disabled={disabled}
          placeholder={
            disabled
              ? "This member is no longer available."
              : `Message ${partnerName}…`
          }
          aria-label="Message"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-400"
        />
        <button
          type="submit"
          disabled={disabled || sending || draft.trim().length === 0}
          aria-label="Send message"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizontal className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}