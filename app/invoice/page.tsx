import type { Metadata } from "next";
import Link from "next/link";
import { BitcoinInvoiceBuilder } from "@/components/bitcoin-invoice-builder";
import type { ReceiveMode } from "@/components/bitcoin-invoice-builder";

export const metadata: Metadata = {
  title: "Bitcoin Invoice Builder",
  description:
    "Create a mainnet Bitcoin payment request and QR code locally. The app sends no draft data and uses no analytics or persistent storage.",
  alternates: {
    canonical:
      "https://babavictim.github.io/website-repair-sprint/invoice/",
  },
  openGraph: {
    title: "Bitcoin Invoice Builder",
    description:
      "A private, client-side tool for creating Bitcoin payment URIs and QR codes.",
    type: "website",
    url: "https://babavictim.github.io/website-repair-sprint/invoice/",
  },
};

export function InvoicePageContent({
  initialMode = "custom",
}: {
  initialMode?: ReceiveMode;
}) {
  return (
    <main className="invoice-page">
      <header className="site-header">
        <Link
          className="brand"
          href="/"
          prefetch={false}
          aria-label="Website Repair Sprint home"
        >
          <span className="brand-mark" aria-hidden="true">
            +
          </span>
          <span>Repair Sprint</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/" prefetch={false}>
            Repair service
          </Link>
          <a href="#builder">Build a request</a>
          <a
            href="https://github.com/BabaVictim/website-repair-sprint"
            className="nav-cta"
          >
            Source
          </a>
        </nav>
      </header>

      <section className="invoice-intro">
        <p className="availability">Free, local, and open source</p>
        <h1>Bitcoin Invoice Builder</h1>
        <p className="lede">
          Create a mainnet on-chain payment request and QR code without an
          account. Draft data is processed locally and is not sent, tracked, or
          saved by this app.
        </p>
        <p className="invoice-definition">
          This is a wallet-compatible payment request, not a tax invoice,
          payment processor, or proof of payment.
        </p>
      </section>

      <section className="builder-section" id="builder">
        <BitcoinInvoiceBuilder initialMode={initialMode} />
      </section>

      <section className="invoice-safety" aria-labelledby="safety-heading">
        <div>
          <p className="output-kicker">Before using it</p>
          <h2 id="safety-heading">A QR code is convenient, not authoritative.</h2>
        </div>
        <ul>
          <li>
            Verify the complete recipient address and amount in the sending
            wallet. Bitcoin payments are irreversible.
          </li>
          <li>
            The sender normally pays the network fee separately. A generated
            request does not reserve a fee rate.
          </li>
          <li>
            Use a fresh receive address for each payment when your wallet
            supports it. Address reuse reduces privacy.
          </li>
          <li>
            This tool does not hold keys, connect to a wallet, monitor the
            network, or prove that a payment arrived.
          </li>
        </ul>
      </section>

      <footer>
        <p>Bitcoin Invoice Builder</p>
        <div>
          <Link href="/" prefetch={false}>
            Repair service
          </Link>
          <a href="#builder">Builder</a>
          <Link href="/third-party-notices.txt" prefetch={false}>
            Licenses
          </Link>
          <a href="https://github.com/BabaVictim/website-repair-sprint">
            Source
          </a>
        </div>
        <p className="footer-note">
          Public receive addresses only. Never paste a seed phrase, private key,
          WIF, or extended private key.
        </p>
      </footer>
    </main>
  );
}

export default function InvoicePage() {
  return <InvoicePageContent />;
}
