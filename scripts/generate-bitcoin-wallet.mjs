#!/usr/bin/env node

import {
  createECDH,
  createHash,
  randomBytes,
} from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BECH32_ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function sha256(value) {
  return createHash("sha256").update(value).digest();
}

function hash160(value) {
  return createHash("ripemd160").update(sha256(value)).digest();
}

export function encodeBase58Check(payload) {
  const checksum = sha256(sha256(payload)).subarray(0, 4);
  const source = Buffer.concat([payload, checksum]);
  let number = BigInt(`0x${source.toString("hex")}`);
  let encoded = "";

  while (number > 0n) {
    encoded = BASE58_ALPHABET[Number(number % 58n)] + encoded;
    number /= 58n;
  }

  for (const byte of source) {
    if (byte !== 0) break;
    encoded = `1${encoded}`;
  }

  return encoded;
}

function bech32Polymod(values) {
  const generators = [
    0x3b6a57b2,
    0x26508e6d,
    0x1ea119fa,
    0x3d4233dd,
    0x2a1462b3,
  ];
  let checksum = 1;

  for (const value of values) {
    const top = checksum >>> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (let bit = 0; bit < 5; bit += 1) {
      if ((top >>> bit) & 1) checksum ^= generators[bit];
    }
  }

  return checksum >>> 0;
}

function expandHumanReadablePart(hrp) {
  return [
    ...[...hrp].map((character) => character.charCodeAt(0) >>> 5),
    0,
    ...[...hrp].map((character) => character.charCodeAt(0) & 31),
  ];
}

function convertBits(bytes, fromBits, toBits, pad) {
  let accumulator = 0;
  let bitCount = 0;
  const result = [];
  const maxOutput = (1 << toBits) - 1;
  const maxAccumulator = (1 << (fromBits + toBits - 1)) - 1;

  for (const byte of bytes) {
    if (byte < 0 || byte >>> fromBits !== 0) {
      throw new Error("Invalid value while converting bit groups.");
    }
    accumulator = ((accumulator << fromBits) | byte) & maxAccumulator;
    bitCount += fromBits;
    while (bitCount >= toBits) {
      bitCount -= toBits;
      result.push((accumulator >>> bitCount) & maxOutput);
    }
  }

  if (pad) {
    if (bitCount > 0) {
      result.push((accumulator << (toBits - bitCount)) & maxOutput);
    }
  } else if (
    bitCount >= fromBits ||
    ((accumulator << (toBits - bitCount)) & maxOutput) !== 0
  ) {
    throw new Error("Invalid padding while converting bit groups.");
  }

  return result;
}

export function encodeSegwitV0Address(program, hrp = "bc") {
  if (!Buffer.isBuffer(program) || (program.length !== 20 && program.length !== 32)) {
    throw new Error("Witness version 0 requires a 20-byte or 32-byte program.");
  }

  const data = [0, ...convertBits(program, 8, 5, true)];
  const values = [
    ...expandHumanReadablePart(hrp),
    ...data,
    0,
    0,
    0,
    0,
    0,
    0,
  ];
  const polymod = bech32Polymod(values) ^ 1;
  const checksum = Array.from(
    { length: 6 },
    (_, index) => (polymod >>> (5 * (5 - index))) & 31,
  );

  return `${hrp}1${[...data, ...checksum]
    .map((value) => BECH32_ALPHABET[value])
    .join("")}`;
}

export function deriveKeyMaterial(privateKey) {
  if (!Buffer.isBuffer(privateKey) || privateKey.length !== 32) {
    throw new Error("A Bitcoin private key must be exactly 32 bytes.");
  }

  const ecdh = createECDH("secp256k1");
  ecdh.setPrivateKey(privateKey);
  const publicKey = ecdh.getPublicKey(undefined, "compressed");
  const wifPayload = Buffer.concat([
    Buffer.from([0x80]),
    privateKey,
    Buffer.from([0x01]),
  ]);

  return {
    address: encodeSegwitV0Address(hash160(publicKey)),
    publicKey,
    privateKey,
    privateKeyWif: encodeBase58Check(wifPayload),
    fingerprint: sha256(publicKey).subarray(0, 8).toString("hex"),
  };
}

export function generateKeyMaterial() {
  while (true) {
    const privateKey = randomBytes(32);
    try {
      return deriveKeyMaterial(privateKey);
    } catch {
      // The secp256k1 invalid-key range is vanishingly small; retry safely.
    }
  }
}

export function formatWalletFile(keyMaterial, createdAt = new Date().toISOString()) {
  return [
    "# Bitcoin mainnet project treasury",
    "# KEEP THIS FILE PRIVATE. Anyone with either private key can spend the funds.",
    "# This file must remain ignored by Git and excluded from deployment archives.",
    "network=bitcoin-mainnet",
    `address=${keyMaterial.address}`,
    `public_key_compressed_hex=${keyMaterial.publicKey.toString("hex")}`,
    `private_key_wif=${keyMaterial.privateKeyWif}`,
    `private_key_hex=${keyMaterial.privateKey.toString("hex")}`,
    `created_at=${createdAt}`,
    "",
  ].join("\n");
}

export function writeWalletFile(targetPath, keyMaterial, { force = false } = {}) {
  const absoluteTarget = path.resolve(targetPath);
  if (existsSync(absoluteTarget)) {
    const stat = lstatSync(absoluteTarget);
    if (stat.isSymbolicLink()) {
      throw new Error("Refusing to replace a symbolic link.");
    }
    if (!force) {
      throw new Error(`Refusing to overwrite ${absoluteTarget} without --force.`);
    }
  }

  const temporaryPath = `${absoluteTarget}.tmp-${process.pid}-${randomBytes(6).toString("hex")}`;
  let descriptor;
  try {
    descriptor = openSync(temporaryPath, "wx", 0o600);
    writeFileSync(descriptor, formatWalletFile(keyMaterial), {
      encoding: "utf8",
    });
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, absoluteTarget);
    chmodSync(absoluteTarget, 0o600);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
  }
}

function parseArguments(args) {
  let force = false;
  let output = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "address.txt",
  );

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--force") {
      force = true;
    } else if (argument === "--output") {
      const value = args[index + 1];
      if (!value) throw new Error("--output requires a file path.");
      output = path.resolve(value);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return { force, output };
}

function main() {
  const { force, output } = parseArguments(process.argv.slice(2));
  const keyMaterial = generateKeyMaterial();
  writeWalletFile(output, keyMaterial, { force });
  process.stdout.write(
    [
      `Generated Bitcoin mainnet address: ${keyMaterial.address}`,
      `Public-key fingerprint: ${keyMaterial.fingerprint}`,
      `Private key written locally to: ${output}`,
      "The private key was not printed. Keep the file offline and never commit it.",
      "",
    ].join("\n"),
  );
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`Wallet generation failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
