import { expect, test } from 'vitest'
import examples from '../../../../contracts/examples.json'
import { parseContract } from '../../contracts/index.ts'
import { linearScale, niceTicks } from './scale.ts'
import { seriesFromResults } from './series.ts'

const result = parseContract('ScenarioResult', examples.ScenarioResult)

test('an illustrative curve is dashed and says so in its legend text', () => {
  const [series] = seriesFromResults([result])
  expect(series.dashed).toBe(true)
  expect(series.detail).toMatch(/^Illustrative what-if\./)
  expect(series.points).toBe(result.curves[0].points)
})

test('a forecast curve is solid, and a band is drawn only when the points carry one', () => {
  const forecast = structuredClone(result)
  forecast.request.engine = 'empirical'
  forecast.curves[0].evidence = 'forecast'
  expect(seriesFromResults([forecast])[0]).toMatchObject({ dashed: false, hasBand: false })

  const banded = structuredClone(result)
  banded.curves[0].band_kind = 'sensitivity'
  banded.curves[0].points = banded.curves[0].points.map((p) => ({ ...p, lower_cm3: p.volume_cm3 - 1, upper_cm3: p.volume_cm3 + 1 }))
  const [series] = seriesFromResults([banded])
  expect(series.hasBand).toBe(true)
  expect(series.detail).toMatch(/not a confidence interval/)
})

test('colour follows engine and intervention, not drawing order', () => {
  const off = structuredClone(result)
  off.id = '00000000-0000-4000-8000-000000000009'
  off.request.intervention = 'none'
  const [a, b] = seriesFromResults([result, off])
  const [b2, a2] = seriesFromResults([off, result])
  expect(a.color).not.toBe(b.color)
  expect([a2.color, b2.color]).toEqual([a.color, b.color])
})

test('ticks are round and the scale covers the maximum', () => {
  expect(niceTicks(21, 7)).toEqual([0, 5, 10, 15, 20])
  expect(niceTicks(0)).toEqual([0])
  const y = linearScale(10.4, 300, 0)
  expect(y.ticks[y.ticks.length - 1]).toBeGreaterThanOrEqual(10.4)
  expect(y(0)).toBe(300)
  expect(y(y.ticks[y.ticks.length - 1])).toBe(0)
})
