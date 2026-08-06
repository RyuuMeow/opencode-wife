import { Component, For, Show, createMemo } from "solid-js"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { Tag } from "@opencode-ai/ui/v2/badge-v2"
import { Icon } from "@opencode-ai/ui/icon"
import { SettingsListV2 } from "@/components/settings-v2/parts/list"
import { useLanguage } from "@/context/language"
import { useWifeRegistry } from "../registry/wife-registry"

export const CharacterList: Component<{
  onEdit: (id: string) => void
}> = (props) => {
  const language = useLanguage()
  const registry = useWifeRegistry()
  const characters = createMemo(() => registry.list())

  return (
    <SettingsListV2>
      <Show
        when={characters().length > 0}
        fallback={<div class="settings-v2-character-empty">{language.t("wife.characters.empty")}</div>}
      >
        <For each={characters()}>
          {(character) => (
            <div class="settings-v2-character-row">
              <div class="settings-v2-character-lead">
                <Icon name="user-circle" size="small" class="shrink-0" />
                <div class="settings-v2-character-main">
                  <span class="settings-v2-character-name truncate">{character.name}</span>
                  <CapabilityTag id={character.id} />
                </div>
              </div>
              <ButtonV2 size="normal" variant="ghost-muted" icon="edit" onClick={() => props.onEdit(character.id)}>
                {language.t("wife.characters.edit")}
              </ButtonV2>
            </div>
          )}
        </For>
      </Show>
    </SettingsListV2>
  )
}

const CapabilityTag: Component<{ id: string }> = (props) => {
  const language = useLanguage()
  const registry = useWifeRegistry()
  const capabilities = createMemo(() => registry.capabilities()(props.id))

  const summary = createMemo(() => {
    const caps = capabilities()
    if (!caps) return ""
    const motions = Object.values(caps.motionGroups).reduce((total, motions) => total + motions.length, 0)
    return `${motions} ${language.t("wife.scan.motions")} · ${caps.expressions.length} ${language.t(
      "wife.scan.expressions",
    )}`
  })

  return <Tag>{summary()}</Tag>
}
