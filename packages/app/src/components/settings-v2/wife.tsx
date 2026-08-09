import { Component, Show, createMemo, createSignal, onMount } from "solid-js"
import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { Icon } from "@opencode-ai/ui/v2/icon"
import { ProviderIcon } from "@opencode-ai/ui/provider-icon"
import { Switch } from "@opencode-ai/ui/v2/switch-v2"
import { SelectV2 } from "@opencode-ai/ui/v2/select-v2"
import { ModelSelectorPopoverV2, type ModelSelectorModelState } from "@/components/dialog-select-model"
import { SettingsListV2 } from "./parts/list"
import { SettingsRowV2 } from "./parts/row"
import { useLanguage } from "@/context/language"
import { useModels } from "@/context/models"
import {
  useSettings,
  type WifeChatContrast,
  type WifeChatHeader,
  type WifeChatMotion,
  type WifeChatPace,
  type WifeChatTextSize,
} from "@/context/settings"
import { wifeChoiceModelAvailable } from "@/features/wife/chat/wife-choice-generator"
import { usePlatform } from "@/context/platform"

const heightRatioOptions = [0.25, 0.35, 0.5, 0.65, 0.8]
const textSizeOptions = ["small", "standard", "large"] satisfies WifeChatTextSize[]
const paceOptions = ["fast", "natural", "relaxed"] satisfies WifeChatPace[]
const contrastOptions = ["soft", "standard", "strong"] satisfies WifeChatContrast[]
const motionOptions = ["full", "subtle", "off"] satisfies WifeChatMotion[]
const headerOptions = ["every", "turn", "hidden"] satisfies WifeChatHeader[]

const RUNTIME_ERROR_KEYS: Record<"core-not-found" | "invalid-size" | "invalid-core" | "incompatible-core", string> = {
  "core-not-found": "wife.runtime.error.coreNotFound",
  "invalid-size": "wife.runtime.error.invalidSize",
  "invalid-core": "wife.runtime.error.invalidCore",
  "incompatible-core": "wife.runtime.error.incompatibleCore",
}

