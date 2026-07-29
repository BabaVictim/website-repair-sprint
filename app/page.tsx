import Link from "next/link";
import { CopyAddress } from "@/components/copy-address";

const requestUrl =
  "https://github.com/BabaVictim/website-repair-sprint/issues/new?template=repair-request.yml";

const serviceStructuredData = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "48-hour Website Repair Sprint",
  serviceType: "Website repair and frontend engineering",
  description:
    "A fixed-scope engineering sprint for existing websites with a tested patch, before-and-after report, and one focused revision.",
  url: "https://babavictim.github.io/website-repair-sprint/",
  offers: {
    "@type": "Offer",
    price: "300",
    priceCurrency: "USD",
    availability: "https://schema.org/LimitedAvailability",
    url: requestUrl,
  },
};

const included = [
  "Mobile layout and visible UI breakage",
  "Forms, calls to action, and broken interaction paths",
  "Basic accessibility and keyboard fixes",
  "Metadata, social previews, and obvious SEO gaps",
  "Performance regressions that fit the existing stack",
  "A tested patch or pull request and before/after report",
];

const notIncluded = [
  "A full redesign or brand exercise",
  "A new backend, app, or content migration",
  "Paid third-party services or hosting changes",
  "Production access before the scope is agreed",
];

const steps = [
  {
    number: "01",
    title: "Show the problem",
    text: "Send the public URL, stack, and the one or two outcomes that matter most. Never post credentials in the request.",
  },
  {
    number: "02",
    title: "Agree the boundary",
    text: "You receive a written scope, exclusions, delivery time, and BTC invoice amount before work starts.",
  },
  {
    number: "03",
    title: "Repair and verify",
    text: "The site is fixed in an isolated branch and checked across viewport, interaction, accessibility, and build paths.",
  },
  {
    number: "04",
    title: "Review the evidence",
    text: "You get the patch, checks run, before/after notes, and one focused revision. You control the merge and deployment.",
  },
];

export default function Home() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceStructuredData).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Website Repair Sprint home">
          <span className="brand-mark" aria-hidden="true">
            +
          </span>
          <span>Repair Sprint</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#scope">Scope</a>
          <a href="#process">Process</a>
          <a href="#price">Price</a>
          <Link href="/invoice/">Invoice tool</Link>
          <a className="nav-cta" href={requestUrl}>
            Request a sprint
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="availability">Two introductory slots available</p>
          <h1>Fix the broken parts of your website in 48 hours.</h1>
          <p className="lede">
            One focused engineering sprint for an existing site. Mobile layout,
            forms, accessibility, metadata, and practical performance fixes—then
            a tested patch and a plain-English report.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href={requestUrl}>
              Request a sprint
            </a>
            <a className="button button-secondary" href="#scope">
              See the exact scope
            </a>
          </div>
          <p className="quiet">
            No redesign pitch. No retainer. No production access until the work
            is agreed.
          </p>
        </div>

        <aside className="delivery-card" aria-label="Sprint delivery summary">
          <h2>What you receive</h2>
          <dl>
            <div>
              <dt>Turnaround</dt>
              <dd>2 working days</dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd>$300 in BTC</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>Patch or pull request</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>Checks + before/after report</dd>
            </div>
            <div>
              <dt>Revision</dt>
              <dd>One focused pass</dd>
            </div>
          </dl>
          <p>
            The BTC amount is fixed from an agreed spot rate when the invoice is
            issued.
          </p>
        </aside>
      </section>

      <section className="trust-strip" aria-label="Working principles">
        <p>Existing websites only</p>
        <p>Written scope before payment</p>
        <p>Customer-controlled deployment</p>
        <p>No credentials in public issues</p>
      </section>

      <section className="content-section scope-section" id="scope">
        <div className="section-heading">
          <h2>A repair pass, not an open-ended rebuild.</h2>
          <p>
            The sprint is intentionally narrow. That keeps the price fixed and
            makes the two-day delivery window realistic.
          </p>
        </div>
        <div className="scope-grid">
          <div>
            <h3>Good fit</h3>
            <ul className="check-list">
              {included.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Outside this sprint</h3>
            <ul className="plain-list">
              {notIncluded.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="content-section process-section" id="process">
        <div className="section-heading">
          <h2>Four steps, with the risky parts kept in your hands.</h2>
          <p>
            Access is limited to what the repair needs. You approve the scope,
            merge, and production deployment.
          </p>
        </div>
        <ol className="process-list">
          {steps.map((step) => (
            <li key={step.number}>
              <span className="step-number" aria-hidden="true">
                {step.number}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="content-section price-section" id="price">
        <div className="price-copy">
          <h2>Introductory sprint: $300 USD equivalent in Bitcoin.</h2>
          <p>
            Fifty percent starts the booked sprint; fifty percent is due at
            acceptance. The sender covers the network fee so the invoiced amount
            arrives. Larger work is quoted separately and never started by
            assumption.
          </p>
          <a className="button button-primary" href={requestUrl}>
            Open a public request
          </a>
          <p className="request-note">
            GitHub requests are public. Include a public URL and symptoms only;
            never paste passwords, tokens, customer data, or private repository
            details.
          </p>
        </div>
        <div className="fit-check">
          <h3>Before booking</h3>
          <ul>
            <li>The site already exists.</li>
            <li>The desired outcome can be verified.</li>
            <li>The work fits one isolated branch.</li>
            <li>You can authorize the code and deployment.</li>
          </ul>
        </div>
      </section>

      <section className="support-section" id="support">
        <div>
          <h2>Prefer to fix it yourself?</h2>
          <p>
            The public repository includes the exact intake, QA, and delivery
            checklists used for the sprint, plus a read-only website preflight
            tool. Use them freely. If they save you time, you can support the
            work with a Bitcoin tip.
          </p>
          <div className="support-links">
            <a
              className="text-link"
              href="https://github.com/BabaVictim/website-repair-sprint"
            >
              View the free repair kit
            </a>
            <Link className="text-link" href="/invoice/project/">
              Build a Bitcoin payment request
            </Link>
          </div>
        </div>
        <CopyAddress />
      </section>

      <footer>
        <p>Website Repair Sprint</p>
        <div>
          <a href="#scope">Scope</a>
          <a href={requestUrl}>Request</a>
          <Link href="/invoice/">Invoice tool</Link>
          <Link href="/third-party-notices.txt">Licenses</Link>
          <a href="https://github.com/BabaVictim/website-repair-sprint">
            Source
          </a>
        </div>
        <p className="footer-note">
          Lawful repair work only. No unauthorized access or security testing.
        </p>
      </footer>
    </main>
  );
}
