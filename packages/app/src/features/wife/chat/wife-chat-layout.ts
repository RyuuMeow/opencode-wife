export function wifeBubbleFitCount(input: {
  messageHeights: number[]
  reservedHeight: number
  threshold: number
  gap: number
}) {
  const result = input.messageHeights.reduceRight(
    (state, height) => {
      if (state.full) return state
      const next = state.height + height + (state.count > 0 ? input.gap : 0)
      if (next > input.threshold && state.count > 0) return { ...state, full: true }
      return { height: next, count: state.count + 1, full: false }
    },
    { height: input.reservedHeight, count: 0, full: false },
  )
  return Math.max(1, result.count)
}
