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
  idle: /idle|stand|loop|待机|待機|闲置|閒置|站立/,
  thinking: /think|思考|思索/,
  working: /work|code|type|工作/,
  listening: /listen|hear|聆听|傾聽/,
  speaking: /speak|talk|说话|說話/,
  waiting_user: /wait|question|ask|提问|提問/,
  success: /success|done|finish|complete|完成|成功/,
  error: /error|fail|mistake|失败|失敗/,
}

const gestureGroupPatterns: Partial<Record<CharacterGesture, RegExp>> = {
  nod: /nod|agree|yes|点头|點頭|同意/,
  shake_head: /shake|no|deny|摇头|搖頭/,
  wave: /wave|greet|hello|挥手|揮手|招呼/,
  celebrate: /happy|celebrate|clap|cheer|jump|开心|開心|高兴|高興|庆祝|慶祝/,
  look_at_user: /look|eye|attention|注视|注視/,
}

const emotionExpressionPatterns: Partial<Record<CharacterEmotion, RegExp>> = {
  happy: /smile|happy|laugh|joy|笑|开心|開心/,
  focused: /serious|focus|concentrate|认真|專注/,
  concerned: /worried|concern|sad|sorrow|担心|擔憂|伤心|傷心/,
  confused: /confus|puzzl|question|surpris|困惑/,
  annoyed: /annoy|angry|anger|mad|生气|生氣|愤怒|憤怒/,
  embarrassed: /embarrass|shy|blush|害羞/,
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
