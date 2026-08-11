import { MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

// Real-time chat (Socket.IO) is implemented in the messaging phase. This screen
// is the entry point; the conversation list and live messaging land next.
export default function ChatPage() {
  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4">
      <h1 className="px-1 pb-3 text-xl font-bold">Chat</h1>
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-3 font-medium">Messaging is coming online</p>
        <p className="mt-1 text-sm text-muted">
          Real-time private messaging is being wired up. You’ll be able to
          message any member or business directly from their profile.
        </p>
      </div>
    </div>
  );
}
