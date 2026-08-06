import { Component, For, Show, createMemo } from "solid-js"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { useLanguage } from "@/context/language"
import { useWifeRegistry } from "../registry/wife-registry"

export const CharacterList: Component<{
  onImport: () => void
}> = (props) => {
  const language = useLanguage()
  const registry = useWifeRegistry()

  const characters = createMemo(() => registry.list())

  return (
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h3 class="text-14-medium">{language.t("wife.characters.title")}</h3>
        <ButtonV2 size="small" variant="contrast" onClick={props.onImport}>
          {language.t("wife.import.title")}
        </ButtonV2>
      </div>

      <Show
        when={characters().length === 0}
        fallback={<For each={characters()}>{(character) => <CharacterRow id={character.id} />}</For>}
      >
        <span class="text-12-regular text-text-weak">{language.t("wife.characters.empty")}</span>
      </Show>
    </div>
  )
}

const CharacterRow: Component<{ id: string }> = (props) => {
  const language = useLanguage()
  const registry = useWifeRegistry()
  const character = createMemo(() => registry.character()(props.id))
  const capabilities = createMemo(() => registry.capabilities()(props.id))

  const summary = createMemo(() => {
    const caps = capabilities()
    if (!caps) return ""
    const motions = Object.values(caps.motionGroups).reduce((total, motions) => total + motions.length, 0)
    return `${language.t("wife.scan.motions")} ${motions}, ${language.t("wife.scan.expressions")} ${caps.expressions.length}`
  })

  return (
    <div class="flex items-center justify-between gap-4 rounded-lg border border-line px-3 py-2">
      <div class="flex flex-col gap-0.5">
        <span class="text-12-medium">{character()?.name}</span>
        <span class="text-11-regular text-text-weak">{summary()}</span>
      </div>
      <ButtonV2 size="small" variant="ghost-muted" onClick={() => registry.remove(props.id)}>
        {language.t("common.delete")}
      </ButtonV2>
    </div>
  )
}
