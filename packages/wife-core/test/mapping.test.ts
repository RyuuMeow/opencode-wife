import { describe, expect, test } from "bun:test"
import { suggestMappings, suggestStateFallback, suggestionCount } from "../src/live2d/mapping"
import { extractCapabilities } from "../src/index"
import { lunaModel3 } from "./fixtures/luna"

const caps = extractCapabilities(lunaModel3)

describe("suggestMappings", () => {
  test("maps matching motion groups to states", () => {
    const mappings = suggestMappings(caps)
    expect(mappings.states.idle?.motions).toEqual([{ group: "Idle", index: 0 }])
    expect(mappings.states.idle?.loop).toBe(true)
    expect(mappings.states.thinking?.motions).toEqual([{ group: "Think", index: 0 }])
  })

  test("maps matching groups to gestures", () => {
    const mappings = suggestMappings(caps)
    expect(mappings.gestures.nod?.motions).toEqual([{ group: "Agree", index: 0 }])
    expect(mappings.gestures.celebrate?.motions).toEqual([{ group: "Happy", index: 0 }])
  })

  test("maps matching expressions to emotions", () => {
    const mappings = suggestMappings(caps)
    expect(mappings.emotions.happy?.expression).toBe("Smile")
    expect(mappings.emotions.focused?.expression).toBe("Serious")
  })

  test("leaves unmatched semantics unmapped", () => {
    const mappings = suggestMappings(caps)
    expect(mappings.states.error).toBeUndefined()
    expect(mappings.gestures.shake_head).toBeUndefined()
    expect(mappings.emotions.neutral).toBeUndefined()
    expect(suggestionCount(mappings)).toBeGreaterThan(0)
  })

  test("suggests idle as the visible fallback for unmapped states", () => {
    expect(suggestStateFallback("error", suggestMappings(caps).states)).toBe("idle")
    expect(suggestStateFallback("idle", suggestMappings(caps).states)).toBeUndefined()
  })
})
