import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_BITCOIN_SUPPLY_SATS,
  createPaymentRequest,
  formatSatsAsBtc,
  parseAmountToSats,
  validateMainnetAddress,
} from "../../lib/bitcoin-payment.ts";
import { PROJECT_RECEIVE_ADDRESS } from "../../lib/project-receive-address.ts";

const validMainnetAddresses = [
  "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
  "BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4",
  "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",
];

test("accepts checksum-valid legacy, SegWit v0, and Taproot mainnet addresses", () => {
  for (const address of validMainnetAddresses) {
    assert.equal(validateMainnetAddress(address), address);
  }
});

test("keeps the published project receive address checksum-valid", () => {
  assert.equal(
    validateMainnetAddress(PROJECT_RECEIVE_ADDRESS),
    PROJECT_RECEIVE_ADDRESS,
  );
});

test("rejects other networks, bad checksums, mixed case, and non-address keys", () => {
  const invalidAddresses = [
    "mrCDrCybB6J1vRfbwM5hemdJz73FwDBC8r",
    "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb",
    "bc1QW508D6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
    "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5",
    "bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kt5nd6y",
    "WIF-is-not-a-payment-address",
    "xpub-is-not-a-payment-address",
  ];

  for (const address of invalidAddresses) {
    assert.throws(
      () => validateMainnetAddress(address),
      /standard Bitcoin mainnet address|standard legacy/,
    );
  }
});

test("parses BTC and satoshi strings exactly with bigint", () => {
  assert.equal(parseAmountToSats("", "btc"), null);
  assert.equal(parseAmountToSats("0.00000001", "btc"), 1n);
  assert.equal(parseAmountToSats("0.1", "btc"), 10_000_000n);
  assert.equal(parseAmountToSats("1.23456789", "btc"), 123_456_789n);
  assert.equal(parseAmountToSats("21000000", "btc"), MAX_BITCOIN_SUPPLY_SATS);
  assert.equal(parseAmountToSats("00000100", "sats"), 100n);
});

test("rejects zero, signs, exponent notation, separators, fractions of a sat, and overflow", () => {
  const invalidBtc = [
    "0",
    "-1",
    "+1",
    ".1",
    "1.",
    "1e-8",
    "1,000",
    "0.000000001",
    "21000000.00000001",
  ];

  for (const amount of invalidBtc) {
    assert.throws(() => parseAmountToSats(amount, "btc"));
  }

  assert.throws(() => parseAmountToSats("1.5", "sats"));
  assert.throws(() => parseAmountToSats("1".repeat(33), "sats"), /too long/);
});

test("formats satoshi amounts as canonical decimal BTC", () => {
  assert.equal(formatSatsAsBtc(1n), "0.00000001");
  assert.equal(formatSatsAsBtc(10_000_000n), "0.1");
  assert.equal(formatSatsAsBtc(100_000_000n), "1");
  assert.equal(formatSatsAsBtc(123_456_789n), "1.23456789");
});

test("builds a stable amount-label-message URI with strict UTF-8 encoding", () => {
  const payment = createPaymentRequest({
    address: validMainnetAddresses[0],
    amount: "0.1",
    amountUnit: "btc",
    label: "Alice & Bob",
    message: "Thanks €!",
  });

  assert.equal(payment.amountSats, 10_000_000n);
  assert.equal(payment.label, "Alice & Bob");
  assert.equal(payment.message, "Thanks €!");
  assert.equal(
    payment.uri,
    "bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.1&label=Alice%20%26%20Bob&message=Thanks%20%E2%82%AC%21",
  );
});

test("omits blank optional fields and never adds an empty query", () => {
  const payment = createPaymentRequest({
    address: validMainnetAddresses[1],
    amount: "",
    amountUnit: "sats",
    label: "",
    message: "",
  });

  assert.equal(
    payment.uri,
    "bitcoin:3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
  );
});

test("rejects control characters and overlong Unicode text", () => {
  assert.throws(() =>
    createPaymentRequest({
      address: validMainnetAddresses[0],
      amount: "",
      amountUnit: "btc",
      label: "Line\nbreak",
      message: "",
    }),
  );

  assert.throws(() =>
    createPaymentRequest({
      address: validMainnetAddresses[0],
      amount: "",
      amountUnit: "btc",
      label: "",
      message: "Line\u2028separator",
    }),
  );

  assert.throws(() =>
    createPaymentRequest({
      address: validMainnetAddresses[0],
      amount: "",
      amountUnit: "btc",
      label: "😀".repeat(65),
      message: "",
    }),
  );
});
