import type {
  CharacterCapabilities,
  CharacterEmotion,
  CharacterGesture,
  CharacterState,
  EmotionBinding,
  GestureBinding,
  StateBinding,
} from "../schema/character"

export type SuggestedMappings = {
  states: Partial<Record<CharacterState, StateBinding>>
  gestures: Record<string, GestureBinding>
  emotions: Record<string, EmotionBinding>
}

const stateGroupPatterns: Partial<Record<CharacterState, RegExp>> = {
  idle: /idle|stand|loop/,
  thinking: /think/,
  working: /work|code|type/,
  listening: /listen|hear/,
  speaking: /speak|talk/,
  waiting_user: /wait|question|ask/,
  success: /success|done|finish|complete/,
  error: /error|fail|mistake/,
}

const gestureGroupPatterns: Partial<Record<CharacterGesture, RegExp>> = {
  nod: /nod|agree|yes/,
  shake_head: /shake|no|deny/,
  wave: /wave|greet|hello/,
  celebrate: /happy|celebrate|clap|cheer|jump/,
  look_at_user: /look|eye|attention/,
}

const emotionExpressionPatterns: Partial<Record<CharacterEmotion, RegExp>> = {
  happy: /smile|happy|laugh|joy/,
  focused: /serious|focus|concentrate/,
  concerned: /worried|concern|sad|sorrow/,
  confused: /confus|puzzl|question|surpris/,
  annoyed: /annoy|angry|angry|anger|mad/,
  embarrassed: /embarrass|shy|blush/,
}

function matchPattern(groups: string[], patterns: Record<string, RegExp>) {
  for (const [semantic, pattern] of Object.entries(patterns)) {
    const group = groups.find((name) => pattern.test(name.toLowerCase()))
    if (group !== undefined) return { semantic, group }
  }
  return undefined
}

function matchingGroups(capabilities: CharacterCapabilities) {
  return Object.keys(capabilities.motionGroups)
}

export function suggestMappings(capabilities: CharacterCapabilities): SuggestedMappings {
  const groups = matchingGroups(capabilities)
  const states: SuggestedMappings["states"] = {}
  for (const [state, pattern] of Object.entries(stateGroupPatterns) as [CharacterState, RegExp][]) {
    const group = groups.find((name) => pattern.test(name.toLowerCase()))
    if (group === undefined) continue
    states[state] = {
      motions: [{ group, index: 0 }],
      selection: "first",
      loop: state === "idle" || state === "working" || state === "listening",
    }
  }

  const gestures: SuggestedMappings["gestures"] = {}
  for (const [gesture, pattern] of Object.entries(gestureGroupPatterns) as [CharacterGesture, RegExp][]) {
    const group = groups.find((name) => pattern.test(name.toLowerCase()))
    if (group === undefined) continue
    gestures[gesture] = { motions: [{ group, index: 0 }], selection: "first", interruptible: true }
  }

  const emotions: SuggestedMappings["emotions"] = {}
  for (const [emotion, pattern] of Object.entries(emotionExpressionPatterns) as [CharacterEmotion, RegExp][]) {
    const expression = capabilities.expressions.find((entry) => pattern.test(entry.id.toLowerCase()))
    if (expression === undefined) continue
    emotions[emotion] = { expression: expression.id }
  }

  return { states, gestures, emotions }
}

export function suggestStateFallback(state: CharacterState, states: SuggestedMappings["states"]) {
  const fallbacks: Partial<Record<CharacterState, CharacterState>> = {
    listening: "idle",
    thinking: "idle",
    speaking: "idle",
    waiting_user: "idle",
    working: "idle",
    success: "idle",
    error: "idle",
  }
  if (states[state]?.motions?.length) return undefined
  return fallbacks[state]
}

export function suggestionCount(mappings: SuggestedMappings) {
  return (
    Object.keys(mappings.states).length +
    Object.keys(mappings.gestures).length +
    Object.keys(mappings.emotions).length
  )
}
