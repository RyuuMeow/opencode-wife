import { Component, Show, createSignal } from "solid-js"
import { Dialog } from "@opencode-ai/ui/dialog"
import { CharacterList } from "@/features/wife/character/character-list"
import { ImportWizard } from "@/features/wife/character/import-wizard"

export const DialogWife: Component = () => {
  const [view, setView] = createSignal<"list" | "import">("list")

  return (
    <Dialog size="large" transition>
      <Show
        when={view() === "list"}
        fallback={<ImportWizard onDone={() => setView("list")} onCancel={() => setView("list")} />}
      >
        <CharacterList onImport={() => setView("import")} />
      </Show>
    </Dialog>
  )
}
