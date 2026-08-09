export const wifeLogScopes = [
  "registry",
  "activity",
  "trigger",
  "persona",
  "presentation",
  "live2d",
  "tts",
  "audio",
  "window",
] as const

export type WifeLogScope = (typeof wifeLogScopes)[number]

export type WifeLogger = {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

export function wifeLogger(scope: WifeLogScope): WifeLogger {
  const prefix = `[wife.${scope}]`
  return {
    debug: (...args) => console.debug(prefix, ...args.map(formatWifeLogValue)),
    info: (...args) => console.info(prefix, ...args.map(formatWifeLogValue)),
    warn: (...args) => console.warn(prefix, ...args.map(formatWifeLogValue)),
    error: (...args) => console.error(prefix, ...args.map(formatWifeLogValue)),
  }
}

export function formatWifeLogValue(value: unknown) {
  if (value instanceof Error || typeof value !== "object" || value === null) return value
  try {
    return JSON.stringify(value)
  } catch {
    return "[Unserializable object]"
  }
}
