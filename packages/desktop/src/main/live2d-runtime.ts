import { createHash } from "node:crypto"
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises"
import { basename, join } from "node:path"
import { pathToFileURL } from "node:url"
import { app, dialog, net, protocol } from "electron"
import { write as writeLog } from "./logging"
import {
  CORE_NAME,
  MAX_CORE_BYTES,
  Live2DRuntimeInstallError,
  detectCoreVersion,
  readCoreFromFile,
  validateCore,
  type Live2DRuntimeInstallErrorCode,
  type Live2DRuntimeStatus,
} from "./live2d-runtime-core"

export const live2dRuntimeProtocol = "wife-runtime"

const CORE_DOWNLOAD_URL = "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"

export type { Live2DRuntimeStatus } from "./live2d-runtime-core"

export type Live2DRuntimeInstallResult =
  | { ok: true; status: Live2DRuntimeStatus }
  | { ok: false; code: "canceled" | "download-failed" | Live2DRuntimeInstallErrorCode }

export async function getLive2DRuntimeStatus(): Promise<Live2DRuntimeStatus> {
  const development = process.env.LIVE2D_CUBISM_CORE_PATH
  if (development && (await validFile(development))) {
    return { installed: true, source: "LIVE2D_CUBISM_CORE_PATH" }
  }
  const metadata = await readMetadata()
  if (!metadata || !(await validFile(corePath()))) return { installed: false }
  return metadata
}

export async function downloadLive2DRuntime(): Promise<Live2DRuntimeInstallResult> {
  let data: Uint8Array
  try {
    const response = await net.fetch(CORE_DOWNLOAD_URL)
    if (!response.ok) return { ok: false, code: "download-failed" }
    data = new Uint8Array(await response.arrayBuffer())
  } catch {
    return { ok: false, code: "download-failed" }
  }
  return installCoreFromBytes(data, "live2dcubismcore.min.js")
}

export async function installLive2DRuntime(): Promise<Live2DRuntimeInstallResult> {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Live2D Cubism SDK", extensions: ["zip", "js"] },
      { name: "All files", extensions: ["*"] },
    ],
  })
  const selected = result.filePaths[0]
  if (result.canceled || !selected) return { ok: false, code: "canceled" }
  const data = await readCoreFromFile(selected)
  return installCoreFromBytes(data, basename(selected))
}

export async function removeLive2DRuntime() {
  await rm(runtimeRoot(), { recursive: true, force: true })
}

export function registerLive2DRuntimeProtocol() {
  if (protocol.isProtocolHandled(live2dRuntimeProtocol)) return
  protocol.handle(live2dRuntimeProtocol, async (request) => {
    if (new URL(request.url).pathname !== `/${CORE_NAME}`) return new Response("Not found", { status: 404 })
    const development = process.env.LIVE2D_CUBISM_CORE_PATH
    const file = development && (await validFile(development)) ? development : corePath()
    if (!(await validFile(file))) return new Response("Not found", { status: 404 })
    return net.fetch(pathToFileURL(file).toString()).catch((error) => {
      writeLog("live2d", "runtime fetch failed", { error }, "error")
      return new Response("Not found", { status: 404 })
    })
  })
}

async function installCoreFromBytes(data: Uint8Array, source: string): Promise<Live2DRuntimeInstallResult> {
  try {
    validateCore(data)
    await mkdir(runtimeRoot(), { recursive: true })
    const temporary = `${corePath()}.${process.pid}.tmp`
    await writeFile(temporary, data)
    await rename(temporary, corePath())
    const text = new TextDecoder().decode(data.subarray(0, Math.min(data.length, 32_000)))
    const status: Live2DRuntimeStatus = {
      installed: true,
      source,
      sha256: createHash("sha256").update(data).digest("hex"),
      version: detectCoreVersion(text),
      installedAt: new Date().toISOString(),
    }
    await writeFile(metadataPath(), `${JSON.stringify(status, null, 2)}\n`, "utf8")
    return { ok: true, status }
  } catch (error) {
    if (error instanceof Live2DRuntimeInstallError) {
      writeLog("live2d", "core install rejected", { code: error.code, source }, "warn")
      return { ok: false, code: error.code }
    }
    throw error
  }
}

async function readMetadata() {
  return readFile(metadataPath(), "utf8").then(
    (value) => JSON.parse(value) as Live2DRuntimeStatus,
    () => undefined,
  )
}

function runtimeRoot() {
  return join(app.getPath("userData"), "live2d", "runtime")
}

function corePath() {
  return join(runtimeRoot(), CORE_NAME)
}

function metadataPath() {
  return join(runtimeRoot(), "runtime.json")
}

async function validFile(path: string) {
  return stat(path).then(
    (value) => value.isFile() && value.size > 0 && value.size <= MAX_CORE_BYTES,
    () => false,
  )
}
