import { Show } from "solid-js"
import { Markdown } from "@opencode-ai/session-ui/markdown"
import type { WifeChatContrast, WifeChatTextSize } from "@/context/settings"
import { wifeChatBubbleStyle, type WifeChatMessage } from "./wife-chat-display"

export const WIFE_CHAT_BUBBLE_BASE = "rounded-xl px-3 py-2 text-v2-text-text-base"

export function WifeChatBubble(props: {
  message: WifeChatMessage
  avatarImage: string | undefined
  characterName: string | undefined
  showHeader: boolean
  textSize: WifeChatTextSize
  contrast: WifeChatContrast
}) {
  return (
    <div classList={{ "flex flex-col items-start": props.message.role === "assistant", "flex flex-col items-end": props.message.role === "user" }}>
      <Show when={props.showHeader}>
        <div class="flex items-center gap-2">
          <WifeChatAvatar image={props.avatarImage} />
          <span class="text-12-regular text-v2-text-text-muted">{props.characterName}</span>
        </div>
      </Show>
      <div
        class={`${WIFE_CHAT_BUBBLE_BASE} max-w-[85%]`}
        classList={{
          "mt-1": props.showHeader,
          "backdrop-blur-sm": props.contrast !== "strong",
        }}
        style={wifeChatBubbleStyle(props.message.role, props.textSize, props.contrast)}
      >
        <Markdown text={props.message.content} />
      </div>
    </div>
  )
}

export function WifeChatAvatar(props: { image: string | undefined }) {
  return (
    <Show when={props.image} fallback={<div class="size-7 rounded-full bg-v2-background-bg-layer-02" />}>
      {(image) => (
        <img src={image()} alt="" class="size-7 rounded-full bg-v2-background-bg-layer-01 object-cover" />
      )}
    </Show>
  )
}
