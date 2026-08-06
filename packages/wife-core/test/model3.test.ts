import { describe, expect, test } from "bun:test"
import {
  emptyCapabilities,
  extractCapabilities,
  findModel3Files,
  isPathSafe,
  normalizeModelPath,
  parseModel3,
  resolveModelPath,
  scanHasErrors,
  scanLive2dModel,
} from "../src/index"
import { fileSet, lunaFiles, lunaModel3 } from "./fixtures/luna"

describe("path normalization", () => {
  test("normalizes separators and leading dots", () => {
    expect(normalizeModelPath("textures\\luna.png")).toBe("textures/luna.png")
    expect(normalizeModelPath("./motions/idle.motion3.json")).toBe("motions/idle.motion3.json")
    expect(normalizeModelPath("/absolute/file")).toBe("absolute/file")
  })

  test("rejects absolute and URL paths but allows parent segments", () => {
    expect(isPathSafe("motions/idle.motion3.json")).toBe(true)
    expect(isPathSafe("../outside.moc3")).toBe(true)
    expect(isPathSafe("C:/Windows/system32")).toBe(false)
    expect(isPathSafe("https://example.com/model.moc3")).toBe(false)
  })

  test("collapses parent segments when resolving", () => {
    expect(resolveModelPath("model", "../textures/a.png")).toBe("textures/a.png")
    expect(resolveModelPath("a/b", "../../c.moc3")).toBe("c.moc3")
    expect(resolveModelPath("", "motions/idle.motion3.json")).toBe("motions/idle.motion3.json")
    expect(resolveModelPath("model", "./moc/小熊.moc3")).toBe("model/moc/小熊.moc3")
  })
})

describe("parseModel3", () => {
  test("accepts version 3 models", () => {
    const result = parseModel3(lunaModel3, "luna.model3.json")
    expect(result.model.Version).toBe(3)
    expect(result.issues).toEqual([])
  })

  test("rejects unsupported versions and missing Moc", () => {
    const result = parseModel3({ Version: 2, FileReferences: {} }, "old.model3.json")
    expect(result.issues).toHaveLength(2)
    expect(result.issues[0]?.code).toBe("unsupported-version")
    expect(result.issues[1]?.code).toBe("missing-moc")
  })

  test("rejects malformed content", () => {
    const result = parseModel3("not an object", "bad.model3.json")
    expect(result.issues[0]?.severity).toBe("error")
    expect(result.issues[0]?.code).toBe("invalid-model3")
  })
})

describe("extractCapabilities", () => {
  test("extracts motion groups, expressions and parameters", () => {
    const caps = extractCapabilities(lunaModel3)
    expect(Object.keys(caps.motionGroups).sort()).toEqual(["Agree", "Happy", "Idle", "Think"])
    expect(caps.motionGroups.Idle?.map((motion) => motion.index)).toEqual([0, 1])
    expect(caps.motionGroups.Idle?.[1]?.file).toBe("motions/idle-1.motion3.json")
    expect(caps.expressions.map((expression) => expression.id)).toEqual(["Smile", "Serious"])
    expect(caps.parameters.map((parameter) => parameter.id)).toContain("ParamAngleX")
    expect(caps.parameters.find((parameter) => parameter.id === "ParamAngleX")?.max).toBe(30)
  })

  test("detects lip sync, blink, gaze, angle and mouth form support", () => {
    const caps = extractCapabilities(lunaModel3)
    expect(caps.lipSyncParameterIds).toEqual(["ParamMouthOpenY"])
    expect(caps.eyeBlinkParameterIds).toEqual(["ParamEyeLOpen", "ParamEyeROpen"])
    expect(caps.supportsGaze).toBe(true)
    expect(caps.supportsAngle).toBe(true)
    expect(caps.supportsMouthForm).toBe(true)
  })

  test("handles models without groups or parameters", () => {
    const caps = extractCapabilities({ Version: 3, FileReferences: { Moc: "a.moc3" } })
    expect(caps).toEqual(emptyCapabilities())
  })
})

