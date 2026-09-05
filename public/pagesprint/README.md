# PageSprint static website

A responsive $150 USD one-page website service page, with two explicitly fictional concept samples. This directory is self-contained; no build step, package install, external fonts, analytics, or image service is required.

## Files

- `index.html`, `styles.css`: service page and responsive styling.
- `config.js`: public contact settings and the GitHub contact readiness flag.
- `script.js`: local brief download, optional email draft, and contact display.
- `demos/coach.html`: fictional Fieldwork coaching sample.
- `demos/product.html`, `demos/product.js`: fictional Alto lamp sample with a keyboard-accessible color preview.
- `demos/demo.css`: shared responsive demo styles. All decorative art is original CSS.

## Preview and deployment

From this workspace root, run `node preview-server.mjs` and open `http://127.0.0.1:4173/`. The workspace helper serves this directory. If a preview is already running, use it rather than starting another server on the same port. For a standalone copy, open `index.html` directly in a browser or serve this directory with your preferred static server.

Upload the directory contents together to a static host. Asset and sample links are relative, so the site also supports a subdirectory such as `/pagesprint/`. Keep the `demos` subdirectory alongside the main files. No credentials or private files belong in the deployed directory.

## Contact setup

The intended public GitHub request route is configured as:

`https://github.com/BabaVictim/website-repair-sprint/issues/new?template=pagesprint-request.yml`

`contactGitHubReady` defaults to `false`. Publish the repository's `.github/ISSUE_TEMPLATE/pagesprint-request.yml`, verify that the repository accepts public issues and that the URL opens the intended form, and only then set the readiness flag to `true` before deployment. Until enabled, the service page says project requests are being set up. Do not treat a local preview as a live booking service.

The GitHub CTA opens a new tab with only the configured template name and a fixed project-request title. It never reads or submits the brief fields. Visitors need a GitHub account and must review and submit the issue themselves. The page explains that GitHub requests and replies are public and instructs visitors to omit emails, private assets, and credentials. Arrange an appropriate private route before requesting confidential client material.

Optional `contactEmail` and `contactDiscord` values can be configured as public contact details. Email opens the visitor's email application with a draft only after a deliberate button click. Discord supports a public Discord link or handle. Never put a Discord webhook, private key, password, or API token into this public configuration.

## Brief and privacy behavior

The brief form has no network submission. It creates a text-file download in the visitor's browser and does not persist data in local storage. The file may contain the visitor's contact details; keep it private. If email is configured, the separate email button opens a draft for the visitor to review and send. There is no backend, checkout, payment collection, reservation, automatic booking, or customer notification in this site.

## Offer scope

- $150 USD for a custom one-page website with up to five sections.
- Client supplies up to 800 words, one logo, and up to five images they have permission to use.
- Responsive layout; basic page title and search description.
- One consolidated revision within agreed scope.
- Source ZIP containing HTML, CSS, any JavaScript, and a setup README.
- First draft within 24 hours after a complete brief, required content, and scope are accepted. Final handoff and revision timing are agreed separately.
- Domain, hosting, paid assets, ongoing maintenance, checkout, accounts, and a custom backend are excluded.

Both sample brands are fictional. They are not client work, do not represent existing products or coaching services, and have no real checkout or booking flow.

## Checks

Run `node --check script.js`, `node --check config.js`, and `node --check demos/product.js`. Check the main page and both demos at desktop and mobile widths, navigation and anchor targets, the native FAQ disclosures, required form fields, brief download, keyboard focus, and the three lamp color controls. Before opening bookings, verify the public request route in its deployed state.
