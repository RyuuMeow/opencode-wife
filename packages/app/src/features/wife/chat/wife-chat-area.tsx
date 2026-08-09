import { batch, createEffect, createSignal, For, onCleanup, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { createResizeObserver } from "@solid-primitives/resize-observer"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import type { WifeChatContrast, WifeChatHeader, WifeChatMotion, WifeChatTextSize } from "@/context/settings"
import { wifeBubbleExpelled, wifeBubbleFitCount } from "./wife-chat-layout"
import {
  WifeChatAvatar,
  WifeChatBubble,
  WIFE_CHAT_BUBBLE_BASE,
} from "./wife-chat-bubble"
import {
  wifeChatBubbleStyle,
  wifeChatEntryDuration,
  wifeChatExitDuration,
  wifeChatGeometryKey,
  wifeChatHeaderVisible,
  type WifeChatMessage,
} from "./wife-chat-display"
import "./wife-chat-area.css"

export type { WifeChatMessage } from "./wife-chat-display"

export const HISTORY_WHEEL_DISTANCE = 240
const INITIAL_VISIBLE_COUNT = 10

type LeavingMessage = {
  message: WifeChatMessage
  top: number
  left: number
  width: number
  showHeader: boolean
  phase: "staged" | "leaving"
}

export function WifeChatArea(props: {
  messages: () => WifeChatMessage[]
  choices: () => string[]
  avatarImage: () => string | undefined
  characterName: () => string | undefined
  /** Ratio of the Live2D area used for bubbles and history-scroll detection. */
  heightRatio: () => number
  textSize: () => WifeChatTextSize
  contrast: () => WifeChatContrast
  motion: () => WifeChatMotion
  header: () => WifeChatHeader
  historyProgress: () => number
  onHistoryProgress: (next: number) => void
  onChoice: (choice: string) => void
  loading: () => boolean
  error: () => string | undefined
  loadingLabel: () => string
  errorLabel: () => string
  interactive: () => boolean
}) {
  const [enteringIds, setEnteringIds] = createSignal<string[]>([])
  const [visibleCount, setVisibleCount] = createSignal(INITIAL_VISIBLE_COUNT)
  const [measured, setMeasured] = createSignal(false)
  const [animation, setAnimation] = createStore<{ leaving: LeavingMessage[] }>({ leaving: [] })
  let root: HTMLDivElement | undefined
  let content: HTMLDivElement | undefined
  let messageList: HTMLDivElement | undefined
  let messageCount = 0
  let messageIds = new Set<string>()
  let geometry = wifeChatGeometryKey(props.heightRatio(), props.textSize(), props.header())
  let initialized = false
  let measureFrame: number | undefined
  const animationTimers = new Set<ReturnType<typeof setTimeout>>()
  const animationFrames = new Set<number>()

  const finishLeaving = (ids: string[]) => {
    const removed = new Set(ids)
    setAnimation("leaving", (items) => items.filter((item) => !removed.has(item.message.id)))
  }

  const evaluate = () => {
    const messages = props.messages()
    const list = content
    const bubbles = messageList
    if (!root || !list || !bubbles || root.clientHeight === 0) return
    if (messages.length === 0) {
      setMeasured(true)
      return
    }
    const count = visibleCount()
    const total = messages.length
    if (count > total) {
      setVisibleCount(total)
      return
    }
    const activeBubbles = Array.from(bubbles.children).filter(
      (item): item is HTMLElement => item instanceof HTMLElement && item.dataset.wifeChatMessage === "active",
    )
    const nextCount = wifeBubbleFitCount({
      messageHeights: activeBubbles.map((item) => item.getBoundingClientRect().height),
      reservedHeight: Math.max(0, list.getBoundingClientRect().height - bubbles.getBoundingClientRect().height),
      containerHeight: root.clientHeight,
      heightRatio: props.heightRatio(),
      gap: 12,
    })
    if (!initialized) {
      initialized = true
      setVisibleCount(Math.min(count, nextCount))
      measureFrame = requestAnimationFrame(() => setMeasured(true))
      return
    }
    if (count <= 1 || nextCount >= count) return
    const leaving = new Set(animation.leaving.map((item) => item.message.id))
    const expelled = wifeBubbleExpelled(messages, count, nextCount).filter((message) => !leaving.has(message.id))
    if (expelled.length === 0) return
    const rootRect = root.getBoundingClientRect()
    const nodes = new Map(
      activeBubbles.flatMap((item) => (item.dataset.messageId ? [[item.dataset.messageId, item] as const] : [])),
    )
    const staged = expelled.flatMap((message) => {
      const node = nodes.get(message.id)
      if (!node) return []
      const rect = node.getBoundingClientRect()
      return [
        {
          message,
          top: rect.top - rootRect.top,
          left: rect.left - rootRect.left,
          width: rect.width,
          showHeader: node.dataset.showHeader === "true",
          phase: "staged" as const,
        },
      ]
    })
    batch(() => {
      const expelledIds = new Set(expelled.map((message) => message.id))
      setEnteringIds((ids) => ids.filter((id) => !expelledIds.has(id)))
      setAnimation("leaving", (items) => [...items, ...staged])
      setVisibleCount(nextCount)
    })
    const ids = staged.map((item) => item.message.id)
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const duration = wifeChatExitDuration(props.motion(), reduced)
    if (duration === 0) {
      queueMicrotask(() => finishLeaving(ids))
      return
    }
    const frame = requestAnimationFrame(() => {
      animationFrames.delete(frame)
      const stagedIds = new Set(ids)
      setAnimation("leaving", (items) =>
        items.map((item) => (stagedIds.has(item.message.id) ? { ...item, phase: "leaving" } : item)),
      )
      const timer = setTimeout(() => {
        animationTimers.delete(timer)
        finishLeaving(ids)
      }, duration + 100)
      animationTimers.add(timer)
    })
    animationFrames.add(frame)
  }

  // New messages become visible candidates before height evaluation. Changing
  // the ratio restores the full candidate set so a larger ratio reveals more
  // history instead of remaining stuck at the previous visible count.
  createEffect(() => {
    const messages = props.messages()
    const total = messages.length
    const ratio = props.heightRatio()
    const nextGeometry = wifeChatGeometryKey(ratio, props.textSize(), props.header())
    const added = Math.max(0, total - messageCount)
    const nextIds = new Set(messages.map((message) => message.id))
    const entering = messages.filter((message) => !messageIds.has(message.id)).map((message) => message.id)
    if (!initialized && total > 0) setMeasured(false)
    if (messageCount > 0 && entering.length > 0) {
      const duration = wifeChatEntryDuration(
        props.motion(),
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      )
      if (duration > 0) {
        setEnteringIds((ids) => [...ids.filter((id) => nextIds.has(id)), ...entering])
        entering.forEach((id) => {
          const timer = setTimeout(() => {
            animationTimers.delete(timer)
            setEnteringIds((ids) => ids.filter((candidate) => candidate !== id))
          }, duration)
          animationTimers.add(timer)
        })
      }
    }
    if (nextGeometry !== geometry) setVisibleCount(total)
    if (nextGeometry === geometry && added > 0) {
      setVisibleCount((count) => Math.min(total, count + added))
    }
    messageCount = total
    messageIds = nextIds
    geometry = nextGeometry
  })

  createEffect(() => {
    props.messages()
    props.choices()
    props.loading()
    props.error()
    props.heightRatio()
    props.textSize()
    props.contrast()
    props.motion()
    props.header()
    visibleCount()
    queueMicrotask(evaluate)
  })

  createResizeObserver(() => {
    props.messages()
    return root
  }, evaluate)
  createResizeObserver(() => {
    props.messages()
    props.choices()
    props.loading()
    props.error()
    return content
  }, evaluate)
  onCleanup(() => {
    animationTimers.forEach(clearTimeout)
    animationFrames.forEach(cancelAnimationFrame)
    if (measureFrame !== undefined) cancelAnimationFrame(measureFrame)
  })

  const visible = () => {
    const messages = props.messages()
    return messages.slice(-Math.min(visibleCount(), messages.length))
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
    <Show when={props.messages().length > 0 || props.loading() || props.error()}>
      <div
        ref={root}
        class="wife-chat-live absolute inset-0 select-text overflow-hidden"
        classList={{
          "pointer-events-auto": props.interactive(),
          "pointer-events-none": !props.interactive(),
        }}
        style={{ opacity: 1 - props.historyProgress() }}
        onWheel={openHistory}
        aria-busy={props.loading()}
        data-wife-chat-motion={props.motion()}
      >
        <div
          ref={content}
          class="wife-chat-content absolute inset-x-0 bottom-0 flex flex-col px-3"
          style={{ opacity: measured() ? 1 : 0 }}
        >
          <div ref={messageList} class="flex flex-col gap-3">
            <For each={visible()}>
              {(message, index) => (
                <div
                  data-wife-chat-message="active"
                  data-message-id={message.id}
                  data-show-header={wifeChatHeaderVisible(visible(), index(), props.header())}
                  classList={{
                    "wife-chat-message-entering": enteringIds().includes(message.id),
                  }}
                >
                  <WifeChatBubble
                    message={message}
                    avatarImage={props.avatarImage()}
                    characterName={props.characterName()}
                    showHeader={wifeChatHeaderVisible(visible(), index(), props.header())}
                    textSize={props.textSize()}
                    contrast={props.contrast()}
                  />
                </div>
              )}
            </For>
          </div>
          <Show when={props.loading() || props.error()}>
            <div class="mt-3 flex flex-col items-start" aria-live="polite">
              <Show when={props.header() !== "hidden"}>
                <div class="flex items-center gap-2">
                  <WifeChatAvatar image={props.avatarImage()} />
                  <span class="text-12-regular text-v2-text-text-muted">{props.characterName()}</span>
                </div>
              </Show>
              <div
                class={`${WIFE_CHAT_BUBBLE_BASE} flex min-h-9 max-w-[85%] items-center`}
                classList={{ "mt-1": props.header() !== "hidden", "backdrop-blur-sm": props.contrast() !== "strong" }}
                style={wifeChatBubbleStyle("assistant", props.textSize(), props.contrast())}
                role={props.error() ? "alert" : "status"}
              >
                <Show
                  when={!props.error()}
                  fallback={
                    <span class="text-13-regular text-v2-state-fg-danger">{props.error() ?? props.errorLabel()}</span>
                  }
                >
                  <span class="flex h-4 w-10 items-center justify-center gap-1 text-v2-icon-icon-muted" aria-hidden="true">
                    <span class="wife-thinking-dot size-1 rounded-full bg-current" />
                    <span class="wife-thinking-dot size-1 rounded-full bg-current" />
                    <span class="wife-thinking-dot size-1 rounded-full bg-current" />
                  </span>
                  <span class="sr-only">{props.loadingLabel()}</span>
                </Show>
              </div>
            </div>
          </Show>
          <div
            class="wife-chat-choices grid"
            classList={{
              "mt-3 grid-rows-[1fr] opacity-100": props.choices().length > 0,
              "pointer-events-none mt-0 grid-rows-[0fr] opacity-0": props.choices().length === 0,
            }}
            aria-hidden={props.choices().length === 0}
          >
            <div class="min-h-0 overflow-hidden">
              <div class="flex flex-col gap-1.5">
                <For each={props.choices()}>
                  {(choice) => (
                    <ButtonV2
                      type="button"
                      size="large"
                      variant="neutral"
                      class="w-full justify-start text-start"
                      style={{ "background-color": "var(--v2-background-bg-layer-01)" }}
                      onClick={() => props.onChoice(choice)}
                    >
                      {choice}
                    </ButtonV2>
                  )}
                </For>
              </div>
            </div>
          </div>
        </div>
        <div class="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
          <For each={animation.leaving}>
            {(item) => (
              <div
                class="wife-chat-message-leaving absolute"
                classList={{ "wife-chat-message-leaving-active": item.phase === "leaving" }}
                style={{ top: `${item.top}px`, left: `${item.left}px`, width: `${item.width}px` }}
                onTransitionEnd={(event) => {
                  if (event.currentTarget !== event.target || event.propertyName !== "opacity") return
                  finishLeaving([item.message.id])
                }}
              >
                <WifeChatBubble
                  message={item.message}
                  avatarImage={props.avatarImage()}
                  characterName={props.characterName()}
                  showHeader={item.showHeader}
                  textSize={props.textSize()}
                  contrast={props.contrast()}
                />
              </div>
            )}
          </For>
        </div>
      </div>
    </Show>
  )
}
