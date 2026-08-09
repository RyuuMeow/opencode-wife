import { describe, expect, test } from "bun:test"
import { wifeBubbleExpelled, wifeBubbleFitCount } from "./wife-chat-layout"

describe("wifeBubbleFitCount", () => {
  test("keeps the newest bubbles that fit alongside reserved controls", () => {
    expect(
      wifeBubbleFitCount({
        messageHeights: [40, 50, 60, 70],
        reservedHeight: 30,
        containerHeight: 360,
        heightRatio: 0.5,
        gap: 12,
      }),
    ).toBe(2)
  })

  test("always keeps the newest bubble even when it exceeds the available height", () => {
    expect(
      wifeBubbleFitCount({
        messageHeights: [80, 200],
        reservedHeight: 40,
        containerHeight: 240,
        heightRatio: 0.5,
        gap: 12,
      }),
    ).toBe(1)
  })

  test("uses the ratio as an eviction budget while retaining one oversized bubble", () => {
    expect(
      wifeBubbleFitCount({
        messageHeights: [80, 220],
        reservedHeight: 0,
        containerHeight: 400,
        heightRatio: 0.35,
        gap: 12,
      }),
    ).toBe(1)
  })
})

describe("wifeBubbleExpelled", () => {
  test("returns every expelled visible bubble in one batch", () => {
    expect(wifeBubbleExpelled(["hidden", "one", "two", "three", "four"], 4, 1)).toEqual([
      "one",
      "two",
      "three",
    ])
  })

  test("does not expel hidden history or bubbles that still fit", () => {
    expect(wifeBubbleExpelled(["hidden", "one", "two"], 2, 2)).toEqual([])
  })
})
