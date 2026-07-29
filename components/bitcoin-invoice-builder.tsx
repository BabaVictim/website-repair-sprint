"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import QRCode from "qrcode";
import {
  PaymentRequestError,
  createPaymentRequest,
  formatSatsAsBtc,
} from "@/lib/bitcoin-payment";
import type {
  AmountUnit,
  BitcoinPaymentRequest,
  PaymentRequestField,
} from "@/lib/bitcoin-payment";
import { PROJECT_RECEIVE_ADDRESS } from "@/lib/project-receive-address";

export type ReceiveMode = "custom" | "project";

type GeneratedRequest = {
  payment: BitcoinPaymentRequest;
  qrDataUrl: string;
};

function characterCount(value: string) {
  return Array.from(value).length;
}

function limitCodePoints(value: string, maximum: number) {
  return Array.from(value).slice(0, maximum).join("");
}

function formatSatoshis(value: bigint) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const errorTargetIds: Record<PaymentRequestField, string> = {
  address: "invoice-address",
  amount: "invoice-amount",
  label: "invoice-label",
  message: "invoice-message",
  form: "invoice-form-error",
};

export function BitcoinInvoiceBuilder({
  initialMode = "custom",
}: {
  initialMode?: ReceiveMode;
}) {
  const [mode, setMode] = useState<ReceiveMode>(initialMode);
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [amountUnit, setAmountUnit] = useState<AmountUnit>("btc");
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState("");
  const [generated, setGenerated] = useState<GeneratedRequest | null>(null);
  const [error, setError] = useState("");
  const [errorField, setErrorField] =
    useState<PaymentRequestField | null>(null);
  const [formMessage, setFormMessage] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const generationVersion = useRef(0);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    function applyModeHint() {
      if (window.location.hash.toLowerCase() === "#project") {
        generationVersion.current += 1;
        setGenerated(null);
        setError("");
        setErrorField(null);
        setFormMessage("");
        setResultMessage("");
        setActionMessage("");
        setMode("project");
      }
    }

    applyModeHint();
    window.addEventListener("hashchange", applyModeHint);
    return () => window.removeEventListener("hashchange", applyModeHint);
  }, []);

  useEffect(() => {
    if (generated) {
      resultHeading.current?.focus();
    }
  }, [generated]);

  function clearGenerated() {
    generationVersion.current += 1;
    setGenerated(null);
    setError("");
    setErrorField(null);
    setFormMessage("");
    setResultMessage("");
    setActionMessage("");
  }

  function selectMode(nextMode: ReceiveMode) {
    clearGenerated();
    setMode(nextMode);
  }

  async function generateRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const requestVersion = generationVersion.current + 1;
    generationVersion.current = requestVersion;
    setGenerated(null);
    setError("");
    setErrorField(null);
    setFormMessage("");
    setResultMessage("");
    setActionMessage("");

    try {
      const payment = createPaymentRequest({
        address:
          mode === "project" ? PROJECT_RECEIVE_ADDRESS : address,
        amount,
        amountUnit,
        label,
        message,
      });
      const qrDataUrl = await QRCode.toDataURL(payment.uri, {
        color: {
          dark: "#292524",
          light: "#fffdf9",
        },
        errorCorrectionLevel: "L",
        margin: 4,
        scale: 6,
        type: "image/png",
      });

      if (generationVersion.current !== requestVersion) {
        return;
      }

      setResultMessage(
        "Payment request generated. Verify the amount and recipient before sharing.",
      );
      setGenerated({ payment, qrDataUrl });
    } catch (caught) {
      if (generationVersion.current !== requestVersion) {
        return;
      }

      const nextError =
        caught instanceof Error
          ? caught.message
          : "Could not create the payment request.";
      const nextField =
        caught instanceof PaymentRequestError ? caught.field : "form";

      setError(nextError);
      setErrorField(nextField);
      window.requestAnimationFrame(() => {
        document.getElementById(errorTargetIds[nextField])?.focus();
      });
    }
  }

  async function copyUri() {
    if (!generated) {
      return;
    }

    const requestVersion = generationVersion.current;

    try {
      await navigator.clipboard.writeText(generated.payment.uri);

      if (generationVersion.current !== requestVersion) {
        return;
      }

      setActionMessage("Payment request copied.");
    } catch {
      if (generationVersion.current !== requestVersion) {
        return;
      }

      setActionMessage(
        "Copy failed. Select the payment request text and copy it manually.",
      );
    }
  }

  return (
    <div className="invoice-builder">
      <form className="invoice-form" onSubmit={generateRequest} noValidate>
        <fieldset className="mode-picker">
          <legend>Who should receive the payment?</legend>
          <label className={mode === "custom" ? "selected" : undefined}>
            <input
              checked={mode === "custom"}
              name="receive-mode"
              onChange={() => selectMode("custom")}
              type="radio"
              value="custom"
            />
            <span>
              <strong>My address</strong>
              <small>Build a request for a mainnet address you control.</small>
            </span>
          </label>
          <label className={mode === "project" ? "selected" : undefined}>
            <input
              checked={mode === "project"}
              name="receive-mode"
              onChange={() => selectMode("project")}
              type="radio"
              value="project"
            />
            <span>
              <strong>Support this project</strong>
              <small>Create an optional tip to the project address.</small>
            </span>
          </label>
        </fieldset>

        {mode === "custom" ? (
          <div className="form-field">
            <label htmlFor="invoice-address">Bitcoin mainnet address</label>
            <input
              aria-describedby={
                errorField === "address"
                  ? "invoice-address-help invoice-form-error"
                  : "invoice-address-help"
              }
              aria-invalid={errorField === "address"}
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              id="invoice-address"
              inputMode="text"
              onChange={(event) => {
                clearGenerated();
                setAddress(event.target.value);
              }}
              placeholder="1…, 3…, or bc1…"
              spellCheck={false}
              type="text"
              value={address}
            />
            <p className="field-help" id="invoice-address-help">
              Standard legacy, SegWit v0, and Taproot mainnet addresses are
              validated locally. Use a fresh receive address when possible.
            </p>
          </div>
        ) : (
          <div className="project-recipient">
            <p>Project receive address</p>
            <code>{PROJECT_RECEIVE_ADDRESS}</code>
            <p>
              A tip supports the open-source tools. It does not book repair
              work or create a service agreement. Tips to this fixed address
              are publicly linkable on-chain.
            </p>
          </div>
        )}

        <div className="form-row amount-row">
          <div className="form-field">
            <label htmlFor="invoice-amount">
              Amount <span>(optional)</span>
            </label>
            <input
              aria-describedby={
                errorField === "amount"
                  ? "invoice-amount-help invoice-form-error"
                  : "invoice-amount-help"
              }
              aria-invalid={errorField === "amount"}
              autoComplete="off"
              id="invoice-amount"
              inputMode={amountUnit === "btc" ? "decimal" : "numeric"}
              maxLength={32}
              onChange={(event) => {
                clearGenerated();
                setAmount(event.target.value);
              }}
              placeholder={amountUnit === "btc" ? "0.001" : "100000"}
              type="text"
              value={amount}
            />
          </div>
          <div className="form-field unit-field">
            <label htmlFor="invoice-unit">Unit</label>
            <select
              aria-describedby="invoice-amount-help"
              id="invoice-unit"
              onChange={(event) => {
                const hadAmount = amount.trim().length > 0;
                clearGenerated();
                setAmount("");
                setAmountUnit(event.target.value as AmountUnit);
                if (hadAmount) {
                  setFormMessage(
                    "Amount cleared because the unit changed. Enter it again in the selected unit.",
                  );
                }
              }}
              value={amountUnit}
            >
              <option value="btc">BTC</option>
              <option value="sats">sats</option>
            </select>
          </div>
        </div>
        <p className="field-help amount-help" id="invoice-amount-help">
          Exact decimal handling—no floating-point rounding. Leave blank to let
          the sender choose.
        </p>
        <p className="form-message" role="status">
          {formMessage}
        </p>

        <div className="form-field">
          <div className="field-label-row">
            <label htmlFor="invoice-label">
              Recipient label <span>(optional)</span>
            </label>
            <small id="invoice-label-count">
              {characterCount(label)} of 64 characters
            </small>
          </div>
          <input
            aria-describedby={
              errorField === "label"
                ? "invoice-label-count invoice-form-error"
                : "invoice-label-count"
            }
            aria-invalid={errorField === "label"}
            autoComplete="off"
            id="invoice-label"
            onChange={(event) => {
              clearGenerated();
              setLabel(limitCodePoints(event.target.value, 64));
            }}
            placeholder="Coffee fund"
            type="text"
            value={label}
          />
        </div>

        <div className="form-field">
          <div className="field-label-row">
            <label htmlFor="invoice-message">
              Message <span>(optional)</span>
            </label>
            <small id="invoice-message-count">
              {characterCount(message)} of 160 characters
            </small>
          </div>
          <input
            aria-describedby={
              errorField === "message"
                ? "invoice-message-count invoice-message-help invoice-form-error"
                : "invoice-message-count invoice-message-help"
            }
            aria-invalid={errorField === "message"}
            autoComplete="off"
            id="invoice-message"
            onChange={(event) => {
              clearGenerated();
              setMessage(limitCodePoints(event.target.value, 160));
            }}
            placeholder="What the payment is for"
            type="text"
            value={message}
          />
          <p className="field-help" id="invoice-message-help">
            Single line only. Keep this non-sensitive; wallets may display it
            to the sender.
          </p>
        </div>

        {error ? (
          <p
            className="form-error"
            id="invoice-form-error"
            role="alert"
            tabIndex={-1}
          >
            {error}
          </p>
        ) : null}

        <button className="button button-primary generate-button" type="submit">
          Generate payment request
        </button>

        <p className="local-note">
          Drafts are processed locally. This app sends no draft data and uses
          no analytics or persistent browser storage.
        </p>
      </form>

      <p className="sr-only" role="status">
        {resultMessage}
      </p>

      <section className={`invoice-output ${generated ? "has-result" : ""}`}>
        {generated ? (
          <>
            <div className="qr-panel">
              <p className="output-kicker">Ready to scan</p>
              <div className="qr-frame">
                {/* A data URL generated locally is the intended output here. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="QR code containing the payment request shown beside it"
                  src={generated.qrDataUrl}
                />
              </div>
              <p className="qr-caption">
                Confirm the full address and amount in the sending wallet before
                authorizing payment.
              </p>
            </div>

            <div className="request-details">
              <p className="output-kicker">Payment request</p>
              <h2 ref={resultHeading} tabIndex={-1}>
                Verify before sharing
              </h2>

              <div className="output-field">
                <p>Recipient address</p>
                <code>{generated.payment.address}</code>
              </div>

              <div className="output-field request-summary">
                <p>Request summary</p>
                <dl>
                  <div>
                    <dt>Amount</dt>
                    <dd>
                      {generated.payment.amountSats === null ? (
                        "Sender chooses"
                      ) : (
                        <>
                          <span className="summary-primary">
                            {formatSatsAsBtc(generated.payment.amountSats)} BTC
                          </span>
                          <span className="summary-secondary">
                            {formatSatoshis(generated.payment.amountSats)} sats
                          </span>
                        </>
                      )}
                    </dd>
                  </div>
                  {generated.payment.label ? (
                    <div>
                      <dt>Label</dt>
                      <dd>{generated.payment.label}</dd>
                    </div>
                  ) : null}
                  {generated.payment.message ? (
                    <div>
                      <dt>Message</dt>
                      <dd>{generated.payment.message}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <div className="output-field">
                <label htmlFor="generated-uri">Bitcoin URI</label>
                <textarea
                  id="generated-uri"
                  readOnly
                  rows={5}
                  value={generated.payment.uri}
                />
                <code className="print-uri">{generated.payment.uri}</code>
              </div>

              <p className="print-warning">
                Verify the address and amount before paying. Bitcoin payments
                are irreversible, the sender pays the network fee separately,
                and this request is not proof of payment.
              </p>

              <div className="output-actions">
                <button
                  className="button button-primary"
                  onClick={copyUri}
                  type="button"
                >
                  Copy request
                </button>
                <a
                  className="button button-secondary"
                  href={generated.payment.uri}
                >
                  Open wallet
                </a>
                <a
                  className="button button-secondary"
                  download="bitcoin-payment-request.png"
                  href={generated.qrDataUrl}
                >
                  Download QR
                </a>
                <button
                  className="button button-secondary"
                  onClick={() => window.print()}
                  type="button"
                >
                  Print
                </button>
              </div>

              {actionMessage ? (
                <p className="action-message" role="status">
                  {actionMessage}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="output-placeholder">
            <p className="output-kicker">No request generated</p>
            <h2>Your QR code and exact URI will appear here.</h2>
            <p>
              Nothing is sent or saved when you fill out the form. Generating a
              request does not move bitcoin.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
