import { describe, expect, test } from "bun:test"
import {
  wifeChatBubbleStyle,
  wifeChatEntryDuration,
  wifeChatExitDuration,
  wifeChatGeometryKey,
  wifeChatHeaderVisible,
  type WifeChatMessage,
} from "./wife-chat-display"

const messages: WifeChatMessage[] = [
  { id: "a:0", turnID: "a", role: "assistant", content: "一" },
  { id: "a:1", turnID: "a", role: "assistant", content: "二" },
  { id: "b", turnID: "b", role: "user", content: "好" },
  { id: "c:0", turnID: "c", role: "assistant", content: "三" },
]

describe("wife chat bubble display", () => {
  test("supports every, turn, and hidden character headers", () => {
    expect(messages.map((_, index) => wifeChatHeaderVisible(messages, index, "every"))).toEqual([
      true,
      true,
      false,
      true,
    ])
    expect(messages.map((_, index) => wifeChatHeaderVisible(messages, index, "turn"))).toEqual([
      true,
      false,
      false,
      true,
    ])
    expect(messages.map((_, index) => wifeChatHeaderVisible(messages, index, "hidden"))).toEqual([
      false,
      false,
      false,
      false,
    ])
  })

  test("shows a turn header when the visible slice starts mid-turn", () => {
    expect(wifeChatHeaderVisible(messages.slice(1), 0, "turn")).toBe(true)
  })

  test("maps text size and contrast without raw colors", () => {
    expect(wifeChatBubbleStyle("assistant", "small", "soft")["--font-size-base"]).toBe("13px")
    expect(wifeChatBubbleStyle("assistant", "standard", "standard")["--font-size-base"]).toBe("15px")
    expect(wifeChatBubbleStyle("assistant", "large", "strong")["--font-size-base"]).toBe("17px")
    expect(wifeChatBubbleStyle("assistant", "standard", "strong")["background-color"]).toContain(
      "var(--v2-background-bg-base)",
    )
  })

  test("resolves motion durations and gives reduced motion priority", () => {
    expect(wifeChatExitDuration("full", false)).toBe(280)
    expect(wifeChatExitDuration("subtle", false)).toBe(150)
    expect(wifeChatExitDuration("off", false)).toBe(0)
    expect(wifeChatExitDuration("full", true)).toBe(0)
    expect(wifeChatEntryDuration("full", false)).toBe(300)
    expect(wifeChatEntryDuration("subtle", false)).toBe(150)
    expect(wifeChatEntryDuration("off", false)).toBe(0)
    expect(wifeChatEntryDuration("full", true)).toBe(0)
  })

  test("remeasures only settings that change bubble geometry", () => {
    const current = wifeChatGeometryKey(0.35, "standard", "every")
    expect(wifeChatGeometryKey(0.5, "standard", "every")).not.toBe(current)
    expect(wifeChatGeometryKey(0.35, "large", "every")).not.toBe(current)
    expect(wifeChatGeometryKey(0.35, "standard", "turn")).not.toBe(current)
    expect(wifeChatGeometryKey(0.35, "standard", "every")).toBe(current)
  })
})
