import { Component, JSX, Show, createMemo } from "solid-js"
import { SelectV2 } from "@opencode-ai/ui/v2/select-v2"
import type { CharacterCapabilities, CharacterEmotion, CharacterGesture, CharacterState } from "@opencode-ai/wife-core"
import {
  characterEmotions,
  characterGestures,
  characterStates,
  suggestStateFallback,
  type SuggestedMappings,
} from "@opencode-ai/wife-core"
import { useLanguage } from "@/context/language"

type MappingChange = (mappings: SuggestedMappings) => void

const MotionSelect: Component<{
  capabilities: CharacterCapabilities
  group?: string
  fallback?: string
  noneLabel: string
  onChange: (group: string | undefined) => void
}> = (props) => {
  const language = useLanguage()
  const options = createMemo(() => {
    const groups = Object.entries(props.capabilities.motionGroups).map(([group, motions]) => ({
      value: group,
      label: motions.length > 1 ? `${group} (${motions.length})` : group,
    }))
    return [{ value: "", label: props.noneLabel }, ...groups]
  })
  const current = () => options().find((option) => option.value === props.group) ?? options()[0]

  return (
    <div class="flex flex-col items-end gap-1">
      <SelectV2
        appearance="inline"
        options={options()}
        current={current()}
        placement="bottom-end"
        gutter={6}
        value={(option) => option.value}
        label={(option) => option.label}
        onSelect={(option) => props.onChange(option && option.value !== "" ? option.value : undefined)}
      />
      <Show when={props.group === undefined && props.fallback}>
        <span class="text-11-regular text-text-weak">
          {language.t("wife.mapping.fallback")} {props.fallback}
        </span>
      </Show>
    </div>
  )
}

const ExpressionSelect: Component<{
  capabilities: CharacterCapabilities
  expression?: string
  noneLabel: string
  onChange: (expression: string | undefined) => void
}> = (props) => {
  const options = createMemo(() => {
    const expressions = props.capabilities.expressions.map((entry) => ({ value: entry.id, label: entry.id }))
    return [{ value: "", label: props.noneLabel }, ...expressions]
  })
  const current = () => options().find((option) => option.value === props.expression) ?? options()[0]

  return (
    <SelectV2
      appearance="inline"
      options={options()}
      current={current()}
      placement="bottom-end"
      gutter={6}
      value={(option) => option.value}
      label={(option) => option.label}
      onSelect={(option) => props.onChange(option && option.value !== "" ? option.value : undefined)}
    />
  )
}

const MappingRow: Component<{
  semantic: string
  children: JSX.Element
}> = (props) => {
  return (
    <div class="flex items-center justify-between gap-4 py-1">
      <span class="text-12-medium">{props.semantic}</span>
      <div class="min-w-[160px]">{props.children}</div>
    </div>
  )
}

export const SemanticMappingEditor: Component<{
  capabilities: CharacterCapabilities
  mappings: SuggestedMappings
  onChange: MappingChange
}> = (props) => {
  const language = useLanguage()
  const noneLabel = language.t("wife.mapping.none")

  const setState = (state: CharacterState, group: string | undefined) => {
    const states = { ...props.mappings.states }
    if (group === undefined) {
      delete states[state]
    } else {
      states[state] = {
        motions: [{ group, index: 0 }],
        selection: "first",
        loop: state === "idle" || state === "working",
      }
    }
    props.onChange({ ...props.mappings, states })
  }

  const setGesture = (gesture: CharacterGesture, group: string | undefined) => {
    const gestures = { ...props.mappings.gestures }
    if (group === undefined) {
      delete gestures[gesture]
    } else {
      gestures[gesture] = { motions: [{ group, index: 0 }], selection: "first", interruptible: true }
    }
    props.onChange({ ...props.mappings, gestures })
  }

  const setEmotion = (emotion: CharacterEmotion, expression: string | undefined) => {
    const emotions = { ...props.mappings.emotions }
    if (expression === undefined) {
      delete emotions[emotion]
    } else {
      emotions[emotion] = { expression }
    }
    props.onChange({ ...props.mappings, emotions })
  }

  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-12-medium text-text-weak">{language.t("wife.mapping.states")}</span>
        {characterStates.map((state) => (
          <MappingRow semantic={state}>
            <MotionSelect
              capabilities={props.capabilities}
              group={props.mappings.states[state]?.motions?.[0]?.group}
              fallback={suggestStateFallback(state, props.mappings.states)}
              noneLabel={noneLabel}
              onChange={(group) => setState(state, group)}
            />
          </MappingRow>
        ))}
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-12-medium text-text-weak">{language.t("wife.mapping.gestures")}</span>
        {characterGestures.map((gesture) => (
          <MappingRow semantic={gesture}>
            <MotionSelect
              capabilities={props.capabilities}
              group={props.mappings.gestures[gesture]?.motions?.[0]?.group}
              noneLabel={noneLabel}
              onChange={(group) => setGesture(gesture, group)}
            />
          </MappingRow>
        ))}
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-12-medium text-text-weak">{language.t("wife.mapping.emotions")}</span>
        {characterEmotions.map((emotion) => (
          <MappingRow semantic={emotion}>
            <ExpressionSelect
              capabilities={props.capabilities}
              expression={props.mappings.emotions[emotion]?.expression}
              noneLabel={noneLabel}
              onChange={(expression) => setEmotion(emotion, expression)}
            />
          </MappingRow>
        ))}
      </div>
    </div>
  )
}
