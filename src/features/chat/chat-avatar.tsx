// Circular-free avatar with initials fallback for chat lists and threads.
export function ChatAvatar({
  name,
  url,
  size = 48,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full border border-border object-cover"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size / 2.8) }}
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-accent font-bold text-white"
      aria-hidden
    >
      {initials}
    </div>
  );
}