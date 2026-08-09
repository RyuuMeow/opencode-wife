import type { Prompt } from "@/context/prompt"
import { describe, expect, test } from "bun:test"
import {
  applyWifeHandoffDraft,
  hasWifeHandoffDraft,
  parseSideChatCommand,
  projectWifeHandoffTranscript,
} from "./side-chat-commands"

describe("side chat command parsing", () => {
  test("accepts only exact local commands", () => {
    expect(parseSideChatCommand(" /send ")).toBe("send")
    expect(parseSideChatCommand("/clear")).toBe("clear")
    expect(parseSideChatCommand("/send foo")).toBeUndefined()
    expect(parseSideChatCommand("/CLEAR")).toBeUndefined()
  })
})

describe("Wife handoff draft", () => {
  const image = {
    type: "image" as const,
    id: "image",
    filename: "reference.png",
    mime: "image/png",
    blob: { id: "blob", url: "data:image/png;base64,AA==" },
  }
  const prompt: Prompt = [
    { type: "text", content: "existing", start: 0, end: 8 },
    { type: "agent", name: "review", content: "@review", start: 8, end: 15 },
    image,
  ]

  test("detects text, mentions, images, and context", () => {
    expect(hasWifeHandoffDraft([], 0)).toBe(false)
    expect(hasWifeHandoffDraft(prompt, 0)).toBe(true)
    expect(hasWifeHandoffDraft([], 1)).toBe(true)
  })

  test("replaces text and mentions while preserving images", () => {
    expect(applyWifeHandoffDraft(prompt, "new task", "replace")).toEqual([
      { type: "text", content: "new task", start: 0, end: 8 },
      image,
    ])
  })

  test("appends after all existing content and preserves attachments", () => {
    expect(applyWifeHandoffDraft(prompt, "new task", "append")).toEqual([
      ...prompt,
      { type: "text", content: "\n\nnew task", start: 0, end: 10 },
    ])
  })
})

describe("Wife handoff transcript", () => {
  test("keeps newest chat messages within its budget", () => {
    const result = projectWifeHandoffTranscript(
      Array.from({ length: 20 }, (_, index) => ({
        id: `${index}`,
        turnID: `${index}`,
        role: "user" as const,
        content: `${index}:${"x".repeat(2_400)}`,
      })),
      '{"status":"busy"}',
    )
    expect(result.length).toBeLessThanOrEqual(24_000)
    expect(result).not.toContain('"text":"0:')
    expect(result).toContain('"text":"19:')
    expect(result).toContain('<agent-session-context encoding="json-string">')
  })
})
