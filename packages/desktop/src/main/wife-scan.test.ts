import { afterEach, describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { scanModelFolder } from "./wife-scan"

const tempRoots: string[] = []

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "wife-scan-"))
  tempRoots.push(root)
  return root
}

describe("wife model folder scan", () => {
  test("keeps nested file paths relative to the picked root", async () => {
    const root = await fixture()
    await writeFile(join(root, "m.model3.json"), "{}")
    await mkdir(join(root, "sub"))
    await writeFile(join(root, "sub", "texture_00.png"), "png")
    await writeFile(join(root, "sub", "nested.json"), "{}")

    const files = await scanModelFolder(root)
    const paths = files.map((file) => file.relativePath).sort()
    expect(paths).toEqual(["m.model3.json", "sub/nested.json", "sub/texture_00.png"])
  })

  test("skips dotfiles and oversized assets", async () => {
    const root = await fixture()
    await writeFile(join(root, ".hidden.png"), "x")
    const files = await scanModelFolder(root)
    expect(files.some((file) => file.relativePath.includes(".hidden"))).toBe(false)
  })

  test("reads json text only for json files", async () => {
    const root = await fixture()
    await writeFile(join(root, "m.json"), '{"a":1}')
    await writeFile(join(root, "m.png"), "png")

    const files = await scanModelFolder(root)
    expect(files.find((file) => file.relativePath === "m.json")?.text).toBe('{"a":1}')
    expect(files.find((file) => file.relativePath === "m.png")?.text).toBeNull()
  })
})
