import { isAbsolute, relative, resolve } from "node:path"

export function resolveWifePath(folders: Record<string, string>, url: string) {
  const parsed = new URL(url)
  const folder = folders[parsed.host]
  if (!folder) return null
  const file = resolve(folder, `.${decodeURIComponent(parsed.pathname)}`)
  const rel = relative(folder, file)
  if (rel.startsWith("..") || isAbsolute(rel)) return null
  return file
}
