import { describe, expect, test } from "bun:test"
import { resolve } from "node:path"
import { resolveWifePath } from "./wife-path"

describe("wife model path resolution", () => {
  const folders = { "char-1": resolve("models", "bear") }

  test("resolves files inside the whitelisted folder", () => {
    const file = resolveWifePath(folders, "wife://char-1/luna.model3.json")
    expect(file).toBe(resolve("models", "bear", "luna.model3.json"))
  })

  test("resolves nested paths", () => {
    const file = resolveWifePath(folders, "wife://char-1/motions/idle.motion3.json")
    expect(file).toBe(resolve("models", "bear", "motions", "idle.motion3.json"))
  })

  test("rejects unknown character hosts", () => {
    expect(resolveWifePath(folders, "wife://other/model3.json")).toBeNull()
    expect(resolveWifePath(folders, "wife:///model3.json")).toBeNull()
  })

  test("rejects path traversal", () => {
    expect(resolveWifePath(folders, "wife://char-1/..%2F..%2Fsecret.txt")).toBeNull()
    expect(resolveWifePath(folders, "wife://char-1/motions/%2e%2e%2f..%2fsecret.txt")).toBeNull()
    expect(resolveWifePath(folders, "wife://char-1/..%5C..%5Csecret.txt")).toBeNull()
  })

  test("rejects empty folders", () => {
    expect(resolveWifePath({ "char-1": "" }, "wife://char-1/model3.json")).toBeNull()
  })
})
