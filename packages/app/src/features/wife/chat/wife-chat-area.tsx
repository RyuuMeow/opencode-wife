import { createEffect, createSignal, For, Show, untrack, type JSX } from "solid-js"
import { Markdown } from "@opencode-ai/session-ui/markdown"

export type WifeChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

const VISIBLE_LIMIT = 2
const EXIT_DURATION_MS = 300
const BUBBLE_BASE = "rounded-xl px-3 py-2 text-v2-text-text-base backdrop-blur-sm"
const BUBBLE_STYLE = { "--font-size-base": "15px" } as JSX.CSSProperties

export function WifeChatArea(props: {
  messages: () => WifeChatMessage[]
  avatarImage: () => string | undefined
  characterName: () => string | undefined
  expanded: boolean
  onExpandChange: (next: boolean) => void
  /** Forwards right-drags to the Live2D view so the model can be panned through this area. */
  onPanStart?: (event: PointerEvent) => void
}) {
  const [leavingIds, setLeavingIds] = createSignal<string[]>([])

  // When the history grows past the visible window, push the oldest visible
  // message into the leaving set so it animates upward before disappearing.
  // leavingIds is read untracked: removing a leaving entry after the exit
  // animation must not re-trigger this effect, or the same message would be
  // re-added (and re-animated) forever.
  createEffect(() => {
    const messages = props.messages()
    if (messages.length <= VISIBLE_LIMIT) return
    const overflow = messages[messages.length - VISIBLE_LIMIT - 1]
    if (!overflow || untrack(() => leavingIds().includes(overflow.id))) return
    setLeavingIds((ids) => [...ids, overflow.id])
    setTimeout(() => {
      setLeavingIds((ids) => ids.filter((id) => id !== overflow.id))
    }, EXIT_DURATION_MS)
  })

  const visible = () => {
    const messages = props.messages()
    const recent = messages.slice(-VISIBLE_LIMIT)
    const leaving = leavingIds()
      .map((id) => messages.find((message) => message.id === id))
      .filter((message): message is WifeChatMessage => !!message)
    return [...leaving, ...recent.filter((message) => !leavingIds().includes(message.id))]
  }

  const openHistory = (event: WheelEvent) => {
    if (props.messages().length === 0 || event.deltaY >= 0) return
    event.stopPropagation()
    props.onExpandChange(true)
  }

  return (
    <Show when={props.messages().length > 0}>
      <div
        class="pointer-events-auto h-[160px] select-text overflow-hidden"
        onWheel={openHistory}
        onPointerDown={(event) => {
          if (event.button !== 2) return
          event.stopPropagation()
          props.onPanStart?.(event)
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div class="flex h-full flex-col justify-end gap-1.5 px-3 pb-2">
          <For each={visible()}>
            {(message) => (
              <div
                classList={{
                  "animate-out fade-out duration-300": leavingIds().includes(message.id),
                  "animate-in fade-in slide-in-from-bottom-2 duration-300": !leavingIds().includes(message.id),
                }}
              >
                {message.role === "assistant" ? (
                  <div class="flex flex-col items-start">
                    <div class="flex items-center gap-2">
                      <Avatar image={props.avatarImage()} />
                      <span class="text-12-regular text-v2-text-text-muted">{props.characterName()}</span>
                    </div>
                    <div
                      class={`${BUBBLE_BASE} mt-1 max-w-[85%] bg-v2-background-bg-layer-02`}
                      style={BUBBLE_STYLE}
                    >
                      <Markdown text={message.content} />
                    </div>
                  </div>
                ) : (
                  <div class="flex flex-col items-end">
                    <div
                      class={`${BUBBLE_BASE} max-w-[85%] bg-v2-background-bg-layer-01`}
                      style={BUBBLE_STYLE}
                    >
                      <Markdown text={message.content} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </For>
        </div>
      </div>
    </Show>
  )
}

export function Avatar(props: { image: string | undefined }) {
  return (
    <Show when={props.image} fallback={<div class="size-7 rounded-full bg-v2-background-bg-layer-02" />}>
      {(image) => (
        <img src={image()} alt="" class="size-7 rounded-full bg-v2-background-bg-layer-01 object-cover" />
      )}
    </Show>
  )
}
