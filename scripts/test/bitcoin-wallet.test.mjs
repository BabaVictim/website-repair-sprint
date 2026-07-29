import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  deriveKeyMaterial,
  formatWalletFile,
  writeWalletFile,
} from "../generate-bitcoin-wallet.mjs";

const privateKeyOne = Buffer.from(
  "0000000000000000000000000000000000000000000000000000000000000001",
  "hex",
);

test("derives the standard compressed secp256k1 key and WIF for key 1", () => {
  const material = deriveKeyMaterial(privateKeyOne);

  assert.equal(
    material.publicKey.toString("hex"),
    "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
  );
  assert.equal(
    material.privateKeyWif,
    "KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn",
  );
  assert.match(material.address, /^bc1q[023456789acdefghjklmnpqrstuvwxyz]{38}$/);
});

test("formats every requested public and private field", () => {
  const content = formatWalletFile(
    deriveKeyMaterial(privateKeyOne),
    "2026-07-29T00:00:00.000Z",
  );

  assert.match(content, /^network=bitcoin-mainnet$/m);
  assert.match(content, /^address=bc1q/m);
  assert.match(content, /^public_key_compressed_hex=02/m);
  assert.match(content, /^private_key_wif=K/m);
  assert.match(content, /^private_key_hex=[0-9a-f]{64}$/m);
  assert.match(content, /^created_at=2026-07-29T00:00:00.000Z$/m);
});

test("writes mode 0600 atomically and requires force to overwrite", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "repair-wallet-test-"));
  const target = path.join(directory, "address.txt");
  const material = deriveKeyMaterial(privateKeyOne);

  writeWalletFile(target, material);
  assert.equal(statSync(target).mode & 0o777, 0o600);
  assert.match(readFileSync(target, "utf8"), /^private_key_wif=/m);
  assert.throws(() => writeWalletFile(target, material), /without --force/);
  writeWalletFile(target, material, { force: true });
  assert.equal(statSync(target).mode & 0o777, 0o600);
});
