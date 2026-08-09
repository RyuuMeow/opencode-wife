import { createSimpleContext } from "@opencode-ai/ui/context"
import { useSettings } from "@/context/settings"

// oxlint-disable-next-line typescript-eslint/unbound-method -- createSimpleContext returns standalone context functions.
export const { use: useWife, provider: WifeProvider } = createSimpleContext({
  name: "Wife",
  gate: false,
  init: () => {
    const settings = useSettings()

    return {
      enabled: () => settings.general.wifeMode(),
    }
  },
})
