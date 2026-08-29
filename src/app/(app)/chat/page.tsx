import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  listConversations,
  openDirectConversationByHandle,
} from "@/lib/chat";
import { Card } from "@/components/ui";
import { ChatAvatar } from "@/features/chat/chat-avatar";

export const dynamic = "force-dynamic";

function listTime(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / 86_400_000,
  );
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // /chat?with=<username> opens (or creates) the direct conversation with
  // that member — used by contact list, cards and anywhere "Message" is shown.
  const sp = await searchParams;
  const withHandle = sp.with?.trim();
  if (withHandle) {
    const conversationId = await openDirectConversationByHandle(
      withHandle,
      user.id,
    );
    if (conversationId) redirect(`/chat/${conversationId}`);
    // Unknown handle falls through to the list with a friendly notice.
  }

  const conversations = await listConversations(user.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-4">
      <div className="flex items-center justify-between px-1 pb-3">
        <h1 className="text-xl font-bold">Messages</h1>
        <span className="text-sm text-muted">
          {conversations.length} conversation
          {conversations.length === 1 ? "" : "s"}
        </span>
      </div>

      {withHandle && (
        <p
          role="alert"
          className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger"
        >
          No BridgeX member with the username &ldquo;{withHandle}&rdquo; was
          found.
        </p>
      )}

      {conversations.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h2 className="mt-3 font-semibold">No messages yet</h2>
          <p className="mt-1 text-sm text-muted">
            Open a contact and tap the message icon to start a conversation.
          </p>
          <Link
            href="/contacts"
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg transition-opacity hover:opacity-90"
          >
            Go to contacts
          </Link>
        </Card>
      ) : (
        <ul className="space-y-2">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/chat/${c.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition-colors hover:bg-surface-2"
              >
                <ChatAvatar
                  name={c.partner.name}
                  url={c.partner.avatarUrl}
                  size={48}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{c.partner.name}</p>
                    <span className="shrink-0 text-xs text-muted">
                      {c.lastMessage ? listTime(c.lastMessage.createdAt) : ""}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-muted">
                      {c.lastMessage && c.lastMessage.body
                        ? `${c.lastMessage.senderId === user.id ? "You: " : ""}${c.lastMessage.body}`
                        : "No messages yet — say hello!"}
                    </p>
                    {c.unread > 0 && (
                      <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                        {c.unread > 99 ? "99+" : c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
