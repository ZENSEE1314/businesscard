import Link from "next/link";
import { BadgeCheck, Trophy, MapPin, Users } from "lucide-react";
import { qrSvg } from "@/lib/qr";
import { absoluteUrl } from "@/lib/utils";
import { cardLinks, type CardView, type MediaItem } from "@/features/cards/queries";
import type { PublicConnection } from "@/features/cards/connections";
import { ContactActions, ShareButton } from "@/components/card/card-actions";
import { NfcButton } from "@/components/card/nfc-button";
import { InstallButton } from "@/components/install-button";

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

function MediaSection({ title, items }: { title: string; items: MediaItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map((m) => (
          <figure key={m.id} className="overflow-hidden rounded-lg bg-surface-2">
            {m.kind === "VIDEO" ? (
              <video
                src={m.url}
                controls
                playsInline
                preload="metadata"
                className="aspect-square w-full bg-black object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.url}
                alt={m.caption ?? ""}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
            )}
            {m.caption && (
              <figcaption className="px-2 py-1 text-xs text-muted">
                {m.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Up to seven connections shown below a public card (privacy-filtered). */
export function TopConnections({ connections }: { connections: PublicConnection[] }) {
  if (connections.length === 0) return null;
  return (
    <section className="mt-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Users className="h-4 w-4 text-brand-600" />
        Business Network
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
          Top {connections.length}
        </span>
      </h2>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {connections.map((c) => (
          <Link
            key={c.userId}
            href={`/u/${c.username}`}
            className="w-24 shrink-0 rounded-xl border border-border bg-surface p-2 text-center transition-colors hover:bg-surface-2"
          >
            <div className="relative mx-auto h-14 w-14">
              {c.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.avatarUrl}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                  {initials(c.name)}
                </div>
              )}
              <span className="absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {c.rank}
              </span>
            </div>
            <p className="mt-1.5 truncate text-xs font-semibold">{c.name}</p>
            <p className="truncate text-[11px] text-muted">
              {c.companyName ?? c.jobTitle ?? "Member"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export async function PublicCard({
  card,
  isGuest,
  isOwner = false,
  viewerSignedIn = false,
  connections = [],
  memberDaysLabel = null,
}: {
  card: CardView;
  isGuest: boolean;
  isOwner?: boolean;
  viewerSignedIn?: boolean;
  connections?: PublicConnection[];
  memberDaysLabel?: string | null;
}) {
  const links = cardLinks(card);
  const qr = await qrSvg(card.profileUrl);
  const vcardUrl = `/api/cards/vcard?type=${card.kind}&handle=${encodeURIComponent(card.handle)}`;
  // Sharing this card carries the owner's referral code, so anyone who joins
  // from it is registered under them. src/card tell the register API how the
  // visitor arrived (shared link, QR, NFC) so the contact relationship is
  // created automatically after signup.
  const registerHref = card.referralCode
    ? `/register?ref=${encodeURIComponent(card.referralCode)}&src=link&card=${encodeURIComponent(card.handle)}`
    : "/register";
  const messageHref = isGuest ? registerHref : "/chat";

  const socials = Object.entries(card.socials).filter(
    ([, v]) => v && v.trim().length > 0,
  ) as [string, string][];

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-lg">
        {/* Cover — video if set, else the whole image (never cropped) */}
        <div className="relative flex items-center justify-center bg-surface-2">
          {card.coverVideoUrl ? (
            <video
              src={card.coverVideoUrl}
              controls
              playsInline
              preload="metadata"
              className="max-h-72 w-full bg-black"
            />
          ) : card.coverUrl ? (
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
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
              <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {card.isBusiness ? "Business" : "Member"}
              </span>
              {memberDaysLabel && (
                <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">
                  {memberDaysLabel}
                </span>
              )}
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

          {card.headline && (
            <p className="mt-3 text-center text-sm font-medium">{card.headline}</p>
          )}

          {card.bio && (
            <p className="mt-3 text-center text-sm leading-relaxed text-muted">
              {card.bio}
            </p>
          )}

          {(card.whoIAm || card.whoIWantToFind || card.whatICanOffer) && (
            <div className="mt-4 space-y-3 border-t border-border pt-4 text-left">
              {card.whoIAm && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Who I am</p>
                  <p className="mt-1 text-sm leading-relaxed">{card.whoIAm}</p>
                </div>
              )}
              {card.whatICanOffer && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">What I can offer</p>
                  <p className="mt-1 text-sm leading-relaxed">{card.whatICanOffer}</p>
                </div>
              )}
              {card.whoIWantToFind && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Who I want to find</p>
                  <p className="mt-1 text-sm leading-relaxed">{card.whoIWantToFind}</p>
                </div>
              )}
            </div>
          )}

          {(card.canHelp.length > 0 || card.lookingFor.length > 0) && (
            <div className="mt-4 space-y-3">
              {card.canHelp.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {card.isBusiness ? "We can help with" : "I can help with"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {card.canHelp.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
                      >
                        ✓ {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {card.lookingFor.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {card.isBusiness ? "We're looking for" : "I'm looking for"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {card.lookingFor.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
                      >
                        🔍 {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
              saveInApp={
                !isOwner && viewerSignedIn && card.kind === "personal"
                  ? {
                      username: card.handle,
                      registerHref,
                      source: "SHARED_LINK",
                    }
                  : null
              }
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

          {/* Introduction & Products */}
          {(() => {
            const intro = card.media.filter((m) => m.section === "INTRO");
            const products = card.media.filter((m) => m.section === "PRODUCT");
            return (
              <>
                <MediaSection title="Introduction" items={intro} />
                <MediaSection title="Products & Services" items={products} />
              </>
            );
          })()}

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

      {/* Business network below the card */}
      {!isOwner && <TopConnections connections={connections} />}

      {/* Join CTA */}
      {isGuest && (
        <div className="mt-4 rounded-2xl bg-primary px-5 py-5 text-center text-primary-fg">
          <p className="font-semibold">Create your own free digital name card</p>
          <p className="mt-1 text-sm text-primary-fg/80">
            Share your profile anywhere in one tap.
          </p>
          <Link
            href={registerHref}
            className="mt-3 inline-flex h-10 items-center rounded-lg bg-white px-5 text-sm font-semibold text-brand-700"
          >
            Create your own free name card
          </Link>
        </div>
      )}

      {/* Save this card to the phone's home screen */}
      <div className="mt-4 flex justify-center">
        <InstallButton label="Add this card to Home Screen" />
      </div>
    </div>
  );
}
