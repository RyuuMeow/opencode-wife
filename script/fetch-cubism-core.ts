#!/usr/bin/env bun

import path from "path"

const CUBISM_CORE_URL = "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"
const target = path.resolve(import.meta.dir, "../packages/app/public/vendor/live2dcubismcore.min.js")

if (await Bun.file(target).exists() && !process.argv.includes("--force")) {
  console.log(`cubism core already exists at ${target}`)
  process.exit(0)
}

const response = await fetch(CUBISM_CORE_URL)
if (!response.ok) {
  console.error(
    `failed to download cubism core (${response.status} ${response.statusText}); place live2dcubismcore.min.js manually at ${target}`,
  )
  process.exit(1)
}

await Bun.write(target, await response.arrayBuffer())
console.log(`downloaded cubism core to ${target}`)
