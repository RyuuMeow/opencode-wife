import { describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { importOpenCodePreferences } from "./profile-import"

describe("OpenCode preference import", () => {
  test("imports safe preferences and preserves Wife-owned values", async () => {
    const root = await mkdtemp(join(tmpdir(), "wife-profile-import-"))
    const source = join(root, "source")
    const target = join(root, "target")
    await Promise.all([mkdir(source), mkdir(target)])
    await writeFile(
      join(source, "default.dat"),
      JSON.stringify({
        "settings.v3": JSON.stringify({ general: { theme: "dark", wifeMode: false }, wifeOnly: "source" }),
        "wife.registry.v1": "source-registry",
      }),
    )
    await writeFile(
      join(target, "default.dat"),
      JSON.stringify({ "settings.v3": JSON.stringify({ general: { wifeMode: true }, wifeOnly: "target" }) }),
    )
    await writeFile(join(source, "wife"), JSON.stringify({ modelFolders: { source: "model" } }))

    const result = await importOpenCodePreferences({ source, target })
    const output = JSON.parse(await readFile(join(target, "default.dat"), "utf8"))
    const settings = JSON.parse(output["settings.v3"])
    expect(result.imported).toContain("default.dat")
    expect(settings.general).toEqual({ theme: "dark", wifeMode: true })
    expect(settings.wifeOnly).toBe("target")
    expect(output["wife.registry.v1"]).toBe("source-registry")
  })

  test("is idempotent and never copies backend state", async () => {
    const root = await mkdtemp(join(tmpdir(), "wife-profile-import-"))
    const source = join(root, "source")
    const target = join(root, "target")
    await Promise.all([mkdir(join(source, "opencode"), { recursive: true }), mkdir(target)])
    await writeFile(join(source, "opencode.global.dat"), JSON.stringify({ model: "one" }))
    await writeFile(join(source, "opencode", "opencode.db"), "database")

    const first = await importOpenCodePreferences({ source, target })
    await writeFile(join(source, "opencode.global.dat"), JSON.stringify({ model: "two" }))
    const second = await importOpenCodePreferences({ source, target })
    expect(second).toEqual(first)
    expect(await readFile(join(target, "opencode.global.dat"), "utf8")).toContain("one")
    expect(await readFile(join(target, "opencode", "opencode.db"), "utf8").catch(() => undefined)).toBeUndefined()
  })
})