describe("scanLive2dModel", () => {
  test("scans a complete model without issues", async () => {
    const result = await scanLive2dModel("luna.model3.json", fileSet(lunaFiles))
    expect(scanHasErrors(result.issues)).toBe(false)
    expect(result.capabilities.motionGroups.Idle).toHaveLength(2)
  })

  test("resolves references relative to the model directory", async () => {
    const nested = {
      "model/小熊.model3.json": JSON.stringify({
        Version: 3,
        FileReferences: {
          Moc: "小熊.moc3",
          Textures: ["小熊.4096/texture_00.png", "../40a8d217.png"],
          Physics: "小熊.physics3.json",
          DisplayInfo: "小熊.cdi3.json",
        },
        Groups: [{ Target: "Parameter", Name: "LipSync", Ids: ["ParamMouthOpenY"] }],
      }),
      "model/小熊.moc3": "\u0000moc",
      "model/小熊.physics3.json": JSON.stringify({ Version: 3 }),
      "model/小熊.cdi3.json": JSON.stringify({ Version: 3 }),
      "model/小熊.4096/texture_00.png": "\u0000png",
      "40a8d217.png": "\u0000png",
    }
    const result = await scanLive2dModel("model/小熊.model3.json", fileSet(nested))
    expect(result.issues).toEqual([])
    expect(result.capabilities.lipSyncParameterIds).toEqual(["ParamMouthOpenY"])
  })

  test("reports missing assets with resolved paths", async () => {
    const files = {
      "model/小熊.model3.json": JSON.stringify({
        Version: 3,
        FileReferences: { Moc: "小熊.moc3", Textures: ["小熊.4096/texture_00.png"] },
      }),
      "model/小熊.4096/texture_00.png": "\u0000png",
    }
    const result = await scanLive2dModel("model/小熊.model3.json", fileSet(files))
    const missing = result.issues.filter((issue) => issue.code === "missing-asset")
    expect(missing.map((issue) => issue.path)).toEqual(["model/小熊.moc3"])
    expect(scanHasErrors(result.issues)).toBe(true)
  })

  test("warns instead of blocking on optional assets", async () => {
    const files = {
      "model/小熊.model3.json": JSON.stringify({
        Version: 3,
        FileReferences: {
          Moc: "小熊.moc3",
          Textures: ["小熊.4096/texture_00.png"],
          Physics: "小熊.physics3.json",
          DisplayInfo: "小熊.cdi3.json",
        },
      }),
      "model/小熊.moc3": "\u0000moc",
      "model/小熊.4096/texture_00.png": "\u0000png",
    }
    const result = await scanLive2dModel("model/小熊.model3.json", fileSet(files))
    const missing = result.issues.filter((issue) => issue.code === "missing-asset")
    expect(missing.map((issue) => [issue.path, issue.severity]).sort()).toEqual([
      ["model/小熊.cdi3.json", "warning"],
      ["model/小熊.physics3.json", "warning"],
    ])
    expect(scanHasErrors(result.issues)).toBe(false)
  })

  test("reports every missing referenced asset", async () => {
    const files = { ...lunaFiles }
    delete files["luna.moc3"]
    delete files["textures/luna.png"]
    delete files["motions/think.motion3.json"]
    const result = await scanLive2dModel("luna.model3.json", fileSet(files))
    const missing = result.issues.filter((issue) => issue.code === "missing-asset")
    expect(missing.map((issue) => issue.path).sort()).toEqual([
      "luna.moc3",
      "motions/think.motion3.json",
      "textures/luna.png",
    ])
  })

  test("resolves parent references within the picked file set", async () => {
    const files = {
      ...lunaFiles,
      "luna.model3.json": JSON.stringify({
        ...lunaModel3,
        FileReferences: { ...lunaModel3.FileReferences, Moc: "../../outside.moc3" },
      }),
    }
    const result = await scanLive2dModel("luna.model3.json", fileSet(files))
    expect(result.issues.some((issue) => issue.code === "missing-asset" && issue.path === "outside.moc3")).toBe(true)
    expect(result.issues.some((issue) => issue.code === "unsafe-path")).toBe(false)
  })

  test("rejects absolute reference paths", async () => {
    const files = {
      ...lunaFiles,
      "luna.model3.json": JSON.stringify({
        ...lunaModel3,
        FileReferences: { ...lunaModel3.FileReferences, Moc: "C:/Windows/outside.moc3" },
      }),
    }
    const result = await scanLive2dModel("luna.model3.json", fileSet(files))
    expect(result.issues.some((issue) => issue.code === "unsafe-path")).toBe(true)
  })

  test("reports a missing model file", async () => {
    const result = await scanLive2dModel("missing.model3.json", fileSet(lunaFiles))
    expect(result.issues[0]?.code).toBe("missing-model3")
    expect(result.issues[0]?.severity).toBe("error")
  })

  test("reports malformed json", async () => {
    const result = await scanLive2dModel("luna.model3.json", fileSet({ ...lunaFiles, "luna.model3.json": "{ broken" }))
    expect(result.issues[0]?.code).toBe("malformed-json")
  })
})

describe("findModel3Files", () => {
  test("finds model3 manifests in a file list", () => {
    expect(
      findModel3Files(["textures/luna.png", "luna.model3.json", "motions/a.motion3.json", "other/luna.model3"]),
    ).toEqual(["luna.model3.json", "other/luna.model3"])
  })
})
