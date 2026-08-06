import { Component, createMemo } from "solid-js"
import type { CharacterCapabilities } from "@opencode-ai/wife-core"
import { useLanguage } from "@/context/language"

const CapabilityChip: Component<{ labelKey: string; value: boolean }> = (props) => {
  const language = useLanguage()
  return (
    <span class="rounded-full px-2 py-0.5 text-11-regular border border-line">
      {language.t(props.labelKey)}: {language.t(props.value ? "wife.scan.yes" : "wife.scan.no")}
    </span>
  )
}

export const CapabilitySummary: Component<{ capabilities: CharacterCapabilities }> = (props) => {
  const language = useLanguage()
  const motionCount = createMemo(() =>
    Object.values(props.capabilities.motionGroups).reduce((total, motions) => total + motions.length, 0),
  )
  return (
    <div class="flex flex-col gap-2 text-12-regular">
      <span>
        {language.t("wife.scan.motions")}: {motionCount()} (
        {Object.keys(props.capabilities.motionGroups).join(", ") || language.t("wife.mapping.none")})
      </span>
      <span>
        {language.t("wife.scan.expressions")}:{" "}
        {props.capabilities.expressions.map((expression) => expression.id).join(", ") ||
          language.t("wife.mapping.none")}
      </span>
      <span>
        {language.t("wife.scan.parameters")}: {props.capabilities.parameters.length}
      </span>
      <span>
        {language.t("wife.scan.lipSync")}:{" "}
        {props.capabilities.lipSyncParameterIds.join(", ") || language.t("wife.mapping.none")}
      </span>
      <span>
        {language.t("wife.scan.eyeBlink")}:{" "}
        {props.capabilities.eyeBlinkParameterIds.join(", ") || language.t("wife.mapping.none")}
      </span>
      <div class="flex flex-wrap gap-1.5 pt-1">
        <CapabilityChip labelKey="wife.scan.gaze" value={props.capabilities.supportsGaze} />
        <CapabilityChip labelKey="wife.scan.angle" value={props.capabilities.supportsAngle} />
        <CapabilityChip labelKey="wife.scan.mouthForm" value={props.capabilities.supportsMouthForm} />
      </div>
    </div>
  )
}
