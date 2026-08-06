import { Component } from "solid-js"
import { Switch } from "@opencode-ai/ui/v2/switch-v2"
import { SettingsListV2 } from "./parts/list"
import { SettingsRowV2 } from "./parts/row"
import { useLanguage } from "@/context/language"
import { useSettings } from "@/context/settings"

export const SettingsWifeV2: Component = () => {
  const language = useLanguage()
  const settings = useSettings()

  return (
    <>
      <div class="settings-v2-tab-header">
        <h2 class="settings-v2-tab-title">{language.t("settings.tab.wife")}</h2>
      </div>

      <div class="settings-v2-tab-body">
        <div class="settings-v2-section">
          <SettingsListV2>
            <SettingsRowV2
              title={language.t("settings.general.row.wifeMode.title")}
              description={language.t("settings.general.row.wifeMode.description")}
            >
              <div data-action="settings-wife-mode">
                <Switch
                  checked={settings.general.wifeMode()}
                  onChange={(checked) => settings.general.setWifeMode(checked)}
                />
              </div>
            </SettingsRowV2>
          </SettingsListV2>
        </div>
      </div>
    </>
  )
}
