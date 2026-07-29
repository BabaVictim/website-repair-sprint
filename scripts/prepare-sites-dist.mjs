#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  lstatSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const exportDirectory = path.join(projectRoot, "out");
const sitesDirectory = path.join(projectRoot, "dist");

if (!existsSync(exportDirectory) || !lstatSync(exportDirectory).isDirectory()) {
  throw new Error("Next.js did not produce the expected out/ directory.");
}

if (existsSync(sitesDirectory)) {
  if (lstatSync(sitesDirectory).isSymbolicLink()) {
    throw new Error("Refusing to replace a symbolic dist/ directory.");
  }
  rmSync(sitesDirectory, { recursive: true });
}

cpSync(exportDirectory, sitesDirectory, {
  errorOnExist: true,
  force: false,
  recursive: true,
});

process.stdout.write("Prepared dist/ from the verified static export in out/.\n");
