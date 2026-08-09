type Channel = "dev" | "beta" | "prod"
const raw = import.meta.env.OPENCODE_CHANNEL
export const CHANNEL: Channel = raw === "dev" || raw === "beta" || raw === "prod" ? raw : "dev"

export const APP_NAMES: Record<Channel, string> = {
  dev: "OpenCode Wife Dev",
  beta: "OpenCode Wife Beta",
  prod: "OpenCode Wife",
}

export const APP_IDS: Record<Channel, string> = {
  dev: "io.github.ryuumeow.opencode-wife.dev",
  beta: "io.github.ryuumeow.opencode-wife.beta",
  prod: "io.github.ryuumeow.opencode-wife",
}

export const APP_PROTOCOL = "opencode-wife"

// Alpha releases are installed manually from this fork's GitHub Releases page.
export const UPDATER_ENABLED = false
export const RELEASES_URL = "https://github.com/RyuuMeow/opencode-wife/releases"
