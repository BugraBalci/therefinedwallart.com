#!/usr/bin/env node
"use strict";

const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const ROOT = __dirname;
const MAX_WIDTH = 1400;
const WEBP_QUALITY = 80;
const CONCURRENCY = 4;
const SOURCE_EXTS = new Set([".jpg", ".jpeg", ".png"]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".cursor",
  ".netlify",
]);
const SKIP_FILES = new Set(["favicon-32.png"]);

async function walk(dir, acc = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(full, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!SOURCE_EXTS.has(ext) || SKIP_FILES.has(entry.name)) continue;
    acc.push(full);
  }
  return acc;
}

async function mapLimit(items, limit, fn) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await fn(current, index);
    }
  });
  await Promise.all(workers);
}

async function convertFile(file, i, total) {
  const out = file.replace(/\.(jpe?g|png)$/i, ".webp");
  const before = (await fs.stat(file)).size;

  await sharp(file)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(out);

  const after = (await fs.stat(out)).size;
  await fs.unlink(file);

  const rel = path.relative(ROOT, file);
  const saved = ((1 - after / before) * 100).toFixed(1);
  console.log(`[${i}/${total}] ${rel}  ${fmt(before)} → ${fmt(after)}  (${saved}%)`);
  return { before, after };
}

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function rewriteLocalExt(value) {
  if (typeof value !== "string") return value;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  return value.replace(/\.(jpe?g|png)(?=$|[?#])/gi, ".webp");
}

function rewriteTree(node) {
  if (Array.isArray(node)) return node.map(rewriteTree);
  if (node && typeof node === "object") {
    const next = {};
    for (const [key, val] of Object.entries(node)) next[key] = rewriteTree(val);
    return next;
  }
  return rewriteLocalExt(node);
}

async function updateProductsJson() {
  const file = path.join(ROOT, "products.json");
  const data = JSON.parse(await fs.readFile(file, "utf8"));
  await fs.writeFile(file, JSON.stringify(rewriteTree(data), null, 2) + "\n");
  console.log("Updated products.json image extensions → .webp");
}

async function updateIndexHtml() {
  const file = path.join(ROOT, "index.html");
  const html = await fs.readFile(file, "utf8");
  const next = html.replace(/og-image\.jpe?g/gi, "og-image.webp");
  if (next === html) {
    console.log("index.html: no og-image.jpg/.jpeg paths to update");
    return;
  }
  await fs.writeFile(file, next);
  console.log("Updated index.html og-image.jpeg → og-image.webp");
}

async function main() {
  const files = await walk(ROOT);
  if (!files.length) {
    console.log("No JPG/JPEG/PNG files found.");
    await updateProductsJson();
    await updateIndexHtml();
    return;
  }

  console.log(`Converting ${files.length} images to WebP (max ${MAX_WIDTH}px, q=${WEBP_QUALITY})…`);
  let before = 0;
  let after = 0;
  let ok = 0;
  const failed = [];

  await mapLimit(files, CONCURRENCY, async (file, i) => {
    try {
      const result = await convertFile(file, i, files.length);
      before += result.before;
      after += result.after;
      ok += 1;
    } catch (err) {
      failed.push(file);
      console.error(`FAIL ${path.relative(ROOT, file)}: ${err.message}`);
    }
  });

  await updateProductsJson();
  await updateIndexHtml();

  console.log("\nDone.");
  console.log(`Converted: ${ok}/${files.length}`);
  console.log(`Size: ${fmt(before)} → ${fmt(after)}  (saved ${fmt(Math.max(0, before - after))})`);
  if (failed.length) {
    console.error(`Failed: ${failed.length}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
