import type { WifeChatContrast, WifeChatHeader, WifeChatMotion, WifeChatTextSize } from "@/context/settings"

export type WifeChatMessage = {
  id: string
  turnID: string
  role: "user" | "assistant"
  content: string
}

export function wifeChatHeaderVisible(messages: WifeChatMessage[], index: number, mode: WifeChatHeader) {
  const message = messages[index]
  if (message?.role !== "assistant" || mode === "hidden") return false
  if (mode === "every") return true
  const previous = messages[index - 1]
  return previous?.role !== "assistant" || previous.turnID !== message.turnID
}

export function wifeChatExitDuration(motion: WifeChatMotion, reduced: boolean) {
  if (reduced || motion === "off") return 0
  return motion === "subtle" ? 150 : 280
}

export function wifeChatEntryDuration(motion: WifeChatMotion, reduced: boolean) {
  if (reduced || motion === "off") return 0
  return motion === "subtle" ? 150 : 300
}

export function wifeChatGeometryKey(heightRatio: number, textSize: WifeChatTextSize, header: WifeChatHeader) {
  return `${heightRatio}:${textSize}:${header}`
}

export function wifeChatBubbleStyle(
  role: WifeChatMessage["role"],
  size: WifeChatTextSize,
  contrast: WifeChatContrast,
) {
  const layer =
    role === "user" ? "var(--v2-background-bg-layer-01)" : "var(--v2-background-bg-layer-02)"
  const background =
    contrast === "soft"
      ? `color-mix(in srgb, ${layer} 65%, transparent)`
      : contrast === "strong"
        ? `color-mix(in srgb, ${layer} 82%, var(--v2-background-bg-base))`
        : layer
  return {
    "--font-size-base": size === "small" ? "13px" : size === "large" ? "17px" : "15px",
    "background-color": background,
  }
}
