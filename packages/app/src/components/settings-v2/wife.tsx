import { Component } from "solid-js"
import { Switch } from "@opencode-ai/ui/v2/switch-v2"
import { SelectV2 } from "@opencode-ai/ui/v2/select-v2"
import { SettingsListV2 } from "./parts/list"
import { SettingsRowV2 } from "./parts/row"
import { useLanguage } from "@/context/language"
import { useSettings } from "@/context/settings"

const heightRatioOptions = [0.25, 0.35, 0.5, 0.65, 0.8]

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
            <SettingsRowV2
              title={language.t("settings.general.row.wifeChatHeightRatio.title")}
              description={language.t("settings.general.row.wifeChatHeightRatio.description")}
            >
              <SelectV2
                appearance="inline"
                options={heightRatioOptions}
                current={settings.general.wifeChatHeightRatio()}
                placement="bottom-end"
                gutter={6}
                label={(ratio) => `${Math.round(ratio * 100)}%`}
                onSelect={(ratio) => ratio && settings.general.setWifeChatHeightRatio(ratio)}
                aria-label={language.t("settings.general.row.wifeChatHeightRatio.title")}
              />
            </SettingsRowV2>
          </SettingsListV2>
        </div>
      </div>
    </>
  )
}