export const SettingsWifeV2: Component = () => {
  const language = useLanguage()
  const settings = useSettings()
  const models = useModels()
  const platform = usePlatform()
  const [importing, setImporting] = createSignal(false)
  const [runtimeInstalled, setRuntimeInstalled] = createSignal(false)
  const [runtimeBusy, setRuntimeBusy] = createSignal(false)
  const [runtimeError, setRuntimeError] = createSignal<string>()
  onMount(() => void platform.getLive2DRuntimeStatus?.().then((status) => setRuntimeInstalled(status.installed)))
  const selectedModel = createMemo(() => {
    const value = settings.general.wifeChoiceModel()
    return models.list().find((item) => item.provider.id === value.providerID && item.id === value.modelID)
  })
  const selectedVariant = createMemo(() => {
    const value = settings.general.wifeChoiceModel().variant
    if (!value || !Object.keys(selectedModel()?.variants ?? {}).includes(value)) return undefined
    return value
  })
  const choiceModelAvailable = createMemo(() =>
    wifeChoiceModelAvailable(models.list(), settings.general.wifeChoiceModel()),
  )
  const choiceModel: ModelSelectorModelState = {
    list: models.list,
    visible: models.visible,
    current: selectedModel,
    set(value) {
      if (!value) return
      models.setVisibility(value, true)
      settings.general.setWifeChoiceModel({ ...value, variant: undefined })
    },
  }
  const choiceVariants = () => Object.keys(selectedModel()?.variants ?? {})

  return (
    <>
      <div class="settings-v2-tab-header">
        <h2 class="settings-v2-tab-title">{language.t("settings.tab.wife")}</h2>
      </div>

      <div class="settings-v2-tab-body">
        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">{language.t("settings.wife.section.chat")}</h3>
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

        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">{language.t("settings.wife.section.bubbles")}</h3>
          <SettingsListV2>
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
            <SettingsRowV2
              title={language.t("settings.wife.bubbles.textSize.title")}
              description={language.t("settings.wife.bubbles.textSize.description")}
            >
              <SelectV2
                appearance="inline"
                options={textSizeOptions}
                current={settings.general.wifeChatTextSize()}
                placement="bottom-end"
                gutter={6}
                label={(value) => language.t(`settings.wife.bubbles.textSize.${value}`)}
                onSelect={(value) => value && settings.general.setWifeChatTextSize(value)}
                aria-label={language.t("settings.wife.bubbles.textSize.title")}
              />
            </SettingsRowV2>
            <SettingsRowV2
              title={language.t("settings.wife.bubbles.pace.title")}
              description={language.t("settings.wife.bubbles.pace.description")}
            >
              <SelectV2
                appearance="inline"
                options={paceOptions}
                current={settings.general.wifeChatPace()}
                placement="bottom-end"
                gutter={6}
                label={(value) => language.t(`settings.wife.bubbles.pace.${value}`)}
                onSelect={(value) => value && settings.general.setWifeChatPace(value)}
                aria-label={language.t("settings.wife.bubbles.pace.title")}
              />
            </SettingsRowV2>
            <SettingsRowV2
              title={language.t("settings.wife.bubbles.contrast.title")}
              description={language.t("settings.wife.bubbles.contrast.description")}
            >
              <SelectV2
                appearance="inline"
                options={contrastOptions}
                current={settings.general.wifeChatContrast()}
                placement="bottom-end"
                gutter={6}
                label={(value) => language.t(`settings.wife.bubbles.contrast.${value}`)}
                onSelect={(value) => value && settings.general.setWifeChatContrast(value)}
                aria-label={language.t("settings.wife.bubbles.contrast.title")}
              />
            </SettingsRowV2>
            <SettingsRowV2
              title={language.t("settings.wife.bubbles.motion.title")}
              description={language.t("settings.wife.bubbles.motion.description")}
            >
              <SelectV2
                appearance="inline"
                options={motionOptions}
                current={settings.general.wifeChatMotion()}
                placement="bottom-end"
                gutter={6}
                label={(value) => language.t(`settings.wife.bubbles.motion.${value}`)}
                onSelect={(value) => value && settings.general.setWifeChatMotion(value)}
                aria-label={language.t("settings.wife.bubbles.motion.title")}
              />
            </SettingsRowV2>
            <SettingsRowV2
              title={language.t("settings.wife.bubbles.header.title")}
              description={language.t("settings.wife.bubbles.header.description")}
            >
              <SelectV2
                appearance="inline"
                options={headerOptions}
                current={settings.general.wifeChatHeader()}
                placement="bottom-end"
                gutter={6}
                label={(value) => language.t(`settings.wife.bubbles.header.${value}`)}
                onSelect={(value) => value && settings.general.setWifeChatHeader(value)}
                aria-label={language.t("settings.wife.bubbles.header.title")}
              />
            </SettingsRowV2>
          </SettingsListV2>
        </div>

        <div class="settings-v2-section">
          <h3 class="settings-v2-section-title">{language.t("settings.wife.section.choices")}</h3>
          <SettingsListV2>
            <SettingsRowV2
              title={language.t("settings.wife.choices.enabled.title")}
              description={language.t("settings.wife.choices.enabled.description")}
            >
              <Switch
                checked={settings.general.wifeChoiceGenerationEnabled()}
                onChange={(enabled) => settings.general.setWifeChoiceGenerationEnabled(enabled)}
              />
            </SettingsRowV2>
            <SettingsRowV2
              title={language.t("settings.wife.choices.model.title")}
              description={
                <Show
                  when={!settings.general.wifeChoiceGenerationEnabled() || choiceModelAvailable()}
                  fallback={
                    <span class="text-icon-warning-base">{language.t("settings.wife.choices.model.unavailable")}</span>
                  }
                >
                  {language.t("settings.wife.choices.model.description")}
                </Show>
              }
            >
              <ModelSelectorPopoverV2
                model={choiceModel}
                manage={false}
                trigger={(triggerProps) => (
                  <ButtonV2
                    {...triggerProps}
                    disabled={!settings.general.wifeChoiceGenerationEnabled()}
                    variant="ghost-muted"
                    size="normal"
                    class="min-w-0 max-w-[220px] justify-start ![font-weight:440]"
                    aria-label={language.t("settings.wife.choices.model.title")}
                  >
                    <Show when={selectedModel()}>
                      {(model) => <ProviderIcon id={model().provider.id} class="size-4 shrink-0 opacity-60" />}
                    </Show>
                    <span class="truncate">{selectedModel()?.id ?? settings.general.wifeChoiceModel().modelID}</span>
                    <span class="-ms-0.5 -me-1 flex shrink-0">
                      <Icon name="chevron-down" />
                    </span>
                  </ButtonV2>
                )}
              />
            </SettingsRowV2>
            <SettingsRowV2
              title={language.t("settings.wife.choices.variant.title")}
              description={language.t("settings.wife.choices.variant.description")}
            >
              <SelectV2
                appearance="inline"
                disabled={!settings.general.wifeChoiceGenerationEnabled() || !selectedModel()}
                options={["default", ...choiceVariants()]}
                current={selectedVariant() ?? "default"}
                placement="bottom-end"
                gutter={6}
                label={(variant) => variant}
                onSelect={(variant) =>
                  settings.general.setWifeChoiceModel({
                    ...settings.general.wifeChoiceModel(),
                    variant: variant === "default" ? undefined : (variant ?? undefined),
                  })
                }
                aria-label={language.t("settings.wife.choices.variant.title")}
              />
            </SettingsRowV2>
          </SettingsListV2>
        </div>

        <Show when={platform.installLive2DRuntime}>
          {(installRuntime) => (
            <div class="settings-v2-section">
              <h3 class="settings-v2-section-title">{language.t("settings.wife.section.runtime")}</h3>
              <SettingsListV2>
                <SettingsRowV2
                  title={language.t("settings.wife.runtime.title")}
                  description={language.t(
                    runtimeInstalled() ? "settings.wife.runtime.installed" : "settings.wife.runtime.missing",
                  )}
                >
                  <div class="flex items-center gap-2">
                    <ButtonV2
                      variant="outline"
                      size="normal"
                      onClick={() => platform.openExternal("https://www.live2d.com/en/sdk/download/web/")}
                    >
                      {language.t("wife.runtime.download")}
                    </ButtonV2>
                    <ButtonV2
                      variant="neutral"
                      size="normal"
                      disabled={runtimeBusy()}
                      onClick={() => {
                        setRuntimeBusy(true)
                        setRuntimeError(undefined)
                        void installRuntime()()
                          .then((result) => {
                            if (!result.ok) {
                              if (result.code !== "canceled") setRuntimeError(language.t(RUNTIME_ERROR_KEYS[result.code]))
                              return
                            }
                            setRuntimeInstalled(true)
                            void platform.restart()
                          })
                          .catch((error) =>
                            setRuntimeError(error instanceof Error ? error.message : String(error)),
                          )
                          .finally(() => setRuntimeBusy(false))
                      }}
                    >
                      {language.t(runtimeInstalled() ? "settings.wife.runtime.replace" : "wife.runtime.install")}
                    </ButtonV2>
                    <Show when={runtimeInstalled() && platform.removeLive2DRuntime}>
                      {(removeRuntime) => (
                        <ButtonV2
                          variant="ghost-muted"
                          size="normal"
                          disabled={runtimeBusy()}
                          onClick={() => {
                            setRuntimeBusy(true)
                            setRuntimeError(undefined)
                            void removeRuntime()()
                              .then(() => platform.restart())
                              .catch((error) =>
                                setRuntimeError(error instanceof Error ? error.message : String(error)),
                              )
                              .finally(() => setRuntimeBusy(false))
                          }}
                        >
                          {language.t("settings.wife.runtime.remove")}
                        </ButtonV2>
                      )}
                    </Show>
                  </div>
                  <Show when={runtimeError()}>
                    <span class="text-12-regular text-icon-critical-base">{runtimeError()}</span>
                  </Show>
                </SettingsRowV2>
              </SettingsListV2>
            </div>
          )}
        </Show>

        <Show when={platform.importOpenCodePreferences}>
          {(runImport) => (
            <div class="settings-v2-section">
              <h3 class="settings-v2-section-title">{language.t("settings.wife.section.data")}</h3>
              <SettingsListV2>
                <SettingsRowV2
                  title={language.t("settings.wife.import.title")}
                  description={language.t("settings.wife.import.description")}
                >
                  <ButtonV2
                    variant="neutral"
                    size="normal"
                    disabled={importing()}
                    onClick={() => {
                      setImporting(true)
                      void runImport()()
                        .then(() => platform.restart())
                        .finally(() => setImporting(false))
                    }}
                  >
                    {language.t(importing() ? "settings.wife.import.working" : "settings.wife.import.action")}
                  </ButtonV2>
                </SettingsRowV2>
              </SettingsListV2>
            </div>
          )}
        </Show>
      </div>
    </>
  )
}
