import { createEffect, onCleanup } from "solid-js"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { wifeLogger } from "@opencode-ai/wife-core/log"
import { useGlobal } from "@/context/global"
import { useSettings } from "@/context/settings"
import { ServerConnection } from "@/context/server"

export const { use: useWife, provider: WifeProvider } = createSimpleContext({
  name: "Wife",
  gate: false,
  init: () => {
    const global = useGlobal()
    const settings = useSettings()
    const log = wifeLogger("activity")

    const subscriptions = new Map<string, () => void>()

    const subscribe = (key: string) => {
      const conn = global.servers.list().find((item) => ServerConnection.key(item) === key)
      if (!conn) return
      const ctx = global.ensureServerCtx(conn)
      const unsubscribe = ctx.sdk.event.listen((event) => {
        try {
          log.debug("event", { directory: event.name, type: event.details.type, id: event.details.id })
        } catch (error) {
          log.error("event listener failed", error)
        }
      })
      subscriptions.set(key, unsubscribe)
    }

    createEffect(() => {
      const enabled = settings.general.wifeMode()
      subscriptions.forEach((unsubscribe) => unsubscribe())
      subscriptions.clear()
      if (!enabled) return
      global.servers.list().forEach((conn) => subscribe(ServerConnection.key(conn)))
    })

    onCleanup(() => {
      subscriptions.forEach((unsubscribe) => unsubscribe())
      subscriptions.clear()
    })

    return {
      enabled: () => settings.general.wifeMode(),
    }
  },
})
