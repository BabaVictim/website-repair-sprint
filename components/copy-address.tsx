"use client";

import { useState } from "react";

const address = "bc1qgaxryak5yss9x7m7jwjx6337v3q9pl7wjxatfc";

export function CopyAddress() {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="address-box">
      <p className="address-label">Bitcoin tip address</p>
      <code>{address}</code>
      <div className="address-actions">
        <button type="button" onClick={copyAddress}>
          {copied ? "Copied" : "Copy address"}
        </button>
        <a href={`bitcoin:${address}`}>Open wallet</a>
      </div>
      <p>Tips do not book work. Agree a written scope before paying an invoice.</p>
    </div>
  );
}
