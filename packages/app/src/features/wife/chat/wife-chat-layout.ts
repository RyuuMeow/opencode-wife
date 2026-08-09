export function wifeBubbleFitCount(input: {
  messageHeights: number[]
  reservedHeight: number
  containerHeight: number
  heightRatio: number
  gap: number
}) {
  const threshold = input.containerHeight * Math.max(0, Math.min(1, input.heightRatio))
  const result = input.messageHeights.reduceRight(
    (state, height) => {
      if (state.full) return state
      const next = state.height + height + (state.count > 0 ? input.gap : 0)
      if (next > threshold && state.count > 0) return { ...state, full: true }
      return { height: next, count: state.count + 1, full: false }
    },
    { height: input.reservedHeight, count: 0, full: false },
  )
  return Math.max(1, result.count)
}

export function wifeBubbleExpelled<T>(messages: T[], visibleCount: number, nextCount: number) {
  const count = Math.min(visibleCount, messages.length)
  const remove = Math.max(0, count - nextCount)
  return messages.slice(messages.length - count, messages.length - count + remove)
}
