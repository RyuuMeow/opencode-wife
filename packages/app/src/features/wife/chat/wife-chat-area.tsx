import { createEffect, createSignal, For, onCleanup, Show, type JSX } from "solid-js"
import { createResizeObserver } from "@solid-primitives/resize-observer"
import { Markdown } from "@opencode-ai/session-ui/markdown"

export type WifeChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

const EXIT_DURATION_MS = 300
export const HISTORY_WHEEL_DISTANCE = 240
const INITIAL_VISIBLE_COUNT = 10
const BUBBLE_BASE = "rounded-xl px-3 py-2 text-v2-text-text-base backdrop-blur-sm"
const BUBBLE_STYLE = { "--font-size-base": "15px" } as JSX.CSSProperties

export function WifeChatArea(props: {
  messages: () => WifeChatMessage[]
  avatarImage: () => string | undefined
  characterName: () => string | undefined
  /** Ratio of the container height that bubbles may fill before the oldest fades out. */
  heightRatio: () => number
  historyProgress: () => number
  onHistoryProgress: (next: number) => void
  /** Forwards right-drags to the Live2D view so the model can be panned through this area. */
  onPanStart?: (event: PointerEvent) => void
}) {
  const [leavingIds, setLeavingIds] = createSignal<string[]>([])
  const [visibleCount, setVisibleCount] = createSignal(INITIAL_VISIBLE_COUNT)
  let root: HTMLDivElement | undefined
  let content: HTMLDivElement | undefined
  let messageCount = 0
  let heightRatio = props.heightRatio()
  const exitTimers = new Set<ReturnType<typeof setTimeout>>()

  const evaluate = () => {
    const messages = props.messages()
    const list = content
    if (messages.length === 0 || !root || !list) return
    if (leavingIds().length > 0) return
    const threshold = props.heightRatio() * root.clientHeight
    const count = visibleCount()
    const total = messages.length
    if (count > total) {
      setVisibleCount(total)
      return
    }
    if (list.getBoundingClientRect().height <= threshold || count <= 1) return
    const expelled = messages[total - count]
    if (!expelled || leavingIds().includes(expelled.id)) return
    setLeavingIds((ids) => [...ids, expelled.id])
    const timer = setTimeout(() => {
      exitTimers.delete(timer)
      setLeavingIds((ids) => ids.filter((id) => id !== expelled.id))
    }, EXIT_DURATION_MS)
    exitTimers.add(timer)
    setVisibleCount(count - 1)
  }

  // New messages become visible candidates before height evaluation. Changing
  // the ratio restores the full candidate set so a larger ratio reveals more
  // history instead of remaining stuck at the previous visible count.
  createEffect(() => {
    const total = props.messages().length
    const ratio = props.heightRatio()
    const added = Math.max(0, total - messageCount)
    if (ratio !== heightRatio) setVisibleCount(total)
    if (ratio === heightRatio && added > 0) setVisibleCount((count) => Math.min(total, count + added))
    messageCount = total
    heightRatio = ratio
  })

  createEffect(() => {
    props.messages()
    props.heightRatio()
    leavingIds()
    visibleCount()
    queueMicrotask(evaluate)
  })

  createResizeObserver(() => {
    props.messages()
    return root
  }, evaluate)
  createResizeObserver(() => {
    props.messages()
    return content
  }, evaluate)
  onCleanup(() => exitTimers.forEach(clearTimeout))

  const visible = () => {
    const messages = props.messages()
    const recent = messages.slice(-Math.min(visibleCount(), messages.length))
    const recentIds = new Set(recent.map((message) => message.id))
    const leaving = leavingIds()
      .map((id) => messages.find((message) => message.id === id))
      .filter((message): message is WifeChatMessage => !!message && !recentIds.has(message.id))
    return [...leaving, ...recent]
  }

  const openHistory = (event: WheelEvent) => {
    if (props.messages().length === 0) return
    const progress = props.historyProgress()
    if (event.deltaY >= 0 && progress === 0) return
    event.preventDefault()
    event.stopPropagation()
    props.onHistoryProgress(Math.max(0, Math.min(1, progress - event.deltaY / HISTORY_WHEEL_DISTANCE)))
  }

  return (
    <Show when={props.messages().length > 0}>
      <div
        ref={root}
        class="pointer-events-auto absolute inset-0 select-text overflow-hidden transition-opacity duration-150 ease-out motion-reduce:transition-none"
        style={{ opacity: 1 - props.historyProgress() }}
        onWheel={openHistory}
        onPointerDown={(event) => {
          if (event.button !== 2) return
          event.stopPropagation()
          props.onPanStart?.(event)
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div ref={content} class="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-3 pb-3">
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
