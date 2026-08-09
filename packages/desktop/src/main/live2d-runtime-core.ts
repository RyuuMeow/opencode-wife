import { readFile } from "node:fs/promises"
import { basename } from "node:path"
import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader } from "@zip.js/zip.js"

export const CORE_NAME = "live2dcubismcore.min.js"
export const MAX_CORE_BYTES = 5 * 1024 * 1024

export type Live2DRuntimeStatus = {
  installed: boolean
  source?: string
  sha256?: string
  version?: string
  installedAt?: string
}

export type Live2DRuntimeInstallErrorCode = "core-not-found" | "invalid-size" | "invalid-core"

export class Live2DRuntimeInstallError extends Error {
  code: Live2DRuntimeInstallErrorCode
  constructor(code: Live2DRuntimeInstallErrorCode) {
    super(code)
    this.code = code
  }
}

export async function readCoreFromFile(path: string): Promise<Uint8Array> {
  const data = new Uint8Array(await readFile(path))
  if (!path.toLowerCase().endsWith(".zip")) return data
  const reader = new ZipReader(new Uint8ArrayReader(data))
  try {
    const entry = (await reader.getEntries()).find(
      (item) => !item.directory && basename(item.filename).toLowerCase() === CORE_NAME,
    )
    if (!entry) throw new Live2DRuntimeInstallError("core-not-found")
    return await entry.getData!(new Uint8ArrayWriter())
  } finally {
    await reader.close()
  }
}

export function validateCore(data: Uint8Array) {
  if (data.byteLength === 0 || data.byteLength > MAX_CORE_BYTES) {
    throw new Live2DRuntimeInstallError("invalid-size")
  }
  const text = new TextDecoder().decode(data.subarray(0, Math.min(data.length, 128_000)))
  if (!text.includes("Live2DCubismCore") && !text.includes("CubismCore")) {
    throw new Live2DRuntimeInstallError("invalid-core")
  }
}

export function detectCoreVersion(text: string) {
  return text.match(/(?:Cubism Core|CubismCore|Version)[^0-9]{0,20}([0-9]+(?:\.[0-9]+){1,3})/i)?.[1]
}
