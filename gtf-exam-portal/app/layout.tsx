import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { BRAND } from "@/lib/config";
import { AuthProvider } from "@/lib/auth-context";
import { CapacitorBridge } from "@/components/CapacitorBridge";
import "./globals.css";
import "./obsidian-theme.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.gatewaytofuture.com"),
  title: `${BRAND.name} (${BRAND.shortName}) — German Academy & Studienkolleg Hub`,
  description: `${BRAND.name} (${BRAND.shortName}) — ${BRAND.tagline}. Multi-division German ecosystem: German Language Academy (A1.1–B2.2), Studienkolleg Hub (T, M, W, G Kurs), and Fachsprache Pflege & Dual Ausbildung.`,
  manifest: "/manifest.json?v=gtf-official",
  other: {
    google: "notranslate",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BRAND.appName,
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=gtf-official", sizes: "any" },
      { url: "/icons/favicon-32.png?v=gtf-official", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png?v=gtf-official", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=gtf-official", sizes: "512x512", type: "image/png" },
      { url: "/icon.png?v=gtf-official", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico?v=gtf-official"],
    apple: [
      { url: "/apple-icon.png?v=gtf-official", sizes: "180x180", type: "image/png" },
      { url: "/icons/apple-touch-icon.png?v=gtf-official", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" translate="no" className="notranslate h-full antialiased bg-slate-50 text-slate-900">
      <head>
        <meta name="google" content="notranslate" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50 text-slate-900 selection:bg-slate-900 selection:text-white">
        <AuthProvider>
          <CapacitorBridge />
          {children}
        </AuthProvider>
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || "G-CFB6FD052Q"} />
      </body>
    </html>
  );
}
