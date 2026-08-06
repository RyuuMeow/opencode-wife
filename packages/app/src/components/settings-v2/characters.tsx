import { Component, Show, createSignal } from "solid-js"
import { CharacterList } from "@/features/wife/character/character-list"
import { ImportWizard } from "@/features/wife/character/import-wizard"
import { useLanguage } from "@/context/language"

export const SettingsCharactersV2: Component = () => {
  const language = useLanguage()
  const [view, setView] = createSignal<"list" | "import">("list")

  return (
    <>
      <div class="settings-v2-tab-header">
        <h2 class="settings-v2-tab-title">{language.t("wife.characters.title")}</h2>
      </div>

      <div class="settings-v2-tab-body">
        <Show
          when={view() === "list"}
          fallback={<ImportWizard onDone={() => setView("list")} onCancel={() => setView("list")} />}
        >
          <CharacterList onImport={() => setView("import")} />
        </Show>
      </div>
    </>
  )
}
