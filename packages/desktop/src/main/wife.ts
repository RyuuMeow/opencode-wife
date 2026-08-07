import { pathToFileURL } from "node:url"
import { dialog, net, protocol } from "electron"
import { getStore } from "./store"
import { write as writeLog } from "./logging"
import { nativeT } from "./native-translations"
import { resolveWifePath } from "./wife-path"
import { scanModelFolder, type WifeModelFolderManifestEntry } from "./wife-scan"

export { resolveWifePath }
export type { WifeModelFolderManifestEntry }

export const wifeProtocol = "wife"

const WIFE_STORE = "wife"
const MODEL_FOLDERS_KEY = "modelFolders"

export type WifeModelFolderPick = {
  path: string
  files: WifeModelFolderManifestEntry[]
}

export function getWifeModelFolders() {
  const folders = getStore(WIFE_STORE).get(MODEL_FOLDERS_KEY)
  return isRecord(folders) ? folders : {}
}

export function registerWifeProtocol() {
  if (protocol.isProtocolHandled(wifeProtocol)) return

  protocol.handle(wifeProtocol, async (request) => {
    const file = resolveWifePath(getWifeModelFolders(), request.url)
    if (!file) {
      writeLog("protocol", "rejected wife request", { url: request.url }, "warn")
      return new Response("Not found", { status: 404 })
    }

    try {
      const range = request.headers.get("range")
      const response = await net.fetch(pathToFileURL(file).toString(), {
        headers: range ? { range } : undefined,
      })
      if (response.status >= 400) {
        writeLog(
          "protocol",
          "wife fetch failed",
          { url: request.url, file, status: response.status, statusText: response.statusText },
          "error",
        )
      }
      return response
    } catch (error) {
      writeLog("protocol", "wife fetch error", { url: request.url, file, error }, "error")
      return new Response("Not found", { status: 404 })
    }
  })
}

export async function pickWifeModelFolder(characterId: string): Promise<WifeModelFolderPick | null> {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    title: nativeT("desktop.dialog.chooseFolder"),
  })
  const folder = result.filePaths[0]
  if (result.canceled || !folder) return null

  const files = await scanModelFolder(folder)
  getStore(WIFE_STORE).set(MODEL_FOLDERS_KEY, { ...getWifeModelFolders(), [characterId]: folder })
  return { path: folder, files }
}

function isRecord(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
