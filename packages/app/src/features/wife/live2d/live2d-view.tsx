import { createEffect, createSignal, onCleanup, onMount } from "solid-js"
import { Application, Ticker } from "pixi.js"
import { Live2DModel, MotionPriority } from "pixi-live2d-display-lipsyncpatch/cubism4"
import type {
  AvatarProfile,
  CharacterEmotion,
  CharacterGesture,
  CharacterState,
} from "@opencode-ai/wife-core"

export type PresentationIntent = {
  state: CharacterState
  gesture?: CharacterGesture
  emotion: CharacterEmotion
}

const FIT_MARGIN = 0.92
const MIN_ZOOM = 0.2
const MAX_ZOOM = 3

function normalizedDeltaY(event: WheelEvent) {
  if (event.deltaMode === 1) return event.deltaY * 16
  if (event.deltaMode === 2) return event.deltaY * 100
  return event.deltaY
}

function applyIntent(model: Live2DModel, intent: PresentationIntent, avatar: AvatarProfile) {
  const state = avatar.states[intent.state]
  const stateMotion = state?.motions?.[0]
  if (stateMotion) void model.motion(stateMotion.group, stateMotion.index, MotionPriority.NORMAL)

  const gesture = intent.gesture ? avatar.gestures[intent.gesture] : undefined
  const gestureMotion = gesture?.motions?.[0]
  if (gestureMotion) {
    void model.motion(gestureMotion.group, gestureMotion.index, MotionPriority.FORCE, {
      onFinish: () => {
        if (stateMotion) void model.motion(stateMotion.group, stateMotion.index, MotionPriority.NORMAL)
      },
    })
  }

  const emotion = intent.emotion ? avatar.emotions[intent.emotion] : undefined
  const expression = emotion?.expression
  if (expression) void model.expression(expression)
}

export function Live2DView(props: {
  modelUrl: string
  avatar: () => AvatarProfile
  intent: () => PresentationIntent
  onError: (message: string) => void
}) {
  const [model, setModel] = createSignal<Live2DModel>()
  const [zoom, setZoom] = createSignal(1)
  let container: HTMLDivElement | undefined

  onMount(() => {
    if (!container) return
    const app = new Application({
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    })
    container.appendChild(app.view as HTMLCanvasElement)

    const fit = () => {
      const loaded = model()
      if (!loaded || container.clientWidth === 0 || container.clientHeight === 0) return
      // getLocalBounds is scale-independent; model.width/height would compound
      // the current zoom into the fit base and oscillate between two sizes.
      const bounds = loaded.getLocalBounds()
      if (bounds.width === 0 || bounds.height === 0) return
      const base =
        Math.min(container.clientWidth / bounds.width, container.clientHeight / bounds.height) * FIT_MARGIN
      const scale = base * zoom()
      loaded.scale.set(scale)
      loaded.anchor.set(0.5, 0.5)
      loaded.position.set(container.clientWidth / 2, container.clientHeight / 2)
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      setZoom((current) =>
        Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current * Math.exp(-normalizedDeltaY(event) * 0.001))),
      )
      fit()
    }
    container.addEventListener("wheel", onWheel, { passive: false })

    const resize = () => {
      app.renderer.resize(container.clientWidth, container.clientHeight)
      fit()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)

    void Live2DModel.from(props.modelUrl, { ticker: Ticker.shared })
      .then((loaded) => {
        setModel(loaded)
        app.stage.addChild(loaded)
        fit()
      })
      .catch((cause: unknown) => {
        props.onError(cause instanceof Error ? cause.message : String(cause))
      })

    onCleanup(() => {
      observer.disconnect()
      container.removeEventListener("wheel", onWheel)
      model()?.destroy()
      app.destroy(true, { children: true })
    })
  })

  createEffect(() => {
    const loaded = model()
    const intent = props.intent()
    if (!loaded) return
    applyIntent(loaded, intent, props.avatar())
  })

  return <div ref={container} class="relative w-full h-full overflow-hidden" />
}
