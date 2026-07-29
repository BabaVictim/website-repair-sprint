import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "48-hour Website Repair Sprint",
    template: "%s · Website Repair Sprint",
  },
  description:
    "A fixed-scope engineering sprint for broken mobile layouts, forms, accessibility, metadata, and performance regressions.",
  metadataBase: new URL(
    "https://babavictim.github.io/website-repair-sprint/",
  ),
  alternates: {
    canonical: "https://babavictim.github.io/website-repair-sprint/",
  },
  openGraph: {
    title: "48-hour Website Repair Sprint",
    description:
      "One focused pass on an existing website. Tested patch, before/after report, and one revision.",
    type: "website",
    url: "https://babavictim.github.io/website-repair-sprint/",
  },
  robots: {
    index: true,
    follow: true,
  },
  referrer: "no-referrer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'none'; frame-src 'none'; img-src 'self' data: blob:; object-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; worker-src 'none'"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
