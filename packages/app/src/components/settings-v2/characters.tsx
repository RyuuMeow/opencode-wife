import { Component, Match, Show, Switch, createMemo, createSignal } from "solid-js"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { CharacterList } from "@/features/wife/character/character-list"
import { CharacterSettings } from "@/features/wife/character/character-settings"
import { ImportWizard } from "@/features/wife/character/import-wizard"
import { useLanguage } from "@/context/language"

export const SettingsCharactersV2: Component = () => {
  const language = useLanguage()
  const [view, setView] = createSignal<{ type: "list" } | { type: "import" } | { type: "edit"; id: string }>({
    type: "list",
  })
  const editingId = createMemo(() => {
    const current = view()
    return current.type === "edit" ? current.id : undefined
  })

  return (
    <>
      <div class="settings-v2-tab-header flex items-center justify-between">
        <h2 class="settings-v2-tab-title">{language.t("wife.characters.title")}</h2>
        <Show when={view().type === "list"}>
          <ButtonV2 size="normal" variant="neutral" icon="plus" onClick={() => setView({ type: "import" })}>
            {language.t("wife.import.title")}
          </ButtonV2>
        </Show>
      </div>

      <div class="settings-v2-tab-body">
        <Switch>
          <Match when={view().type === "list"}>
            <CharacterList onEdit={(id) => setView({ type: "edit", id })} />
          </Match>
          <Match when={view().type === "import"}>
            <ImportWizard onDone={() => setView({ type: "list" })} onCancel={() => setView({ type: "list" })} />
          </Match>
          <Match when={editingId()}>
            {(id) => <CharacterSettings id={id()} onBack={() => setView({ type: "list" })} />}
          </Match>
        </Switch>
      </div>
    </>
  )
}
