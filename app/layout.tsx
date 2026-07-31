import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Website Preflight & 48-hour Repair Sprint",
    template: "%s · Website Repair Sprint",
  },
  description:
    "A $49 public-site preflight report or $300 fixed-scope repair sprint, paid in Bitcoin with written scope before payment.",
  alternates: {
    canonical: "https://babavictim.github.io/website-repair-sprint/",
  },
  openGraph: {
    title: "Website Preflight & 48-hour Repair Sprint",
    description:
      "Start with a $49 public-site report or book a $300 repair sprint with a tested patch and delivery evidence.",
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
        <link
          rel="sitemap"
          type="application/xml"
          href="https://babavictim.github.io/website-repair-sprint/sitemap.xml"
        />
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'none'; frame-src 'none'; img-src 'self' data: blob:; object-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; worker-src 'none'"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
