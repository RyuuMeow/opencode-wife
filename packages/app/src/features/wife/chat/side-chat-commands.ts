import type { Prompt } from "@/context/prompt"
import type { WifeChatMessage } from "./wife-chat-area"

export type SideChatCommand = "send" | "clear"
export type WifeHandoffDraftMode = "replace" | "append"

export function parseSideChatCommand(value: string): SideChatCommand | undefined {
  const command = value.trim()
  if (command === "/send") return "send"
  if (command === "/clear") return "clear"
  return undefined
}

export function hasWifeHandoffDraft(prompt: Prompt, contextItems: number) {
  if (contextItems > 0) return true
  return prompt.some((part) => part.type === "image" || ("content" in part && !!part.content.trim()))
}

export function applyWifeHandoffDraft(prompt: Prompt, summary: string, mode: WifeHandoffDraftMode): Prompt {
  const text = summary.trim()
  if (mode === "replace") {
    return [
      { type: "text", content: text, start: 0, end: text.length },
      ...prompt.filter((part) => part.type === "image"),
    ]
  }
  const separator = prompt.some((part) => "content" in part && !!part.content.trim()) ? "\n\n" : ""
  const content = `${separator}${text}`
  return [...prompt, { type: "text", content, start: 0, end: content.length }]
}

export function projectWifeHandoffTranscript(messages: WifeChatMessage[], agentContext: string | undefined) {
  const header = agentContext
    ? `<agent-session-context encoding="json-string">\n${JSON.stringify(agentContext)}\n</agent-session-context>`
    : "<agent-session-context unavailable=\"true\" />"
  const entries = messages.map((message) =>
    JSON.stringify({ role: message.role, text: message.content.slice(0, 2_400) }),
  )
  return entries.reduceRight<string[]>((result, entry) => {
    const used = header.length + result.reduce((total, item) => total + item.length + 1, 1)
    if (used + entry.length + 1 > 24_000) return result
    result.unshift(entry)
    return result
  }, []).reduce((result, entry) => `${result}\n${entry}`, header)
}
