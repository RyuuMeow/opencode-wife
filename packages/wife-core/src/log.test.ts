import { describe, expect, test } from "bun:test"
import { formatWifeLogValue } from "./log"

describe("formatWifeLogValue", () => {
  test("serializes structured activity details for desktop logs", () => {
    expect(formatWifeLogValue({ directory: "C:/workspace", type: "session.updated", id: "session" })).toBe(
      '{"directory":"C:/workspace","type":"session.updated","id":"session"}',
    )
  })

  test("preserves errors and primitive values", () => {
    const error = new Error("failed")
    expect(formatWifeLogValue(error)).toBe(error)
    expect(formatWifeLogValue("event")).toBe("event")
  })

  test("labels circular objects without falling back to object coercion", () => {
    const value: { self?: unknown } = {}
    value.self = value
    expect(formatWifeLogValue(value)).toBe("[Unserializable object]")
  })
})
