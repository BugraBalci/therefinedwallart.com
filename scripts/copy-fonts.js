#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { copyFile } = require("fs/promises");

const ROOT = path.join(__dirname, "..");
const destDir = path.join(ROOT, "fonts");

const FILES = [
  ["@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", "inter-latin.woff2"],
  ["@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2", "inter-latin-ext.woff2"],
  ["@fontsource-variable/cinzel/files/cinzel-latin-wght-normal.woff2", "cinzel-latin.woff2"],
  ["@fontsource-variable/cinzel/files/cinzel-latin-ext-wght-normal.woff2", "cinzel-latin-ext.woff2"],
];

async function main() {
  try {
    fs.mkdirSync(destDir, { recursive: true });

    let copied = 0;
    for (const [fromRel, name] of FILES) {
      const srcPath = path.join(ROOT, "node_modules", fromRel);
      const destPath = path.join(destDir, name);

      if (!fs.existsSync(srcPath)) {
        console.warn(`[copy-fonts] Uyarı: kaynak bulunamadı, atlanıyor: ${srcPath}`);
        continue;
      }

      try {
        await copyFile(srcPath, destPath);
        const size = fs.statSync(destPath).size;
        console.log(`${name}  ${(size / 1024).toFixed(1)} KB`);
        copied += 1;
      } catch (err) {
        console.warn(`[copy-fonts] Uyarı: ${name} kopyalanamadı (${err.message}).`);
      }
    }

    if (copied === 0) {
      console.warn("[copy-fonts] Uyarı: hiçbir font kopyalanamadı, derleme devam ediyor.");
    }
  } catch (err) {
    console.warn(
      `[copy-fonts] Uyarı: ${err.message}. Font kopyalama atlandı, derleme devam ediyor.`,
    );
  }

  process.exit(0);
}

main().catch((err) => {
  console.warn(
    `[copy-fonts] Uyarı: ${err.message}. Font kopyalama atlandı, derleme devam ediyor.`,
  );
  process.exit(0);
});
