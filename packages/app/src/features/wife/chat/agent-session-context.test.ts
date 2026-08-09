import type { Message, Part } from "@opencode-ai/sdk/v2/client"
import { describe, expect, test } from "bun:test"
import {
  AGENT_CONTEXT_CHARACTER_LIMIT,
  type AgentSessionMessage,
  projectAgentSessionContext,
} from "./agent-session-context"

describe("projectAgentSessionContext", () => {
  test("orders visible text and summarizes tools and patches without raw data", () => {
    const snapshot = projectAgentSessionContext({
      title: "Side chat work",
      busy: true,
      messages: [
        message("assistant", 2, [
          text("visible answer"),
          {
            id: "reasoning",
            sessionID: "main",
            messageID: "assistant-2",
            type: "reasoning",
            text: "private chain",
            time: { start: 1 },
          },
          {
            id: "tool",
            sessionID: "main",
            messageID: "assistant-2",
            type: "tool",
            callID: "call",
            tool: "read",
            state: {
              status: "completed",
              input: { path: "secret input" },
              output: "very large raw output",
              title: "Read controller",
              metadata: {},
              time: { start: 1, end: 2 },
            },
          },
          {
            id: "patch",
            sessionID: "main",
            messageID: "assistant-2",
            type: "patch",
            hash: "hash",
            files: ["src/a.ts", "src/b.ts"],
          },
        ]),
        message("user", 1, [text("first question"), text("synthetic", { synthetic: true })]),
      ],
    })

    expect(snapshot.split("\n").map((line) => JSON.parse(line))).toEqual([
      { title: "Side chat work", status: "busy" },
      { type: "message", role: "user", text: "first question" },
      { type: "message", role: "assistant", text: "visible answer" },
      { type: "tool", name: "read", status: "completed", title: "Read controller" },
      { type: "patch", files: ["src/a.ts", "src/b.ts"] },
    ])
    expect(snapshot).not.toContain("private chain")
    expect(snapshot).not.toContain("secret input")
    expect(snapshot).not.toContain("raw output")
    expect(snapshot).not.toContain("synthetic")
  })

  test("keeps newest entries when the character budget is exceeded", () => {
    const snapshot = projectAgentSessionContext({
      title: undefined,
      busy: false,
      messages: Array.from({ length: 10 }, (_, index) =>
        message("user", index, [text(`${index}:${"x".repeat(2_500)}`)]),
      ),
    })

    expect(snapshot.length).toBeLessThanOrEqual(AGENT_CONTEXT_CHARACTER_LIMIT)
    expect(snapshot).not.toContain('"text":"0:')
    expect(snapshot).toContain('"text":"9:')
    expect(snapshot).toContain('"status":"idle"')
  })

  test("includes short tool errors but excludes their input", () => {
    const snapshot = projectAgentSessionContext({
      title: "Failure",
      busy: false,
      messages: [
        message("assistant", 1, [
          {
            id: "tool-error",
            sessionID: "main",
            messageID: "assistant-1",
            type: "tool",
            callID: "call-error",
            tool: "grep",
            state: {
              status: "error",
              input: { pattern: "private" },
              error: "File was not found",
              time: { start: 1, end: 2 },
            },
          },
        ]),
      ],
    })

    expect(snapshot).toContain('"error":"File was not found"')
    expect(snapshot).not.toContain("private")
  })
})

function message(role: "user" | "assistant", created: number, parts: Part[]): AgentSessionMessage {
  const info: Message =
    role === "user"
      ? {
          id: `${role}-${created}`,
          sessionID: "main",
          role,
          time: { created },
          agent: "build",
          model: { providerID: "provider", modelID: "model" },
        }
      : {
          id: `${role}-${created}`,
          sessionID: "main",
          role,
          time: { created },
          parentID: `user-${created}`,
          modelID: "model",
          providerID: "provider",
          mode: "build",
          agent: "build",
          path: { cwd: "C:/workspace", root: "C:/workspace" },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        }
  return {
    info,
    parts,
  }
}

function text(value: string, options?: { synthetic?: boolean; ignored?: boolean }) {
  return {
    id: crypto.randomUUID(),
    sessionID: "main",
    messageID: "message",
    type: "text" as const,
    text: value,
    ...options,
  }
}
