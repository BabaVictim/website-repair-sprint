# Website Repair Sprint

A fixed-scope, 48-hour repair service for existing websites, plus a free
read-only preflight tool, a private Bitcoin payment-request builder, and the
checklists used to deliver the work.

Live site: <https://babavictim.github.io/website-repair-sprint/>

Bitcoin Invoice Builder:
<https://babavictim.github.io/website-repair-sprint/invoice/>

The introductory sprint is $300 USD equivalent in Bitcoin. Scope, acceptance
criteria, exchange-rate source, invoice amount, and authorized access are agreed
in writing before work starts.

## What is here

- The public service site in [`app/`](app/)
- A client-side Bitcoin payment-request and QR builder at
  [`app/invoice/`](app/invoice/)
- A zero-dependency website preflight CLI in [`tools/`](tools/)
- Client intake, scope, QA, proposal, and delivery templates in [`docs/`](docs/)
- A public, non-sensitive repair request form in
  [GitHub Issues](https://github.com/BabaVictim/website-repair-sprint/issues/new?template=repair-request.yml)

No testimonials or client results are fabricated. The repository itself is the
working sample: source, safeguards, tests, and delivery process are visible.

## Run the service site

Requirements: Node.js 22.12 or newer and npm.

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

The browser interaction suite additionally requires Chromium. With the local
site running in another terminal:

```sh
npm run test:browser
```

Set `CHROMIUM_PATH` or `INVOICE_TEST_URL` when Chromium or the test site uses a
different location.

## Use the Bitcoin Invoice Builder

The builder emits the conservative, on-chain
[BIP 321](https://github.com/bitcoin/bips/blob/master/bip-0321.mediawiki)
subset understood by existing BIP 21 wallets:
`bitcoin:<address>?amount=...&label=...&message=...`.

- Standard mainnet legacy, SegWit v0, and 32-byte Taproot addresses are
  checksum-validated locally; undefined future witness versions are rejected.
- BTC and satoshi amounts use exact integer arithmetic and are never converted
  through JavaScript floating-point numbers.
- The QR code is generated locally from the same immutable URI shown in the
  result.
- Drafts are kept in React memory only. There is no account, backend,
  analytics, cookie, local storage, wallet connection, balance lookup, key
  generation, signing, or transaction broadcast.

This is a payment-request helper, not a tax invoice, processor, payment
monitor, or proof of payment. Never enter a seed phrase, private key, WIF, or
extended private key.

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

## Run it in GitHub Actions

Use the same bounded preflight in a workflow without an install step or token:

```yaml
permissions:
  contents: read

steps:
  - uses: BabaVictim/website-repair-sprint@v1
    with:
      url: https://example.com/
```

The step succeeds when checks pass or only warn, and fails when a check fails or
the target cannot be audited safely. Set `json: "true"` for machine-readable
stdout. Pin a full commit SHA instead of `v1` when immutable dependencies are
required.

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
bc1qm7nrve8325p20nqxk89dl6tyc9349cym9n0kh0
```

Tips do not book work. Agree a written scope before paying a service invoice.

## License

MIT. See [`LICENSE`](LICENSE) and
[`public/third-party-notices.txt`](public/third-party-notices.txt).
