# Site Preflight

`site-preflight` is a zero-dependency Node.js command-line audit for one public website URL. It makes safe, read-only HTTP GET requests and reports common launch-readiness issues. It is intentionally a preflight checker, not a vulnerability scanner.

## Requirements

- Node.js 18 or newer
- A public `http://` or `https://` URL on the standard port (80 or 443)

No install step or third-party package is required.

## Run it

From this directory:

```sh
node site-preflight.mjs https://example.com/
```

Machine-readable output:

```sh
node site-preflight.mjs --json https://example.com/
```

Optional safety bounds:

```sh
node site-preflight.mjs \
  --timeout 8000 \
  --max-bytes 524288 \
  --max-redirects 3 \
  https://example.com/
```

Run `node site-preflight.mjs --help` for the complete option list.

Exit codes are:

- `0`: audit completed with no failed checks (warnings may be present)
- `1`: invalid input, blocked target, DNS failure, timeout, or request failure
- `2`: audit completed and one or more checks failed

## What it checks

- Initial and final HTTPS use
- Final HTTP status and redirect count
- Per-request DNS, first-byte, download, and total timing
- A strict response-body byte limit, with visible truncation reporting
- HTML content type
- Page title and meta description
- Canonical link, viewport meta tag, and document language
- H1 count
- Simple form-control label heuristics (`label`, wrapping label, ARIA, or title)
- Missing and empty image `alt` attributes
- HSTS, Content Security Policy, `nosniff`, frame protection, Referrer Policy, and Permissions Policy

The HTML checks are deliberately lightweight heuristics. This tool does not run JavaScript or claim conformance with SEO, accessibility, performance, or security standards.

## Network safety

The auditor is designed for public websites:

- It accepts only HTTP and HTTPS, rejects URL credentials, and permits only ports 80 and 443.
- It rejects localhost-style names and literal private, loopback, link-local, documentation, multicast, and reserved IP ranges.
- It resolves every destination and every redirect before connecting. If any DNS answer is non-public, the request is refused.
- It pins the request to the validated DNS answers to reduce DNS-rebinding risk.
- It sends one GET per redirect hop, no cookies or credentials, and follows at most five redirects by default.
- Each request has a 10-second total limit and reads at most 1 MiB by default.
- It never submits forms, executes scripts, crawls links, probes ports, or writes to the target.

These controls are defense in depth, not a substitute for operating the tool in a properly restricted network environment.

## Tests

```sh
npm test
```

The suite uses Node's built-in `node:test` runner and does not access the network.
