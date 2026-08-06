import { Component, Show, createMemo, createSignal } from "solid-js"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { TextInputV2 } from "@opencode-ai/ui/v2/text-input-v2"
import type { AvatarProfile, SuggestedMappings } from "@opencode-ai/wife-core"
import { useLanguage } from "@/context/language"
import { useWifeRegistry } from "../registry/wife-registry"
import { CapabilitySummary } from "./capability-summary"
import { SemanticMappingEditor } from "./semantic-mapping"

export const CharacterSettings: Component<{
  id: string
  onBack: () => void
}> = (props) => {
  const language = useLanguage()
  const registry = useWifeRegistry()
  const character = createMemo(() => registry.character()(props.id))
  const capabilities = createMemo(() => registry.capabilities()(props.id))
  const [name, setName] = createSignal(character()?.name ?? "")
  const [mappings, setMappings] = createSignal<SuggestedMappings>(initialMappings(character()?.avatar))

  const save = () => {
    const current = character()
    if (!current) return
    registry.update(props.id, {
      name: name().trim() || current.name,
      avatar: {
        ...current.avatar,
        states: mappings().states,
        gestures: mappings().gestures,
        emotions: mappings().emotions,
      },
    })
  }

  const remove = () => {
    registry.remove(props.id)
    props.onBack()
  }

  return (
    <div class="flex flex-col gap-4">
      <ButtonV2 size="small" variant="ghost" icon="arrow-left" onClick={props.onBack}>
        {language.t("wife.characters.backToList")}
      </ButtonV2>

      <Show
        when={capabilities()}
        fallback={<span class="text-12-regular text-text-weak">{language.t("common.loading")}</span>}
      >
        {(caps) => (
          <>
            <div class="w-64">
              <TextInputV2
                type="text"
                appearance="base"
                value={name()}
                onInput={(event) => setName(event.currentTarget.value)}
                placeholder={language.t("wife.import.name")}
                aria-label={language.t("wife.import.name")}
              />
            </div>

            <div class="settings-v2-section">
              <h3 class="settings-v2-section-title">{language.t("wife.characters.settings.avatar")}</h3>
              <span class="text-12-regular text-text-weak">{character()?.avatar.modelAssetId}</span>
              <CapabilitySummary capabilities={caps()} />
              <SemanticMappingEditor capabilities={caps()} mappings={mappings()} onChange={setMappings} />
            </div>

            <div class="flex justify-end gap-2">
              <ButtonV2 size="normal" variant="danger" onClick={remove}>
                {language.t("common.delete")}
              </ButtonV2>
              <ButtonV2 size="normal" variant="contrast" onClick={save}>
                {language.t("common.save")}
              </ButtonV2>
            </div>
          </>
        )}
      </Show>
    </div>
  )
}

function initialMappings(avatar: AvatarProfile | undefined): SuggestedMappings {
  return {
    states: avatar?.states ?? {},
    gestures: avatar?.gestures ?? {},
    emotions: avatar?.emotions ?? {},
  }
}
