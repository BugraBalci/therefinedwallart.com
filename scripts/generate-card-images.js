#!/usr/bin/env node
"use strict";

const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const WIDTHS = [400, 800];
const CONCURRENCY = 6;
const WEBP_QUALITY = 76;
const AVIF_QUALITY = 55;

function encodePath(rel) {
  return rel
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function thumbRel(rel, width, ext) {
  const withoutExt = rel.replace(/\.[a-z0-9]+$/i, "");
  return path.posix.join("thumbs", `w${width}`, `${withoutExt}.${ext}`);
}

async function walkProducts() {
  const data = JSON.parse(await fs.readFile(path.join(ROOT, "products.json"), "utf8"));
  const unique = new Map();
  for (const product of data) {
    const src = product?.images?.[0];
    if (!src) continue;
    const decoded = decodeURI(src);
    unique.set(decoded, src);
  }
  return { products: data, unique };
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

async function writeVariant(input, outRel, width, format) {
  const outAbs = path.join(ROOT, outRel);
  await fs.mkdir(path.dirname(outAbs), { recursive: true });
  const pipeline = sharp(input).rotate().resize({
    width,
    withoutEnlargement: true,
  });
  if (format === "avif") {
    await pipeline.avif({ quality: AVIF_QUALITY, effort: 4 }).toFile(outAbs);
  } else {
    await pipeline.webp({ quality: WEBP_QUALITY, effort: 4 }).toFile(outAbs);
  }
  return (await fs.stat(outAbs)).size;
}

async function patchLcpPreload(avif400, avif800) {
  const file = path.join(ROOT, "index.html");
  const html = await fs.readFile(file, "utf8");
  const next = html.replace(
    /<link\s+rel="preload"\s+as="image"[\s\S]*?fetchpriority="high"\s*>/,
    `<link
    rel="preload"
    as="image"
    type="image/avif"
    href="${avif400}"
    imagesrcset="${avif400} 400w, ${avif800} 800w"
    imagesizes="(min-width: 1536px) 18vw, (min-width: 1024px) 22vw, (min-width: 640px) 46vw, 48vw"
    fetchpriority="high"
  >`
  );
  if (next === html) {
    console.warn("index.html: LCP preload block not updated");
    return;
  }
  await fs.writeFile(file, next);
  console.log("Updated index.html LCP preload");
}

async function main() {
  const { products, unique } = await walkProducts();
  const sources = [...unique.keys()];
  console.log(`Generating card variants for ${sources.length} preview images…`);

  let originalBytes = 0;
  let avif400Bytes = 0;
  let outputBytes = 0;
  const failed = [];
  const samples = [];

  await mapLimit(sources, CONCURRENCY, async (rel) => {
    const abs = path.join(ROOT, rel);
    try {
      const [stat, meta] = await Promise.all([fs.stat(abs), sharp(abs).metadata()]);
      originalBytes += stat.size;
      let avif400 = 0;
      for (const width of WIDTHS) {
        outputBytes += await writeVariant(abs, thumbRel(rel, width, "webp"), width, "webp");
        const avifSize = await writeVariant(abs, thumbRel(rel, width, "avif"), width, "avif");
        outputBytes += avifSize;
        if (width === 400) avif400 = avifSize;
      }
      avif400Bytes += avif400;
      samples.push({
        rel,
        width: meta.width,
        height: meta.height,
        original: stat.size,
        avif400,
      });
    } catch (err) {
      failed.push(`${rel}: ${err.message}`);
    }
  });

  samples.sort((a, b) => b.original - a.original);
  const first = decodeURI(products[0].images[0]);
  const lcpAvif = encodePath(thumbRel(first, 800, "avif"));
  const lcpAvif400 = encodePath(thumbRel(first, 400, "avif"));
  await patchLcpPreload(lcpAvif400, lcpAvif);

  console.log(`Original previews: ${(originalBytes / 1024).toFixed(1)} KB`);
  console.log(`Generated variants (all widths/formats): ${(outputBytes / 1024).toFixed(1)} KB`);
  console.log(`Card AVIF 400w total: ${(avif400Bytes / 1024).toFixed(1)} KB`);
  console.log(`LCP preload: ${lcpAvif}`);
  console.log(`LCP srcset: ${lcpAvif400} 400w, ${lcpAvif} 800w`);
  console.log("Largest original previews → 400w AVIF:");
  for (const row of samples.slice(0, 8)) {
    console.log(
      `  ${row.width}x${row.height}  ${(row.original / 1024).toFixed(1)} KB → ${(row.avif400 / 1024).toFixed(1)} KB  ${row.rel}`
    );
  }
  if (failed.length) {
    console.error(failed.join("\n"));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
