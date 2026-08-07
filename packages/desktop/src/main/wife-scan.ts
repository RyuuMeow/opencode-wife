import { readFile, readdir, stat } from "node:fs/promises"
import { join, relative, sep } from "node:path"

export const MAX_MODEL_JSON_BYTES = 5 * 1024 * 1024
export const MAX_MODEL_ASSET_BYTES = 200 * 1024 * 1024

export type WifeModelFolderManifestEntry = {
  relativePath: string
  size: number
  text: string | null
}

export async function scanModelFolder(root: string, base = root): Promise<WifeModelFolderManifestEntry[]> {
  const entries: WifeModelFolderManifestEntry[] = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue
    const absolute = join(root, entry.name)
    if (entry.isDirectory()) {
      entries.push(...(await scanModelFolder(absolute, base)))
      continue
    }
    if (!entry.isFile()) continue
    const size = (await stat(absolute)).size
    if (size > MAX_MODEL_ASSET_BYTES) continue
    const text = entry.name.endsWith(".json") && size <= MAX_MODEL_JSON_BYTES ? await readFile(absolute, "utf8") : null
    entries.push({ relativePath: relative(base, absolute).split(sep).join("/"), size, text })
  }
  return entries
}
