import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import "./globals.css";
import { env } from "@/lib/env";
import { PwaRegister } from "@/components/pwa-register";
import { LocaleProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  applicationName: env.appName,
  title: {
    default: `${env.appName} — Your next opportunity is one connection away`,
    template: `%s · ${env.appName}`,
  },
  description:
    "Build your professional profile, discover trusted businesses, connect directly and earn rewards.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: env.appName,
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    siteName: env.appName,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${geistSans.variable} h-full antialiased`}>
      <head>
        {/* Apply the saved theme before first paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
