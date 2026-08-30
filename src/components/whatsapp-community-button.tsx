import { MessageCircle } from "lucide-react";

// Public invite to the BridgeX WhatsApp community group.
const WHATSAPP_COMMUNITY_URL = "https://chat.whatsapp.com/FeRDlOrvhbjAp8cUaxS4uL";

/**
 * Button that opens the BridgeX WhatsApp community group chat in a new tab.
 * Shown on name cards and the post-signup welcome screen.
 */
export function WhatsAppCommunityButton({
  className = "",
  label = "Join our WhatsApp community",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={WHATSAPP_COMMUNITY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${className}`}
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </a>
  );
}
