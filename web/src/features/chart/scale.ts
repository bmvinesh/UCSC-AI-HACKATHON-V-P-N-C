// Pixel geometry for the chart. Presentation only: nothing here changes a value.

export interface Scale {
  (value: number): number
  ticks: number[]
}

/** About `count` round tick values covering [0, max]. */
export function niceTicks(max: number, count = 5): number[] {
  if (!(max > 0)) return [0]
  const rough = max / count
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude
  const ticks: number[] = []
  for (let value = 0; value <= max + step * 1e-9; value += step) ticks.push(Number(value.toPrecision(12)))
  return ticks
}

/** Linear scale from [0, the last tick at or above max] onto [from, to]. */
export function linearScale(max: number, from: number, to: number, count?: number): Scale {
  const ticks = niceTicks(max, count)
  const last = ticks[ticks.length - 1]
  const top = last >= max ? last : last + (ticks[1] ?? 1)
  if (top > last) ticks.push(top)
  const scale = (value: number) => from + (top === 0 ? 0 : value / top) * (to - from)
  return Object.assign(scale, { ticks })
}
