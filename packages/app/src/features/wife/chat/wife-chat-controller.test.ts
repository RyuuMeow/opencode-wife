import type { Session } from "@opencode-ai/sdk/v2/client"
import { describe, expect, test } from "bun:test"
import {
  createWifeReplyGate,
  isWifeSession,
  normalizeWifeReply,
  normalizeWifeReplyText,
  projectWifeHistory,
  requiresWifeSessionRebuild,
  wifeBubbleReadingDelay,
  wifeBubbleRevealDelays,
  wifeChatError,
  wifePromptFormat,
  WIFE_READ_ONLY_PERMISSION,
  WIFE_REPLY_SCHEMA,
} from "./wife-chat-controller"
import {
  isWifeAssistantMetadata,
  WIFE_METADATA_VERSION,
  WIFE_METADATA_VERSION_VALUE,
} from "./wife-chat-metadata"

describe("normalizeWifeReply", () => {
  test("normalizes short messages and unique choices", () => {
    expect(
      normalizeWifeReply({
        messages: ["你好。再說一點！", " 沒問題。 "],
        choices: ["繼續", "繼續", "先停一下"],
      }),
    ).toEqual({
      messages: ["你好。", "再說一點！", "沒問題。"],
      choices: ["繼續", "先停一下"],
    })
  })

  test("keeps every message needed to complete a reply", () => {
    const messages = Array.from({ length: 8 }, (_, index) => `第 ${index + 1} 句。`)
    expect(normalizeWifeReply({ messages, choices: [] })?.messages).toEqual(messages)
    expect(normalizeWifeReplyText(messages.join(""))?.messages).toEqual(messages)
  })

  test("rejects malformed structured output", () => {
    expect(normalizeWifeReply(undefined)).toBeUndefined()
    expect(normalizeWifeReply({ messages: [], choices: [] })).toBeUndefined()
    expect(normalizeWifeReply({ messages: ["ok"], choices: [1] })).toBeUndefined()
    expect(normalizeWifeReply({ messages: ["ok"], choices: ["1", "2", "3", "4"] })).toBeUndefined()
  })

  test("normalizes plain and fenced JSON text fallback", () => {
    expect(normalizeWifeReplyText('{"messages":["你好。"],"choices":["繼續"]}')).toEqual({
      messages: ["你好。"],
      choices: ["繼續"],
    })
    expect(normalizeWifeReplyText('```json\n{"messages":["嗨！"],"choices":[]}\n```')).toEqual({
      messages: ["嗨！"],
      choices: [],
    })
    expect(normalizeWifeReplyText("你好呀！今天想聊什麼？")).toEqual({
      messages: ["你好呀！", "今天想聊什麼？"],
      choices: [],
    })
    expect(normalizeWifeReplyText('{"messages":')).toBeUndefined()
  })
})

describe("wife bubble pacing", () => {
  test("uses message length and language-aware reading units", () => {
    expect(wifeBubbleReadingDelay("好。")).toBe(850)
    expect(wifeBubbleReadingDelay("這是一段需要花比較久時間閱讀的訊息。"))
      .toBeGreaterThan(wifeBubbleReadingDelay("好。"))
    expect(wifeBubbleReadingDelay("This sentence takes a little longer to read."))
      .toBeGreaterThan(wifeBubbleReadingDelay("Okay."))
  })

  test("reveals each bubble after the previous bubble's reading delay", () => {
    const messages = ["好。", "這一句比較長，需要多一點閱讀時間。", "完成。"]
    expect(wifeBubbleRevealDelays(messages)).toEqual([
      650,
      650 + wifeBubbleReadingDelay(messages[0]),
      650 + wifeBubbleReadingDelay(messages[0]) + wifeBubbleReadingDelay(messages[1]),
    ])
  })
})

describe("wife session identity", () => {
  test("requires matching metadata and an effective read-only ruleset", () => {
    const value = session()
    expect(isWifeSession(value, "main-session")).toBe(true)
    expect(
      isWifeSession(
        {
          ...value,
          permission: [
            { permission: "bash", action: "allow", pattern: "*" },
            ...WIFE_READ_ONLY_PERMISSION,
          ],
        },
        "main-session",
      ),
    ).toBe(true)
    expect(isWifeSession({ ...value, metadata: { ...value.metadata, "wife.ownerSessionID": "other" } }, "main-session"))
      .toBe(false)
    expect(isWifeSession({ ...value, permission: value.permission?.slice(1) }, "main-session")).toBe(false)
    expect(
      isWifeSession(
        {
          ...value,
          permission: [...WIFE_READ_ONLY_PERMISSION, { permission: "bash", action: "allow", pattern: "*" }],
        },
        "main-session",
      ),
    ).toBe(false)
    expect(
      isWifeSession(
        { ...value, metadata: { ...value.metadata, [WIFE_METADATA_VERSION]: "1" } },
        "main-session",
      ),
    ).toBe(false)
    expect(
      requiresWifeSessionRebuild(
        { ...value, metadata: { ...value.metadata, [WIFE_METADATA_VERSION]: "1" } },
        "main-session",
      ),
    ).toBe(true)
    expect(
      requiresWifeSessionRebuild(
        { ...value, metadata: { ...value.metadata, "wife.kind": "other", [WIFE_METADATA_VERSION]: "1" } },
        "main-session",
      ),
    ).toBe(false)
  })

  test("recognizes Wife metadata for notification isolation", () => {
    expect(isWifeAssistantMetadata({ "wife.kind": "assistant", "wife.ownerSessionID": "main" })).toBe(true)
    expect(isWifeAssistantMetadata({ "wife.kind": "other" })).toBe(false)
    expect(isWifeAssistantMetadata(undefined)).toBe(false)
  })
})

