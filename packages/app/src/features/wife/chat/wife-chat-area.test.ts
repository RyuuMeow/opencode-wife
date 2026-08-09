import { describe, expect, test } from "bun:test"
import { wifeBubbleFitCount } from "./wife-chat-layout"

describe("wifeBubbleFitCount", () => {
  test("keeps the newest bubbles that fit alongside reserved controls", () => {
    expect(
      wifeBubbleFitCount({
        messageHeights: [40, 50, 60, 70],
        reservedHeight: 30,
        threshold: 180,
        gap: 12,
      }),
    ).toBe(2)
  })

  test("always keeps the newest bubble even when it exceeds the available height", () => {
    expect(
      wifeBubbleFitCount({
        messageHeights: [80, 200],
        reservedHeight: 40,
        threshold: 120,
        gap: 12,
      }),
    ).toBe(1)
  })
})
