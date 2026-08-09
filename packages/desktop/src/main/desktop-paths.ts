import { join } from "node:path"

type Channel = "dev" | "beta" | "prod"

const ORIGINAL_APP_IDS: Record<Channel, string> = {
  dev: "ai.opencode.desktop.dev",
  beta: "ai.opencode.desktop.beta",
  prod: "ai.opencode.desktop",
}

export function desktopPaths(input: { appData: string; wifeAppId: string; channel: Channel }) {
  return {
    wifeUserData: join(input.appData, input.wifeAppId),
    agentStateHome: join(input.appData, ORIGINAL_APP_IDS[input.channel]),
  }
}
