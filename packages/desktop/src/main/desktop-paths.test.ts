import { describe, expect, test } from "bun:test"
import { desktopPaths } from "./desktop-paths"

describe("desktopPaths", () => {
  test("keeps the Wife profile separate while sharing production Agent state", () => {
    expect(
      desktopPaths({
        appData: "C:\\Users\\test\\AppData\\Roaming",
        wifeAppId: "io.github.ryuumeow.opencode-wife",
        channel: "prod",
      }),
    ).toEqual({
      wifeUserData: "C:\\Users\\test\\AppData\\Roaming\\io.github.ryuumeow.opencode-wife",
      agentStateHome: "C:\\Users\\test\\AppData\\Roaming\\ai.opencode.desktop",
    })
  })

  test("uses matching original channel state for development", () => {
    expect(
      desktopPaths({ appData: "C:\\state", wifeAppId: "io.github.ryuumeow.opencode-wife.dev", channel: "dev" }),
    ).toEqual({
      wifeUserData: "C:\\state\\io.github.ryuumeow.opencode-wife.dev",
      agentStateHome: "C:\\state\\ai.opencode.desktop.dev",
    })
  })
})
