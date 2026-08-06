import { Component, JSX, Show, createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import { SelectV2 } from "@opencode-ai/ui/v2/select-v2"
import type { CharacterCapabilities, CharacterEmotion, CharacterGesture, CharacterState } from "@opencode-ai/wife-core"
import {
  characterEmotions,
  characterGestures,
  characterStates,
  suggestStateFallback,
  type SuggestedMappings,
} from "@opencode-ai/wife-core"
import { SettingsListV2 } from "@/components/settings-v2/parts/list"
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
        <span class="text-11-regular text-v2-text-text-muted">
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
    <div class="flex items-center justify-between gap-4">
      <span class="truncate">{props.semantic}</span>
      <div class="min-w-[160px] shrink-0">{props.children}</div>
    </div>
  )
}

const Chevron: Component<{ expanded: boolean }> = (props) => {
  if (props.expanded) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M5.37624 6.75194C5.18184 6.41861 5.42224 6 5.80814 6H10.1921C10.578 6 10.8184 6.41861 10.624 6.75194L8.43203 10.5096C8.23909 10.8404 7.76119 10.8404 7.56825 10.5096L5.37624 6.75194Z"
          fill="currentColor"
        />
      </svg>
    )
  }
  return (
    <svg width="5" height="6" viewBox="0 0 5 6" fill="none" aria-hidden="true">
      <path
        d="M0.75194 5.31663C0.41861 5.51103 0 5.27063 0 4.88473V0.500754C0 0.114854 0.41861 -0.125577 0.75194 0.0688635L4.5096 2.26084C4.8404 2.45378 4.8404 2.93168 4.5096 3.12462L0.75194 5.31663Z"
        fill="currentColor"
      />
    </svg>
  )
}

const MappingGroup: Component<{
  title: string
  expanded: boolean
  onToggle: () => void
  children: JSX.Element
}> = (props) => {
  return (
    <div class="settings-v2-section" data-expanded={props.expanded ? "" : undefined}>
      <h3 class="settings-v2-mapping-group-header">
        <button
          type="button"
          class="settings-v2-mapping-group-trigger"
          aria-expanded={props.expanded}
          onClick={props.onToggle}
        >
          <span class="settings-v2-mapping-group-chevron">
            <Chevron expanded={props.expanded} />
          </span>
          <span class="settings-v2-mapping-group-label">
            <span class="settings-v2-section-title">{props.title}</span>
          </span>
        </button>
      </h3>
      <Show when={props.expanded}>
        <SettingsListV2>{props.children}</SettingsListV2>
      </Show>
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
  const [collapsed, setCollapsed] = createStore({ states: true, gestures: true, emotions: true })

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
    <div class="flex flex-col gap-2 settings-v2-mapping">
      <MappingGroup
        title={language.t("wife.mapping.states")}
        expanded={!collapsed.states}
        onToggle={() => setCollapsed("states", !collapsed.states)}
      >
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
      </MappingGroup>

      <MappingGroup
        title={language.t("wife.mapping.gestures")}
        expanded={!collapsed.gestures}
        onToggle={() => setCollapsed("gestures", !collapsed.gestures)}
      >
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
      </MappingGroup>

      <MappingGroup
        title={language.t("wife.mapping.emotions")}
        expanded={!collapsed.emotions}
        onToggle={() => setCollapsed("emotions", !collapsed.emotions)}
      >
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
      </MappingGroup>
    </div>
  )
}
