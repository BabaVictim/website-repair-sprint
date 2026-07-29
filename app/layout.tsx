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
  metadataBase: new URL("https://repair-sprint-atfc.openai.site"),
  openGraph: {
    title: "48-hour Website Repair Sprint",
    description:
      "One focused pass on an existing website. Tested patch, before/after report, and one revision.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
