import { describe, expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  CORE_NAME,
  MAX_CORE_BYTES,
  Live2DRuntimeInstallError,
  detectCoreVersion,
  readCoreFromFile,
  validateCore,
} from "./live2d-runtime-core"

const VALID_CORE =
  "/* Live2DCubismCore 5.0.2 */ var Live2DCubismCore; !function (C) { C.csmGetDrawableRenderOrders = function () {} }()"

async function withTempFile(name: string, data: Uint8Array, run: (path: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "wife-runtime-"))
  const file = join(dir, name)
  await writeFile(file, data)
  try {
    await run(file)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function storeZip(entries: { name: string; data: Uint8Array }[]) {
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name)
    const header = new Uint8Array(30)
    const view = new DataView(header.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(8, 0, true)
    view.setUint32(14, crc32(entry.data), true)
    view.setUint32(18, entry.data.length, true)
    view.setUint32(22, entry.data.length, true)
    view.setUint16(26, name.length, true)
    parts.push(header, name, entry.data)

    const cd = new Uint8Array(46)
    const cdView = new DataView(cd.buffer)
    cdView.setUint32(0, 0x02014b50, true)
    cdView.setUint16(4, 20, true)
    cdView.setUint16(6, 20, true)
    cdView.setUint16(8, 0, true)
    cdView.setUint32(16, crc32(entry.data), true)
    cdView.setUint32(20, entry.data.length, true)
    cdView.setUint32(24, entry.data.length, true)
    cdView.setUint16(28, name.length, true)
    cdView.setUint32(42, offset, true)
    central.push(cd, name)
    offset += header.length + name.length + entry.data.length
  }
  const cdSize = central.reduce((sum, part) => sum + part.length, 0)
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)
  eocdView.setUint32(0, 0x06054b50, true)
  eocdView.setUint16(8, entries.length, true)
  eocdView.setUint16(10, entries.length, true)
  eocdView.setUint32(12, cdSize, true)
  eocdView.setUint32(16, offset, true)
  return concat([...parts, ...central, eocd])
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(data: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

describe("readCoreFromFile", () => {
  test("reads a plain core file", async () => {
    await withTempFile("live2dcubismcore.min.js", new TextEncoder().encode(VALID_CORE), async (path) => {
      const data = await readCoreFromFile(path)
      expect(new TextDecoder().decode(data)).toContain("Live2DCubismCore")
    })
  })

  test("extracts the core from an SDK ZIP", async () => {
    const zip = storeZip([
      { name: `Samples/Live2DCubismCore-5.0/${CORE_NAME}`, data: new TextEncoder().encode(VALID_CORE) },
    ])
    await withTempFile("sdk.zip", zip, async (path) => {
      const data = await readCoreFromFile(path)
      expect(new TextDecoder().decode(data)).toContain("Live2DCubismCore")
    })
  })

  test("rejects a ZIP without the core", async () => {
    const zip = storeZip([{ name: "README.txt", data: new TextEncoder().encode("no core here") }])
    await withTempFile("sdk.zip", zip, async (path) => {
      const error = await readCoreFromFile(path).then(
        () => null,
        (error) => error,
      )
      expect(error).toBeInstanceOf(Live2DRuntimeInstallError)
      if (error instanceof Live2DRuntimeInstallError) {
        expect(error.code).toBe("core-not-found")
      }
    })
  })
})

describe("validateCore", () => {
  test("accepts a valid core file", () => {
    expect(() => validateCore(new TextEncoder().encode(VALID_CORE))).not.toThrow()
  })

  test("rejects an empty file", () => {
    expect(() => validateCore(new Uint8Array(0))).toThrow("invalid-size")
  })

  test("rejects an oversized file", () => {
    expect(() => validateCore(new Uint8Array(MAX_CORE_BYTES + 1))).toThrow("invalid-size")
  })

  test("rejects a file that is not a Cubism core", () => {
    expect(() => validateCore(new TextEncoder().encode("hello world"))).toThrow("invalid-core")
  })

  test("rejects a Cubism 5 SDK core without the render-orders API", () => {
    const core5 = new TextEncoder().encode(
      "/* Live2DCubismCore 5 */ var Live2DCubismCore; !function (C) { C.csmGetDrawableCount = function () {} }()",
    )
    expect(() => validateCore(core5)).toThrow("incompatible-core")
  })

  test("accepts a core with the render-orders API", () => {
    const core = new TextEncoder().encode(
      "/* Live2DCubismCore */ var Live2DCubismCore; !function (C) { C.csmGetDrawableRenderOrders = function () {} }()",
    )
    expect(() => validateCore(core)).not.toThrow()
  })
})

describe("detectCoreVersion", () => {
  test("detects the version in a core file", () => {
    expect(detectCoreVersion("Cubism Core 5.0.2")).toBe("5.0.2")
    expect(detectCoreVersion("Live2DCubismCore version 4.2.1")).toBe("4.2.1")
  })

  test("returns undefined when no version is present", () => {
    expect(detectCoreVersion("no version here")).toBeUndefined()
  })
})
