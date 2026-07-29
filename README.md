# Website Repair Sprint

A fixed-scope, 48-hour repair service for existing websites, plus a free
read-only preflight tool and the checklists used to deliver the work.

The introductory sprint is $300 USD equivalent in Bitcoin. Scope, acceptance
criteria, exchange-rate source, invoice amount, and authorized access are agreed
in writing before work starts.

## What is here

- The public service site in [`app/`](app/)
- A zero-dependency website preflight CLI in [`tools/`](tools/)
- Client intake, scope, QA, proposal, and delivery templates in [`docs/`](docs/)
- A public, non-sensitive repair request form in
  [GitHub Issues](https://github.com/BabaVictim/website-repair-sprint/issues/new?template=repair-request.yml)

No testimonials or client results are fabricated. The repository itself is the
working sample: source, safeguards, tests, and delivery process are visible.

## Run the service site

Requirements: Node.js 22 or newer and npm.

```sh
npm install
npm run dev
```

Production validation:

```sh
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

## Run the free preflight

The tool sends bounded, read-only requests to one public HTTP(S) URL. It does
not crawl, submit forms, execute scripts, probe ports, or claim to be a security
scanner.

```sh
npm run audit:site -- https://example.com/
npm run audit:site -- --json https://example.com/
```

See [`tools/README.md`](tools/README.md) for checks, safety controls, options,
and exit codes.

## Documents

- [`docs/service-scope-and-terms.md`](docs/service-scope-and-terms.md) — draft
  scope and terms; local legal review is still required
- [`docs/client-intake-checklist.md`](docs/client-intake-checklist.md) —
  authorization, access, acceptance, and payment readiness
- [`docs/proposal-template.md`](docs/proposal-template.md) — individualized
  proposal template
- [`docs/qa-checklist.md`](docs/qa-checklist.md) — functional, responsive,
  accessibility, performance, and handoff checks
- [`docs/delivery-report-template.md`](docs/delivery-report-template.md) —
  evidence-led closeout and access revocation

Never put credentials, customer data, private repository details, or
vulnerability information in a public issue.

## Support

The preflight tool and documents are free to use under the repository license.
If they save you time, the public Bitcoin tip address is:

```text
bc1qgaxryak5yss9x7m7jwjx6337v3q9pl7wjxatfc
```

Tips do not book work. Agree a written scope before paying a service invoice.

## License

MIT. See [`LICENSE`](LICENSE).
