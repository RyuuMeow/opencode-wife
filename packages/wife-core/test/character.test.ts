import { describe, expect, test } from "bun:test"
import { isCharacterEmotion, isCharacterGesture, isCharacterState } from "../src/index"

describe("semantic vocabulary", () => {
  test("recognizes core states, gestures and emotions", () => {
    expect(isCharacterState("working")).toBe(true)
    expect(isCharacterState("custom_state")).toBe(false)
    expect(isCharacterGesture("nod")).toBe(true)
    expect(isCharacterGesture("custom.flip")).toBe(true)
    expect(isCharacterEmotion("focused")).toBe(true)
    expect(isCharacterEmotion("custom.shy")).toBe(true)
  })
})
