import type { Session } from "@opencode-ai/sdk/v2/client"
import { describe, expect, test } from "bun:test"
import {
  createWifeReplyGate,
  isWifeSession,
  normalizeWifeReply,
  projectWifeHistory,
  WIFE_READ_ONLY_PERMISSION,
} from "./wife-chat-controller"
import { isWifeAssistantMetadata } from "./wife-chat-metadata"

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

  test("rejects malformed structured output", () => {
    expect(normalizeWifeReply(undefined)).toBeUndefined()
    expect(normalizeWifeReply({ messages: [], choices: [] })).toBeUndefined()
    expect(normalizeWifeReply({ messages: ["ok"], choices: [1] })).toBeUndefined()
    expect(normalizeWifeReply({ messages: ["ok"], choices: ["1", "2", "3", "4"] })).toBeUndefined()
  })
})

describe("wife session identity", () => {
  test("requires matching metadata and the exact read-only ruleset", () => {
    const value = session()
    expect(isWifeSession(value, "main-session")).toBe(true)
    expect(isWifeSession({ ...value, metadata: { ...value.metadata, "wife.ownerSessionID": "other" } }, "main-session"))
      .toBe(false)
    expect(isWifeSession({ ...value, permission: value.permission?.slice(1) }, "main-session")).toBe(false)
  })

  test("recognizes Wife metadata for notification isolation", () => {
    expect(isWifeAssistantMetadata({ "wife.kind": "assistant", "wife.ownerSessionID": "main" })).toBe(true)
    expect(isWifeAssistantMetadata({ "wife.kind": "other" })).toBe(false)
    expect(isWifeAssistantMetadata(undefined)).toBe(false)
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
    },
    permission: WIFE_READ_ONLY_PERMISSION.map((rule) => ({ ...rule })),
    time: { created: 1, updated: 1, archived: 1 },
    ...input,
  } satisfies Session
}
