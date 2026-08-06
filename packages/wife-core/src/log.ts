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
    debug: (...args) => console.debug(prefix, ...args),
    info: (...args) => console.info(prefix, ...args),
    warn: (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
  }
}
