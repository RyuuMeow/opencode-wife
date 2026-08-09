export const WIFE_METADATA_KIND = "wife.kind"
export const WIFE_METADATA_OWNER = "wife.ownerSessionID"
export const WIFE_METADATA_VERSION = "wife.chatVersion"
export const WIFE_METADATA_VALUE = "assistant"
export const WIFE_METADATA_HANDOFF_VALUE = "handoff"
export const WIFE_METADATA_VERSION_VALUE = "4"

export function isWifeAssistantMetadata(metadata: unknown) {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) return false
  return WIFE_METADATA_KIND in metadata && metadata[WIFE_METADATA_KIND] === WIFE_METADATA_VALUE
}

export function isWifeInternalMetadata(metadata: unknown) {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) return false
  if (!(WIFE_METADATA_KIND in metadata)) return false
  return metadata[WIFE_METADATA_KIND] === WIFE_METADATA_VALUE || metadata[WIFE_METADATA_KIND] === WIFE_METADATA_HANDOFF_VALUE
}
