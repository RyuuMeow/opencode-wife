import { Component, Match, Show, Switch, createMemo, createSignal } from "solid-js"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { CharacterList } from "@/features/wife/character/character-list"
import { CharacterSettings } from "@/features/wife/character/character-settings"
import { useLanguage } from "@/context/language"
import { useWifeRegistry } from "@/features/wife/registry/wife-registry"

export const SettingsCharactersV2: Component = () => {
  const language = useLanguage()
  const registry = useWifeRegistry()
  const [view, setView] = createSignal<{ type: "list" } | { type: "edit"; id: string }>({ type: "list" })
  const editingId = createMemo(() => {
    const current = view()
    return current.type === "edit" ? current.id : undefined
  })

  const add = () => {
    registry.register(language.t("wife.characters.newDefault"))
  }

  return (
    <>
      <div class="settings-v2-tab-header flex items-center justify-between">
        <Show
          when={view().type === "list"}
          fallback={
            <ButtonV2 size="small" variant="ghost" icon="arrow-left" onClick={() => setView({ type: "list" })}>
              {language.t("wife.characters.backToList")}
            </ButtonV2>
          }
        >
          <h2 class="settings-v2-tab-title">{language.t("wife.characters.title")}</h2>
        </Show>
        <Show when={view().type === "list"}>
          <ButtonV2 size="normal" variant="neutral" icon="plus" onClick={add}>
            {language.t("wife.import.title")}
          </ButtonV2>
        </Show>
      </div>

      <div class="settings-v2-tab-body settings-v2-characters">
        <Switch>
          <Match when={view().type === "list"}>
            <CharacterList onEdit={(id) => setView({ type: "edit", id })} />
          </Match>
          <Match when={editingId()}>
            {(id) => <CharacterSettings id={id()} onBack={() => setView({ type: "list" })} />}
          </Match>
        </Switch>
      </div>
    </>
  )
}
