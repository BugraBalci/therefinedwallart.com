#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const args = ["-i", "./src/input.css", "-o", "./assets/styles.css", "--minify"];
const candidates = [
  path.join(ROOT, "node_modules", ".bin", "tailwindcss"),
  path.join(ROOT, "bin", "tailwindcss"),
];

const bin = candidates.find((file) => fs.existsSync(file));
if (!bin) {
  console.error("Tailwind CLI not found. Run npm install or place the standalone CLI at bin/tailwindcss.");
  process.exit(1);
}

const result = spawnSync(bin, args, { cwd: ROOT, stdio: "inherit" });
process.exit(result.status ?? 1);
