import type { Metadata } from "next";
import Link from "next/link";

const preflightRequestUrl =
  "https://github.com/BabaVictim/website-repair-sprint/issues/new?template=preflight-request.yml";

export const metadata: Metadata = {
  title: "Sample public-site preflight report",
  description:
    "A real, evidence-backed sample of the prioritized report delivered with the $49 public-site preflight.",
  alternates: {
    canonical:
      "https://babavictim.github.io/website-repair-sprint/sample/",
  },
  openGraph: {
    title: "Sample public-site preflight report",
    description:
      "See the scope, evidence, priorities, and next actions included in a Website Repair Sprint preflight report.",
    type: "article",
    url: "https://babavictim.github.io/website-repair-sprint/sample/",
  },
};

const passedChecks = [
  "All three pages returned HTTPS 200 responses with no redirect chain.",
  "The homepage returned its first byte in 165 ms and completed in 215 ms during the bounded request.",
  "Every page had a unique title, description, canonical URL, language, viewport, and one primary heading.",
  "Layouts had no horizontal overflow at 320, 360, 768, or 1280 CSS pixels.",
  "Primary actions stayed visible and keyboard focus remained clearly indicated.",
  "The invoice builder kept draft data in the browser, created no cookies or persistent storage, and made no third-party requests.",
  "The generated Bitcoin URI, clickable payment link, visible text, and independently decoded QR payload matched exactly.",
];

export default function SampleReport() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Website Repair Sprint home">
          <span className="brand-mark" aria-hidden="true">
            +
          </span>
          <span>Repair Sprint</span>
        </Link>
        <nav aria-label="Report navigation">
          <a href="#findings">Findings</a>
          <a href="#passed">Passed checks</a>
          <Link href="/invoice/">Invoice tool</Link>
          <a className="nav-cta" href={preflightRequestUrl}>
            Request a preflight
          </a>
        </nav>
      </header>

      <article className="report-page">
        <header className="report-header">
          <h1>Public-site preflight report</h1>
          <p className="lede">
            This is a real audit of the Website Repair Sprint site, presented in
            the same evidence-first format used for customer reports.
          </p>
          <dl className="report-meta">
            <div>
              <dt>Captured</dt>
              <dd>29 July 2026, 19:51 UTC</dd>
            </div>
            <div>
              <dt>Pages reviewed</dt>
              <dd>Homepage, invoice builder, project payment page</dd>
            </div>
            <div>
              <dt>Boundaries</dt>
              <dd>Public pages only; no login, submission, or probing</dd>
            </div>
            <div>
              <dt>Outcome</dt>
              <dd>2 open findings, 1 resolved finding, 7 passed checks</dd>
            </div>
          </dl>
        </header>

        <section className="report-section" id="findings">
          <div className="report-section-heading">
            <h2>Prioritized findings</h2>
            <p>
              Each finding states what was observed, why it matters, and the
              smallest practical next action.
            </p>
          </div>

          <ol className="finding-list">
            <li className="finding">
              <div className="finding-heading">
                <p>Priority: Medium · Open</p>
                <h3>Prospects without GitHub cannot request the service</h3>
              </div>
              <dl>
                <div>
                  <dt>Evidence</dt>
                  <dd>
                    Every paid request action opens a GitHub issue form. An
                    unauthenticated visit redirects to GitHub sign-in.
                  </dd>
                </div>
                <div>
                  <dt>Impact</dt>
                  <dd>
                    A legitimate buyer who does not use GitHub—or cannot
                    describe the problem publicly—has no intake path.
                  </dd>
                </div>
                <div>
                  <dt>Next action</dt>
                  <dd>
                    Add one project-controlled private contact route while
                    retaining the issue form for public technical intake.
                  </dd>
                </div>
              </dl>
            </li>

            <li className="finding">
              <div className="finding-heading">
                <p>Priority: Low · Open</p>
                <h3>Several defense-in-depth response headers are absent</h3>
              </div>
              <dl>
                <div>
                  <dt>Evidence</dt>
                  <dd>
                    HSTS is present. The response did not include CSP,
                    X-Content-Type-Options, frame protection, Referrer-Policy,
                    or Permissions-Policy headers. The HTML does include a
                    restrictive CSP meta policy and a no-referrer directive.
                  </dd>
                </div>
                <div>
                  <dt>Impact</dt>
                  <dd>
                    The document has useful browser restrictions, but
                    header-only protections and broader resource coverage are
                    unavailable on the current static host.
                  </dd>
                </div>
                <div>
                  <dt>Next action</dt>
                  <dd>
                    Keep the current document policy. Move to a host with
                    configurable response headers only if the threat model
                    justifies the migration cost.
                  </dd>
                </div>
              </dl>
            </li>

            <li className="finding finding-resolved">
              <div className="finding-heading">
                <p>Priority: Low · Resolved</p>
                <h3>Search metadata omitted the lower-cost entry offer</h3>
              </div>
              <dl>
                <div>
                  <dt>Evidence</dt>
                  <dd>
                    The original title and description described only the
                    48-hour repair sprint, even though the homepage now leads
                    with the $49 preflight.
                  </dd>
                </div>
                <div>
                  <dt>Impact</dt>
                  <dd>
                    Search and link previews could hide the clearest,
                    lowest-commitment way to buy.
                  </dd>
                </div>
                <div>
                  <dt>Resolution</dt>
                  <dd>
                    The default and social metadata now name the public-site
                    preflight and the repair sprint.
                  </dd>
                </div>
              </dl>
            </li>
          </ol>
        </section>

        <section className="report-section" id="passed">
          <div className="report-section-heading">
            <h2>Passed checks</h2>
            <p>
              Passing evidence is included so the report distinguishes verified
              behavior from assumptions.
            </p>
          </div>
          <ul className="report-pass-list">
            {passedChecks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
        </section>

        <section className="report-cta">
          <div>
            <h2>Get this report for your public site.</h2>
            <p>
              The $49 BTC preflight covers the homepage and up to two additional
              agreed public pages, delivered within one working day.
            </p>
          </div>
          <a className="button button-primary" href={preflightRequestUrl}>
            Request a $49 preflight
          </a>
        </section>
      </article>

      <footer>
        <p>Website Repair Sprint</p>
        <div>
          <Link href="/">Service</Link>
          <a href={preflightRequestUrl}>Preflight</a>
          <Link href="/invoice/">Invoice tool</Link>
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
