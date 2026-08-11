import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { env } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: `${env.appName} — Connect. Discover. Grow.`,
    template: `%s · ${env.appName}`,
  },
  description:
    "Build your professional profile, discover trusted businesses, connect directly and earn rewards.",
  openGraph: {
    siteName: env.appName,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
