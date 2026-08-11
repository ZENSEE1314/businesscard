import Link from "next/link";
import { BadgeCheck, Trophy, MapPin } from "lucide-react";
import { qrSvg } from "@/lib/qr";
import { absoluteUrl } from "@/lib/utils";
import { cardLinks, type CardView } from "@/features/cards/queries";
import { ContactActions, ShareButton } from "@/components/card/card-actions";
import { NfcButton } from "@/components/card/nfc-button";
import { env } from "@/lib/env";

function socialUrl(platform: string, value: string): string {
  const v = value.trim().replace(/^@/, "");
  if (v.startsWith("http")) return v;
  switch (platform) {
    case "instagram":
      return `https://instagram.com/${v}`;
    case "facebook":
      return `https://facebook.com/${v}`;
    case "tiktok":
      return `https://tiktok.com/@${v}`;
    case "linkedin":
      return v.includes("/") ? `https://${v}` : `https://linkedin.com/in/${v}`;
    case "telegram":
      return `https://t.me/${v}`;
    case "twitter":
      return `https://twitter.com/${v}`;
    default:
      return `https://${v}`;
  }
}

const socialLabel: Record<string, string> = {
  instagram: "IG",
  facebook: "f",
  tiktok: "TT",
  linkedin: "in",
  telegram: "TG",
  twitter: "X",
};

export async function PublicCard({
  card,
  isGuest,
  isOwner = false,
}: {
  card: CardView;
  isGuest: boolean;
  isOwner?: boolean;
}) {
  const links = cardLinks(card);
  const qr = await qrSvg(card.profileUrl);
  const vcardUrl = `/api/cards/vcard?type=${card.kind}&handle=${encodeURIComponent(card.handle)}`;
  const messageHref = isGuest ? "/register" : "/chat";

  const socials = Object.entries(card.socials).filter(
    ([, v]) => v && v.trim().length > 0,
  ) as [string, string][];

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-lg">
        {/* Cover — show the whole image, never cropped */}
        <div className="relative flex items-center justify-center bg-surface-2">
          {card.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.coverUrl}
              alt=""
              className="max-h-72 w-full object-contain"
            />
          ) : (
            <div className="h-32 w-full bg-gradient-to-br from-brand-500 to-accent" />
          )}
        </div>

        <div className="px-5 pb-6">
          {/* Avatar — centered in front of the cover; box fits the photo so the
              whole image shows edge to edge, with no crop and no empty bars.
              relative z-10 keeps it painted above the positioned cover. */}
          <div className="relative z-10 -mt-14 mb-3 flex justify-center">
            {card.avatarUrl ? (
              <div className="w-32 overflow-hidden rounded-2xl border-4 border-surface bg-surface-2 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.avatarUrl}
                  alt={card.name}
                  className="block h-auto w-full"
                />
              </div>
            ) : (
              <div className="grid h-28 w-28 place-items-center rounded-2xl border-4 border-surface bg-brand-50 text-2xl font-bold text-brand-700 shadow-md">
                {card.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Identity — centered */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-xl font-bold">{card.name}</h1>
              {card.verified && (
                <BadgeCheck className="h-5 w-5 text-blue-500" aria-label="Verified" />
              )}
            </div>
            {card.subtitle && <p className="text-sm text-muted">{card.subtitle}</p>}
            {card.org && <p className="text-sm font-medium">{card.org}</p>}
            <div className="mt-1.5 flex justify-center">
              <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {card.isBusiness ? "Business" : "Member"}
              </span>
            </div>

            {/* Awards */}
            {card.awards.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {card.awards.map((a, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    {a.name}
                    {a.year ? ` ${a.year}` : ""}
                  </span>
                ))}
              </div>
            )}
          </div>

          {card.bio && (
            <p className="mt-4 text-center text-sm leading-relaxed">{card.bio}</p>
          )}

          {/* Actions */}
          <div className="mt-5 space-y-2">
            <ContactActions
              targetId={card.userId}
              vcardUrl={vcardUrl}
              whatsapp={links.whatsapp}
              tel={links.tel}
              mailto={links.mailto}
              website={links.website}
              messageHref={messageHref}
              isOwner={isOwner}
              editHref="/me/edit"
            />
            <ShareButton targetId={card.userId} url={card.profileUrl} title={card.name} />
            <NfcButton cardUrl={card.profileUrl} vcardUrl={absoluteUrl(vcardUrl)} />
          </div>

          {/* Contact details */}
          {(card.address || card.city || card.country) && (
            <div className="mt-5 border-t border-border pt-4 text-sm text-muted">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {[card.address, card.city, card.country].filter(Boolean).join(", ")}
                </span>
              </div>
            </div>
          )}

          {/* Socials */}
          {socials.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {socials.map(([platform, value]) => (
                <a
                  key={platform}
                  href={socialUrl(platform, value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-10 w-10 place-items-center rounded-full border border-border text-xs font-semibold hover:bg-surface-2"
                  aria-label={platform}
                >
                  {socialLabel[platform] ?? platform.charAt(0).toUpperCase()}
                </a>
              ))}
            </div>
          )}

          {/* QR */}
          <div className="mt-6 flex flex-col items-center border-t border-border pt-5">
            <div
              className="h-40 w-40 [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <p className="mt-2 text-xs text-muted">Scan to open this card</p>
            <a
              href={`/api/cards/qr?type=${card.kind}&handle=${encodeURIComponent(card.handle)}`}
              className="mt-1 text-xs font-medium text-primary"
            >
              Download QR
            </a>
          </div>
        </div>
      </div>

      {/* Join CTA */}
      {isGuest && (
        <div className="mt-4 rounded-2xl bg-primary px-5 py-5 text-center text-primary-fg">
          <p className="font-semibold">Create your own free digital name card</p>
          <p className="mt-1 text-sm text-primary-fg/80">
            Share your profile anywhere in one tap.
          </p>
          <Link
            href="/register"
            className="mt-3 inline-flex h-10 items-center rounded-lg bg-white px-5 text-sm font-semibold text-brand-700"
          >
            Join {env.appName}
          </Link>
        </div>
      )}
    </div>
  );
}
