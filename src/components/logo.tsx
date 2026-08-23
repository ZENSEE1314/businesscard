import { cn } from "@/lib/utils";

// App logo mark (the Konnect icon). Replaces the old plain "K" square.
export function Logo({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icon-192.png"
      alt="Konnect"
      width={size}
      height={size}
      className={cn("rounded-lg", className)}
      style={{ width: size, height: size }}
    />
  );
}