describe("wife prompt compatibility", () => {
  test("uses text JSON fallback when thinking rejects forced tool choice", () => {
    expect(wifePromptFormat({ id: "deepseek-v4-flash-free", provider: { id: "opencode" } })).toBeUndefined()
    expect(wifePromptFormat({ id: "deepseek-v4-flash", provider: { id: "opencode-go" } })).toBeUndefined()
    expect(wifePromptFormat({ id: "gpt-5", provider: { id: "openai" } })).toEqual({
      type: "json_schema",
      schema: WIFE_REPLY_SCHEMA,
    })
  })

  test("extracts readable SDK and provider errors", () => {
    expect(wifeChatError({ data: { message: "Provider failed" } })).toBe("Provider failed")
    expect(wifeChatError({ error: { data: { message: "Nested failure" } } })).toBe("Nested failure")
    expect(wifeChatError({ reason: "unknown" })).toBeUndefined()
  })
})

describe("projectWifeHistory", () => {
  test("projects structured assistant messages and keeps only current choices", () => {
    expect(
      projectWifeHistory([
        { info: { id: "user-1", role: "user" }, parts: [{ type: "text", text: "你好" }] },
        {
          info: {
            id: "assistant-1",
            role: "assistant",
            structured: { messages: ["嗨。", "想聊什麼？"], choices: ["專案", "休息"] },
          },
          parts: [],
        },
      ]),
    ).toEqual({
      messages: [
        { id: "user-1", role: "user", content: "你好" },
        { id: "assistant-1:0", role: "assistant", content: "嗨。" },
        { id: "assistant-1:1", role: "assistant", content: "想聊什麼？" },
      ],
      choices: ["專案", "休息"],
    })
  })

  test("falls back to real assistant text and clears stale choices after a user turn", () => {
    expect(
      projectWifeHistory([
        {
          info: { id: "assistant-1", role: "assistant" },
          parts: [{ type: "text", text: "第一句。第二句。" }],
        },
        { info: { id: "user-2", role: "user" }, parts: [{ type: "text", text: "繼續" }] },
      ]),
    ).toEqual({
      messages: [
        { id: "assistant-1:0", role: "assistant", content: "第一句。" },
        { id: "assistant-1:1", role: "assistant", content: "第二句。" },
        { id: "user-2", role: "user", content: "繼續" },
      ],
      choices: [],
    })
  })

  test("restores messages and choices from text JSON fallback", () => {
    expect(
      projectWifeHistory([
        {
          info: { id: "assistant-1", role: "assistant" },
          parts: [{ type: "text", text: '{"messages":["第一句。","第二句。"],"choices":["繼續"]}' }],
        },
      ]),
    ).toEqual({
      messages: [
        { id: "assistant-1:0", role: "assistant", content: "第一句。" },
        { id: "assistant-1:1", role: "assistant", content: "第二句。" },
      ],
      choices: ["繼續"],
    })
  })
})

describe("wife reply generation gate", () => {
  test("invalidates late replies per session without affecting another session", () => {
    const gate = createWifeReplyGate()
    const first = gate.next("session-a")
    const other = gate.next("session-b")
    expect(gate.active("session-a", first)).toBe(true)
    gate.next("session-a")
    expect(gate.active("session-a", first)).toBe(false)
    expect(gate.active("session-b", other)).toBe(true)
  })

  test("invalidates every reply after disposal", () => {
    const gate = createWifeReplyGate()
    const generation = gate.next("session-a")
    gate.dispose()
    expect(gate.active("session-a", generation)).toBe(false)
  })
})

function session(input: Partial<Session> = {}) {
  return {
    id: "wife-session",
    slug: "wife-session",
    projectID: "project",
    directory: "C:/workspace",
    title: "Wife",
    version: "1",
    metadata: {
      "wife.kind": "assistant",
      "wife.ownerSessionID": "main-session",
      [WIFE_METADATA_VERSION]: WIFE_METADATA_VERSION_VALUE,
    },
    permission: WIFE_READ_ONLY_PERMISSION.map((rule) => ({ ...rule })),
    time: { created: 1, updated: 1, archived: 1 },
    ...input,
  } satisfies Session
}
