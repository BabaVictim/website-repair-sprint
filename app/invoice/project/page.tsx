import type { Metadata } from "next";
import { InvoicePageContent } from "@/app/invoice/page";

export const metadata: Metadata = {
  title: "Support Bitcoin Invoice Builder",
  description:
    "Create an optional mainnet Bitcoin tip request for the open-source Website Repair Sprint tools.",
  alternates: {
    canonical:
      "https://babavictim.github.io/website-repair-sprint/invoice/project/",
  },
  openGraph: {
    title: "Support Bitcoin Invoice Builder",
    description:
      "Create an optional on-chain Bitcoin tip request for the open-source project.",
    type: "website",
    url: "https://babavictim.github.io/website-repair-sprint/invoice/project/",
  },
};

export default function ProjectSupportPage() {
  return <InvoicePageContent initialMode="project" />;
}
