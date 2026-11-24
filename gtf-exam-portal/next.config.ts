import path from "path";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Microphone is required for the Sprechen recorder; payment=(self) for Razorpay/Stripe.
  { key: "Permissions-Policy", value: "microphone=(self), payment=(self), camera=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  // googleapis and firebase-admin are large and Node-only: keep them out of the server bundle.
  serverExternalPackages: ["googleapis", "firebase-admin"],
  outputFileTracingRoot: path.join(__dirname),
  // Scope offline data/PDF inclusions strictly to the routes that use them.
  outputFileTracingIncludes: {
    "/api/drive/stream-pdf": ["./data/pdfs/**/*"],
    "/api/workbooks/[id]": ["./data/question_banks/**/*"],
    "/api/catalog": ["./data/catalog.json", "./data/question_banks/**/*"],
    "/api/questions": ["./data/question_banks/**/*"],
    "/api/drive/fetch-test": ["./data/question_banks/**/*"],
  },
  // Exclude static CDN assets, Python venv/content-factory, mobile builds & caches from serverless functions.
  // Leading slash ensures picomatch({ contains: true }) matches directory boundaries (never `gaxios` or `node_modules/*/out`).
  outputFileTracingExcludes: {
    "*": [
      "/public/audio/**",
      "/public/vault_fallback/**",
      "/public/materials/**",
      "/public/images/**",
      "/public/backgrounds/**",
      "/content-factory/**",
      "/content_factory/**",
      "/android/**",
      "/ios/**",
      "/.local-store/**",
      "/.firebase/**",
      "/firebase-hosting/**",
      "/.next/cache/**",
      "/BACKUP_TO_GOOGLE_DRIVE/**",
      "/chrome_gtf_profile/**",
    ],
    "/api/**/*": [
      "/public/audio/**",
      "/public/vault_fallback/**",
      "/public/materials/**",
      "/public/images/**",
      "/public/backgrounds/**",
      "/content-factory/**",
      "/content_factory/**",
      "/android/**",
      "/ios/**",
      "/.local-store/**",
      "/.firebase/**",
      "/firebase-hosting/**",
      "/.next/cache/**",
      "/BACKUP_TO_GOOGLE_DRIVE/**",
      "/chrome_gtf_profile/**",
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/stream-pdf",
        destination: "/api/drive/stream-pdf",
      },
      {
        source: "/api/stream-audio",
        destination: "/api/drive/stream-audio",
      },
      {
        source: "/audio/:file([^/]+\\.mp3)",
        destination: "/audio/hoeren/:file",
      },
      {
        source: "/assets/images/sarbjit-ceo.jpg",
        destination: "/sarbjit-ceo.jpg",
      },
      {
        source: "/images/sarbjit-ceo.jpg",
        destination: "/sarbjit-ceo.jpg",
      },
      {
        source: "/public/:path*",
        destination: "/:path*",
      },
      {
        source: "/dashboard/exam/:path*",
        destination: "/exam/:path*",
      },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/audio/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, HEAD, OPTIONS" },
          { key: "Accept-Ranges", value: "bytes" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
      {
        source: "/.well-known/assetlinks.json",
        headers: [
          { key: "Content-Type", value: "application/json; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=300, must-revalidate" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
      {
        // Protected media & admin routes must never be cached by shared caches or indexed.
        source: "/api/drive/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
