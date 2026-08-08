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
  active: boolean
  onError: (message: string) => void
}) {
  const [model, setModel] = createSignal<Live2DModel>()
  const [app, setApp] = createSignal<Application>()
  const [zoom, setZoom] = createSignal(1)
  const [offset, setOffset] = createSignal({ x: 0, y: 0 })
  const [ready, setReady] = createSignal(false)
  const [panning, setPanning] = createSignal<{ pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number }>()
  let container: HTMLDivElement | undefined

  const fit = () => {
    const loaded = model()
    if (!loaded || !container || container.clientWidth === 0 || container.clientHeight === 0) return
    // getLocalBounds is scale-independent; model.width/height would compound
    // the current zoom into the fit base and oscillate between two sizes.
    const bounds = loaded.getLocalBounds()
    if (bounds.width === 0 || bounds.height === 0) return
    const base =
      Math.min(container.clientWidth / bounds.width, container.clientHeight / bounds.height) * FIT_MARGIN
    loaded.scale.set(base * zoom())
    loaded.anchor.set(0.5, 0.5)
    loaded.position.set(container.clientWidth / 2 + offset().x, container.clientHeight / 2 + offset().y)
  }

  const resizeNow = () => {
    const next = app()
    if (!next || !container) return
    next.renderer.resize(container.clientWidth, container.clientHeight)
    fit()
  }

  const resetView = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    fit()
  }

  const onDblClick = (event: MouseEvent) => {
    const loaded = model()
    if (!loaded || !container) {
      resetView()
      return
    }
    // Keep clicks on the model free for future interactions; only empty
    // canvas space resets the view.
    const rect = container.getBoundingClientRect()
    const bounds = loaded.getBounds()
    if (bounds.contains(event.clientX - rect.left, event.clientY - rect.top)) return
    resetView()
  }

  onMount(() => {
    if (!container) return
    const next = new Application({
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      autoStart: false,
      resolution: window.devicePixelRatio || 1,
    })
    setApp(next)
    container.appendChild(next.view as HTMLCanvasElement)

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      setZoom((current) =>
        Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current * Math.exp(-normalizedDeltaY(event) * 0.001))),
      )
      fit()
    }
    container.addEventListener("wheel", onWheel, { passive: false })

    const observer = new ResizeObserver(resizeNow)
    observer.observe(container)

    void Live2DModel.from(props.modelUrl, { ticker: Ticker.shared })
      .then((loaded) => {
        setModel(loaded)
        next.stage.addChild(loaded)
        setReady(true)
        fit()
      })
      .catch((cause: unknown) => {
        props.onError(cause instanceof Error ? cause.message : String(cause))
      })

    onCleanup(() => {
      observer.disconnect()
      container.removeEventListener("wheel", onWheel)
      model()?.destroy()
      app()?.destroy(true, { children: true })
    })
  })

  createEffect(() => {
    const loaded = model()
    const intent = props.intent()
    if (!loaded) return
    applyIntent(loaded, intent, props.avatar())
  })

  // Keep-alive: the view stays mounted while the panel is closed (only
  // hidden), so toggling the panel never reloads the model. The render loop
  // only starts once the model is fully loaded (autoStart is off), so the
  // first drawn frame is always the complete model.
  createEffect(() => {
    const next = app()
    if (!next || !ready()) return
    if (props.active) {
      next.start()
      resizeNow()
    } else {
      next.stop()
    }
  })

  const startPan = (event: PointerEvent) => {
    if (event.button !== 2) return
    event.preventDefault()
    container?.setPointerCapture(event.pointerId)
    const current = offset()
    setPanning({ pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: current.x, offsetY: current.y })
  }

  const movePan = (event: PointerEvent) => {
    const pan = panning()
    if (!pan || event.pointerId !== pan.pointerId) return
    setOffset({ x: pan.offsetX + event.clientX - pan.startX, y: pan.offsetY + event.clientY - pan.startY })
    fit()
  }

  const endPan = (event: PointerEvent) => {
    const pan = panning()
    if (!pan || event.pointerId !== pan.pointerId) return
    setPanning(undefined)
  }

  return (
    <div
      ref={container}
      class="relative w-full h-full overflow-hidden"
      classList={{
        "cursor-grab": !!model() && !panning(),
        "cursor-grabbing": !!panning(),
      }}
      onPointerDown={startPan}
      onPointerMove={movePan}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onContextMenu={(event) => event.preventDefault()}
      onDblClick={onDblClick}
    />
  )
}
