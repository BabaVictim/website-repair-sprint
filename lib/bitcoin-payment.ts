import * as ecc from "tiny-secp256k1";
import {
  address as bitcoinAddress,
  initEccLib,
  networks,
} from "bitcoinjs-lib";

initEccLib(ecc);

export const SATOSHIS_PER_BITCOIN = 100_000_000n;
export const MAX_BITCOIN_SUPPLY_SATS = 21_000_000n * SATOSHIS_PER_BITCOIN;

export type AmountUnit = "btc" | "sats";
export type PaymentRequestField =
  | "address"
  | "amount"
  | "label"
  | "message"
  | "form";

export type PaymentRequestDraft = {
  address: string;
  amount: string;
  amountUnit: AmountUnit;
  label: string;
  message: string;
};

export type BitcoinPaymentRequest = Readonly<{
  address: string;
  amountSats: bigint | null;
  label: string;
  message: string;
  uri: string;
}>;

const CONTROL_OR_LINE_CHARACTERS =
  /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;
const DECIMAL_BITCOIN = /^\d+(?:\.\d{1,8})?$/;
const INTEGER_SATOSHIS = /^\d+$/;

export class PaymentRequestError extends Error {
  readonly field: PaymentRequestField;

  constructor(message: string, field: PaymentRequestField = "form") {
    super(message);
    this.name = "PaymentRequestError";
    this.field = field;
  }
}

export function validateMainnetAddress(value: string): string {
  const candidate = value.trim();

  if (!candidate) {
    throw new PaymentRequestError("Enter a Bitcoin mainnet address.", "address");
  }

  if (candidate.length > 90) {
    throw new PaymentRequestError("That address is too long.", "address");
  }

  try {
    const decoded = bitcoinAddress.fromBech32(candidate);

    if (
      decoded.prefix === networks.bitcoin.bech32 &&
      (decoded.version > 1 ||
        (decoded.version === 1 && decoded.data.length !== 32))
    ) {
      throw new PaymentRequestError(
        "Use a standard legacy, SegWit v0, or 32-byte Taproot mainnet address.",
        "address",
      );
    }
  } catch (caught) {
    if (caught instanceof PaymentRequestError) {
      throw caught;
    }
  }

  try {
    bitcoinAddress.toOutputScript(candidate, networks.bitcoin);
  } catch {
    throw new PaymentRequestError(
      "Enter a valid standard Bitcoin mainnet address with a correct checksum.",
      "address",
    );
  }

  return candidate;
}

export function parseAmountToSats(
  value: string,
  unit: AmountUnit,
): bigint | null {
  const candidate = value.trim();

  if (!candidate) {
    return null;
  }

  if (candidate.length > 32) {
    throw new PaymentRequestError("Amount is too long.", "amount");
  }

  let satoshis: bigint;

  if (unit === "sats") {
    if (!INTEGER_SATOSHIS.test(candidate)) {
      throw new PaymentRequestError(
        "Satoshi amounts must be whole digits with no separators.",
        "amount",
      );
    }

    satoshis = BigInt(candidate);
  } else {
    if (!DECIMAL_BITCOIN.test(candidate)) {
      throw new PaymentRequestError(
        "BTC amounts need digits, a dot if needed, and at most 8 decimals.",
        "amount",
      );
    }

    const [whole, fraction = ""] = candidate.split(".");
    satoshis =
      BigInt(whole) * SATOSHIS_PER_BITCOIN +
      BigInt(fraction.padEnd(8, "0"));
  }

  if (satoshis < 1n) {
    throw new PaymentRequestError("Amount must be at least 1 satoshi.", "amount");
  }

  if (satoshis > MAX_BITCOIN_SUPPLY_SATS) {
    throw new PaymentRequestError(
      "Amount cannot exceed Bitcoin's 21 million BTC supply.",
      "amount",
    );
  }

  return satoshis;
}

export function formatSatsAsBtc(satoshis: bigint): string {
  if (satoshis < 0n || satoshis > MAX_BITCOIN_SUPPLY_SATS) {
    throw new PaymentRequestError(
      "Satoshi amount is outside the valid range.",
      "amount",
    );
  }

  const whole = satoshis / SATOSHIS_PER_BITCOIN;
  const remainder = satoshis % SATOSHIS_PER_BITCOIN;

  if (remainder === 0n) {
    return whole.toString();
  }

  return `${whole}.${remainder
    .toString()
    .padStart(8, "0")
    .replace(/0+$/, "")}`;
}

function validateText(
  value: string,
  fieldLabel: "Label" | "Message",
  field: "label" | "message",
  max: number,
) {
  if (CONTROL_OR_LINE_CHARACTERS.test(value)) {
    throw new PaymentRequestError(
      `${fieldLabel} cannot contain line breaks or control characters.`,
      field,
    );
  }

  if (Array.from(value).length > max) {
    throw new PaymentRequestError(
      `${fieldLabel} must be ${max} characters or fewer.`,
      field,
    );
  }
}

function encodeUriValue(
  value: string,
  field: "label" | "message",
): string {
  try {
    return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  } catch {
    throw new PaymentRequestError(
      "Text contains an invalid Unicode sequence.",
      field,
    );
  }
}

export function createPaymentRequest(
  draft: PaymentRequestDraft,
): BitcoinPaymentRequest {
  const address = validateMainnetAddress(draft.address);
  const amountSats = parseAmountToSats(draft.amount, draft.amountUnit);

  validateText(draft.label, "Label", "label", 64);
  validateText(draft.message, "Message", "message", 160);

  const parameters: string[] = [];

  if (amountSats !== null) {
    parameters.push(`amount=${formatSatsAsBtc(amountSats)}`);
  }

  if (draft.label) {
    parameters.push(`label=${encodeUriValue(draft.label, "label")}`);
  }

  if (draft.message) {
    parameters.push(`message=${encodeUriValue(draft.message, "message")}`);
  }

  const query = parameters.length > 0 ? `?${parameters.join("&")}` : "";

  return Object.freeze({
    address,
    amountSats,
    label: draft.label,
    message: draft.message,
    uri: `bitcoin:${address}${query}`,
  });
}
