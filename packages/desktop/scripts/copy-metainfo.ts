import { resolveChannel } from "./utils"

const arg = process.argv[2]
const channel = arg === "dev" || arg === "beta" || arg === "prod" ? arg : resolveChannel()

const appId =
  channel === "prod" ? "io.github.ryuumeow.opencode-wife" : `io.github.ryuumeow.opencode-wife.${channel}`
const productName =
  channel === "prod" ? "OpenCode Wife" : `OpenCode Wife ${channel.charAt(0).toUpperCase() + channel.slice(1)}`
const summary = `OpenCode with isolated Side Chat and Live2D${channel !== "prod" ? ` (${channel})` : ""}`

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>${appId}</id>

  <metadata_license>CC0-1.0</metadata_license>
  <project_license>MIT</project_license>

  <name>${productName}</name>
  <summary>${summary}</summary>

  <developer id="io.github.ryuumeow">
    <name>RyuuMeow</name>
  </developer>

  <description>
    <p>
      OpenCode Wife extends OpenCode with an isolated Side Chat and optional Live2D presentation.
    </p>
  </description>

  <launchable type="desktop-id">${appId}.desktop</launchable>

  <content_rating type="oars-1.1" />

  <url type="bugtracker">https://github.com/RyuuMeow/opencode-wife/issues</url>
  <url type="homepage">https://github.com/RyuuMeow/opencode-wife</url>
  <url type="vcs-browser">https://github.com/RyuuMeow/opencode-wife</url>

  <screenshots>
    <screenshot type="default">
      <image>https://raw.githubusercontent.com/RyuuMeow/opencode-wife/dev/resources/demo/Demo_Choice.gif</image>
    </screenshot>
  </screenshots>
</component>
`

await Bun.write(`resources/${appId}.metainfo.xml`, xml)
console.log(`Generated metainfo for ${channel} at resources/${appId}.metainfo.xml`)
