#!/usr/bin/env node
"use strict";

const fs = require("fs/promises");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DEST = path.join(ROOT, "fonts");

const FILES = [
  ["@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", "inter-latin.woff2"],
  ["@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2", "inter-latin-ext.woff2"],
  ["@fontsource-variable/cinzel/files/cinzel-latin-wght-normal.woff2", "cinzel-latin.woff2"],
  ["@fontsource-variable/cinzel/files/cinzel-latin-ext-wght-normal.woff2", "cinzel-latin-ext.woff2"],
];

async function main() {
  await fs.mkdir(DEST, { recursive: true });
  let copied = 0;
  for (const [fromRel, name] of FILES) {
    const from = path.join(ROOT, "node_modules", fromRel);
    const to = path.join(DEST, name);
    try {
      await fs.copyFile(from, to);
      const size = (await fs.stat(to)).size;
      console.log(`${name}  ${(size / 1024).toFixed(1)} KB`);
      copied += 1;
    } catch (err) {
      console.warn(
        `[copy-fonts] Uyarı: ${name} kopyalanamadı (${err.message}).`,
      );
    }
  }
  if (copied === 0) {
    console.warn("[copy-fonts] Uyarı: hiçbir font kopyalanamadı, derleme devam ediyor.");
  }
}

main().catch((err) => {
  console.warn(`[copy-fonts] Uyarı: ${err.message}. Font kopyalama atlandı, derleme devam ediyor.`);
  process.exit(0);
});
