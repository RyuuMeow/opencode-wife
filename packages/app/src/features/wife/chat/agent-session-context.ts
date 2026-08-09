import type { Message, Part } from "@opencode-ai/sdk/v2/client"

export const AGENT_CONTEXT_MESSAGE_LIMIT = 80
export const AGENT_CONTEXT_CHARACTER_LIMIT = 12_000

export type AgentSessionMessage = {
  info: Message
  parts: Part[]
}

export function projectAgentSessionContext(input: {
  title: string | undefined
  busy: boolean
  messages: AgentSessionMessage[]
}) {
  const header = JSON.stringify({
    title: input.title?.trim() || "Untitled session",
    status: input.busy ? "busy" : "idle",
  })
  const entries = input.messages
    .slice(-AGENT_CONTEXT_MESSAGE_LIMIT)
    .sort((a, b) => a.info.time.created - b.info.time.created || a.info.id.localeCompare(b.info.id))
    .flatMap(projectMessage)
  const selected = entries.reduceRight<string[]>((result, entry) => {
    const used = header.length + result.reduce((total, item) => total + item.length + 1, 1)
    if (used + entry.length + 1 > AGENT_CONTEXT_CHARACTER_LIMIT) return result
    result.unshift(entry)
    return result
  }, [])
  return [header, ...selected].join("\n").slice(0, AGENT_CONTEXT_CHARACTER_LIMIT)
}

function projectMessage(message: AgentSessionMessage) {
  const text = message.parts
    .flatMap((part) => (part.type === "text" && !part.synthetic && !part.ignored ? [part.text.trim()] : []))
    .filter(Boolean)
    .join("\n")
  const content = text ? [JSON.stringify({ type: "message", role: message.info.role, text: truncate(text, 2_400) })] : []
  return message.parts.reduce((result, part) => {
    if (part.type === "tool") {
      const title = "title" in part.state && part.state.title ? truncate(part.state.title, 300) : undefined
      const error = part.state.status === "error" ? truncate(part.state.error, 500) : undefined
      result.push(
        JSON.stringify({
          type: "tool",
          name: part.tool,
          status: part.state.status,
          ...(title ? { title } : {}),
          ...(error ? { error } : {}),
        }),
      )
    }
    if (part.type === "patch" && part.files.length > 0) {
      result.push(JSON.stringify({ type: "patch", files: part.files.slice(0, 40) }))
    }
    return result
  }, content)
}

function truncate(value: string, limit: number) {
  if (value.length <= limit) return value
  return `${value.slice(0, limit - 1)}…`
}
