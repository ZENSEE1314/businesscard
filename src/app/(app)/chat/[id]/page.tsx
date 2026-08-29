import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getConversationForUser,
  listMessages,
  markConversationRead,
  ChatError,
} from "@/lib/chat";
import { ChatAvatar } from "@/features/chat/chat-avatar";
import { ChatThread } from "@/features/chat/chat-thread";

export const dynamic = "force-dynamic";

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  let partner = null;
  let messages = [];
  try {
    const convo = await getConversationForUser(id, user.id);
    partner = convo.partner;
    messages = await listMessages(id);
    // Opening the thread marks it as read.
    await markConversationRead(id, user.id);
  } catch (err) {
    if (err instanceof ChatError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto w-full max-w-2xl sm:px-4">
      {/* Thread header — sticks right under the app header */}
      <div className="sticky top-14 z-20 -mx-3 flex items-center gap-3 border-b border-border bg-surface/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4">
        <Link
          href="/chat"
          aria-label="Back to messages"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted hover:bg-surface-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {partner ? partner.name : "Conversation"}
          </p>
          {partner?.subtitle && (
            <p className="truncate text-xs text-muted">{partner.subtitle}</p>
          )}
        </div>
        {partner && <ChatAvatar name={partner.name} url={partner.avatarUrl} size={36} />}
        {partner?.username && (
          <Link
            href={`/u/${partner.username}`}
            className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-2"
          >
            View card
          </Link>
        )}
      </div>

      <ChatThread
        conversationId={id}
        meId={user.id}
        partnerName={partner?.name ?? "Member"}
        disabled={!partner}
        initialMessages={messages.map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          senderId: m.senderId,
          senderName: m.senderName,
        }))}
      />
    </div>
  );
}