#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_TIMEOUT_MS = 12_000;

function parseAddress(content) {
  const assignment = content.match(/^address=(bc1[ac-hj-np-z02-9]+)$/m);
  const legacySingleLine = content.trim().match(/^(bc1[ac-hj-np-z02-9]+)$/);
  const address = assignment?.[1] ?? legacySingleLine?.[1];
  if (!address) {
    throw new Error("No valid mainnet Bech32 address found.");
  }
  return address;
}

async function fetchJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "website-repair-sprint-wallet-status/1.0",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`${new URL(url).hostname} returned HTTP ${response.status}.`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const addressArgument = args.find((argument) => !argument.startsWith("-"));
  const walletPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "address.txt",
  );
  const address =
    addressArgument ?? parseAddress(await readFile(walletPath, "utf8"));
  if (!/^bc1[ac-hj-np-z02-9]{20,87}$/.test(address)) {
    throw new Error("Address must be a mainnet Bech32 or Bech32m address.");
  }

  const [chain, priceResponse] = await Promise.all([
    fetchJson(`https://mempool.space/api/address/${encodeURIComponent(address)}`),
    fetchJson("https://api.coinbase.com/v2/prices/BTC-USD/spot"),
  ]);

  const confirmedSats =
    chain.chain_stats.funded_txo_sum - chain.chain_stats.spent_txo_sum;
  const unconfirmedSats =
    chain.mempool_stats.funded_txo_sum - chain.mempool_stats.spent_txo_sum;
  const btcUsd = Number(priceResponse.data.amount);
  const usdValue = (confirmedSats / 100_000_000) * btcUsd;
  const result = {
    checked_at: new Date().toISOString(),
    address,
    confirmed_sats: confirmedSats,
    unconfirmed_sats: unconfirmedSats,
    confirmed_btc: confirmedSats / 100_000_000,
    btc_usd_spot: btcUsd,
    confirmed_usd_estimate: Math.round(usdValue * 100) / 100,
    confirmed_transactions: chain.chain_stats.tx_count,
    mempool_transactions: chain.mempool_stats.tx_count,
    sources: {
      balance: `https://mempool.space/address/${address}`,
      price: "Coinbase BTC-USD spot API",
    },
  };

  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    [
      `Address: ${result.address}`,
      `Confirmed: ${result.confirmed_sats.toLocaleString("en-US")} sats (${result.confirmed_btc} BTC)`,
      `Unconfirmed: ${result.unconfirmed_sats.toLocaleString("en-US")} sats`,
      `BTC/USD spot: $${result.btc_usd_spot.toLocaleString("en-US")}`,
      `Estimated confirmed value: $${result.confirmed_usd_estimate.toFixed(2)}`,
      `Checked: ${result.checked_at}`,
      "",
    ].join("\n"),
  );
}

main().catch((error) => {
  const detail =
    error.name === "AbortError" ? "Balance check timed out." : error.message;
  process.stderr.write(`Wallet status failed: ${detail}\n`);
  process.exitCode = 1;
});
