import { createStore } from "solid-js/store"
import { createMemo } from "solid-js"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { persisted } from "@/utils/persist"
import type { CharacterCapabilities, CharacterDefinition } from "@opencode-ai/wife-core"

export type WifeRegistryState = {
  characters: CharacterDefinition[]
  capabilities: Record<string, CharacterCapabilities>
  modelFolders: Record<string, string>
}

export const { use: useWifeRegistry, provider: WifeRegistryProvider } = createSimpleContext({
  name: "WifeRegistry",
  gate: false,
  init: () => {
    const [store, setStore, , ready] = persisted(
      "wife.registry.v1",
      createStore<WifeRegistryState>({ characters: [], capabilities: {}, modelFolders: {} }),
    )

    const list = createMemo(() => store.characters)
    const character = createMemo(() => (id: string) => store.characters.find((item) => item.id === id))
    const capabilities = createMemo(() => (id: string) => store.capabilities[id])
    const modelFolder = createMemo(() => (id: string) => store.modelFolders[id])

    const register = (name: string) => {
      const id = crypto.randomUUID()
      const definition: CharacterDefinition = {
        schemaVersion: 1,
        id,
        name,
        version: "1",
      }
      setStore("characters", (characters) => [...characters, definition])
      return id
    }

    const update = (id: string, patch: Partial<Pick<CharacterDefinition, "name" | "avatar" | "avatarImage">>) => {
      setStore("characters", (characters) => characters.map((item) => (item.id === id ? { ...item, ...patch } : item)))
    }

    const setCapabilities = (id: string, caps: CharacterCapabilities) => {
      setStore("capabilities", id, caps)
    }

    const setModelFolder = (id: string, folder: string) => {
      setStore("modelFolders", id, folder)
    }

    const remove = (id: string) => {
      setStore("characters", (characters) => characters.filter((item) => item.id !== id))
      setStore("capabilities", (capabilities) => {
        const next = { ...capabilities }
        delete next[id]
        return next
      })
      setStore("modelFolders", (folders) => {
        const next = { ...folders }
        delete next[id]
        return next
      })
    }

    return {
      ready,
      list,
      character,
      capabilities,
      modelFolder,
      register,
      update,
      setCapabilities,
      setModelFolder,
      remove,
    }
  },
})
