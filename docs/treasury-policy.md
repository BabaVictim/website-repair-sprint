# Project Treasury Policy

This policy governs Bitcoin received through the Website Repair Sprint and its
free tools. It is an operating checklist, not legal, accounting, tax, custody,
or investment advice.

## Ownership and purpose

- Funds are project proceeds controlled for the user's benefit. They are not
  personal property of an AI system.
- The local wallet may receive service payments, tips, bounty proceeds, and
  refunds connected to this project.
- Funds may be reinvested in lawful, clearly scoped activity intended to
  increase project revenue or reduce delivery cost.
- No PSI-related account, identity, repository, infrastructure, data, budget,
  or equipment is part of the project.

## Allowed reinvestment

Examples include:

- A verified marketplace or invoicing fee required to collect earned revenue.
- A bounded domain, hosting, or software cost for a customer-facing asset.
- A small, measurable listing or acquisition experiment on a channel that
  explicitly permits it.
- Network fees required for a documented project payment or treasury move.
- A specialist subcontractor for customer-authorized work, with a written
  deliverable and payment terms.

Every spend must have a named purpose, recipient, amount, expected result,
expiry or review date, and transaction ID or invoice reference.

## Prohibited use

- Trading, leverage, derivatives, gambling, lotteries, cloud-mining contracts,
  yield schemes, mixers, or attempts to manufacture volume.
- Deposits demanded by recruiters, unsolicited "clients," recovery services,
  or unverified bounty sponsors.
- Spam, bought reviews, fake testimonials, fake traffic, scraped outreach, or
  payments that evade a marketplace's terms.
- Unauthorized access, vulnerability testing outside a published program
  scope, stolen compute, malware, deception, or unlawful goods/services.
- Any expense connected to PSI work or identities.

## Risk limits

- Spend only confirmed funds.
- Keep enough unspent value for network fees, refunds, taxes, and current
  customer obligations.
- For an unproven acquisition channel, risk no more than the lower of 20% of
  available project funds or $50 USD equivalent in one experiment.
- Do not make a payment when the destination address, network, recipient, or
  deliverable is ambiguous.
- Prefer escrow or milestone payment for external work.
- Never disclose the wallet seed/private key to a counterparty. Importing it
  into software is a custody decision and requires verifying that software.

## Records

Maintain a private `treasury-ledger.csv` from
[`treasury-ledger.example.csv`](../treasury-ledger.example.csv). Record:

- UTC timestamp
- Type (`income`, `spend`, `refund`, `network_fee`, or `transfer`)
- BTC amount and USD reference value
- Rate source and timestamp
- Transaction ID
- Counterparty/purpose without unnecessary personal data
- Evidence link or local invoice reference
- Outcome and review date for reinvestment experiments

Public blockchain data does not replace bookkeeping, customer invoices, tax
records, or privacy obligations.
