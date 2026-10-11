import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { Observation } from '../../contracts/index.ts'
import { MEASUREMENT_LABELS, formatVolume } from '../labels.ts'
import { linearScale } from './scale.ts'
import type { ChartSeries } from './series.ts'

const WIDTH = 720
const HEIGHT = 340
const MARGIN = { top: 16, right: 20, bottom: 44, left: 56 }
const SURFACE = '#fcfcfb'
const INK = '#0b0b0b'
const MUTED = '#898781'
const GRID = '#e7e6e2'

interface Props {
  observations: Observation[]
  series: ChartSeries[]
}

/**
 * Observed points come from the case record and are drawn as dots. Result curves are
 * lines: solid for a forecast, dashed for an illustrative what-if. The same values are
 * in the legend, the hover readout and the data table, so nothing depends on colour.
 */
export function VolumeChart({ observations, series }: Props) {
  const [activeDay, setActiveDay] = useState<number | null>(null)

  const days = useMemo(() => {
    const all = new Set<number>(observations.map((o) => o.day))
    for (const s of series) for (const p of s.points) all.add(p.day)
    return [...all].sort((a, b) => a - b)
  }, [observations, series])

  const maxDay = Math.max(1, ...days)
  const maxVolume = Math.max(
    ...observations.map((o) => o.volume_cm3),
    ...series.flatMap((s) => s.points.map((p) => p.upper_cm3 ?? p.volume_cm3)),
    0,
  )
  const x = linearScale(maxDay, MARGIN.left, WIDTH - MARGIN.right, 7)
  const y = linearScale(maxVolume, HEIGHT - MARGIN.bottom, MARGIN.top)

  const nearestDay = (clientX: number, svg: SVGSVGElement) => {
    const box = svg.getBoundingClientRect()
    const px = ((clientX - box.left) / box.width) * WIDTH
    return days.reduce((best, day) => (Math.abs(x(day) - px) < Math.abs(x(best) - px) ? day : best), days[0])
  }
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => setActiveDay(nearestDay(event.clientX, event.currentTarget))
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step || days.length === 0) return
    event.preventDefault()
    const index = activeDay === null ? (step > 0 ? -1 : days.length) : days.indexOf(activeDay)
    setActiveDay(days[Math.min(days.length - 1, Math.max(0, index + step))])
  }

  const readout =
    activeDay === null
      ? []
      : [
          ...observations
            .filter((o) => o.day === activeDay)
            .map((o) => ({ key: `obs-${o.day}`, name: `Observed, ${MEASUREMENT_LABELS[o.measurement]}`, color: INK, dashed: false, dot: true, value: formatVolume(o.volume_cm3) })),
          ...series.flatMap((s) => {
            const point = s.points.find((p) => p.day === activeDay)
            if (!point) return []
            const band = point.lower_cm3 !== null && point.upper_cm3 !== null ? ` (${formatVolume(point.lower_cm3)} to ${formatVolume(point.upper_cm3)})` : ''
            return [{ key: s.key, name: s.label, color: s.color, dashed: s.dashed, dot: false, value: formatVolume(point.volume_cm3) + band }]
          }),
        ]

  return (
    <figure className="rounded border border-slate-200 bg-[#fcfcfb] p-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        tabIndex={0}
        aria-label={`Tumour volume in cubic centimetres by day. ${observations.length} observed point(s) and ${series.length} result curve(s). Use the left and right arrow keys to read values; the data table below lists them all.`}
        className="h-auto w-full touch-none select-none focus-visible:outline-2 focus-visible:outline-slate-500"
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActiveDay(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setActiveDay(null)}
      >
        {y.ticks.map((tick) => (
          <g key={tick}>
            <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth={1} />
            <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={11} fill={MUTED}>
              {tick}
            </text>
          </g>
        ))}
        {x.ticks.map((tick) => (
          <text key={tick} x={x(tick)} y={HEIGHT - MARGIN.bottom + 16} textAnchor="middle" fontSize={11} fill={MUTED}>
            {tick}
          </text>
        ))}
        <text x={(MARGIN.left + WIDTH - MARGIN.right) / 2} y={HEIGHT - 6} textAnchor="middle" fontSize={11} fill={MUTED}>
          Days since baseline
        </text>
        <text transform={`translate(13 ${(MARGIN.top + HEIGHT - MARGIN.bottom) / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} fill={MUTED}>
          Volume (cm³)
        </text>

        {series.map((s) => (
          <g key={s.key}>
            {s.hasBand && (
              <polygon
                fill={s.color}
                fillOpacity={0.14}
                points={[
                  ...s.points.filter((p) => p.upper_cm3 !== null).map((p) => `${x(p.day)},${y(p.upper_cm3!)}`),
                  ...s.points.filter((p) => p.lower_cm3 !== null).map((p) => `${x(p.day)},${y(p.lower_cm3!)}`).reverse(),
                ].join(' ')}
              />
            )}
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dashed ? '7 5' : undefined}
              points={s.points.map((p) => `${x(p.day)},${y(p.volume_cm3)}`).join(' ')}
            />
          </g>
        ))}

        {activeDay !== null && <line x1={x(activeDay)} x2={x(activeDay)} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} stroke={MUTED} strokeWidth={1} />}

        {observations.map((o) => (
          <circle key={o.day} cx={x(o.day)} cy={y(o.volume_cm3)} r={5} fill={INK} stroke={SURFACE} strokeWidth={2} />
        ))}
      </svg>

      <p aria-live="polite" className="min-h-10 px-1 text-xs text-slate-700">
        {activeDay === null ? (
          <span className="text-slate-500">Hover, or focus the chart and use the arrow keys, to read values.</span>
        ) : (
          <>
            <span className="font-medium">Day {activeDay}</span>
            {readout.map((row) => (
              <span key={row.key} className="ml-3 inline-flex items-center gap-1.5">
                <Key color={row.color} dashed={row.dashed} dot={row.dot} />
                <strong className="font-semibold text-slate-900">{row.value}</strong> {row.name}
              </span>
            ))}
          </>
        )}
      </p>

      <figcaption className="mt-2 border-t border-slate-200 pt-2">
        <ul className="space-y-1 text-xs text-slate-700">
          {observations.length > 0 && (
            <li className="flex items-start gap-2">
              <Key color={INK} dashed={false} dot />
              <span>
                <span className="font-medium text-slate-900">Observed</span>: measured values from the case record.
              </span>
            </li>
          )}
          {series.map((s) => (
            <li key={s.key} className="flex items-start gap-2">
              <Key color={s.color} dashed={s.dashed} dot={false} />
              <span>
                <span className="font-medium text-slate-900">{s.label}</span>: {s.detail}
              </span>
            </li>
          ))}
        </ul>
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-slate-700">Data table</summary>
          <DataTable observations={observations} series={series} days={days} />
        </details>
      </figcaption>
    </figure>
  )
}

function Key({ color, dashed, dot }: { color: string; dashed: boolean; dot: boolean }) {
  return (
    <svg width={22} height={12} aria-hidden="true" className="mt-0.5 shrink-0">
      {dot ? <circle cx={11} cy={6} r={4} fill={color} /> : <line x1={1} x2={21} y1={6} y2={6} stroke={color} strokeWidth={2} strokeDasharray={dashed ? '5 3' : undefined} />}
    </svg>
  )
}

function DataTable({ observations, series, days }: Props & { days: number[] }) {
  return (
    <div className="mt-2 max-h-64 overflow-auto">
      <table className="w-full border-collapse text-left tabular-nums">
        <thead className="sticky top-0 bg-[#fcfcfb]">
          <tr className="border-b border-slate-300">
            <th scope="col" className="py-1 pr-3 font-medium">Day</th>
            <th scope="col" className="py-1 pr-3 font-medium">Observed (cm³)</th>
            {series.map((s) => (
              <th key={s.key} scope="col" className="py-1 pr-3 font-medium">
                {s.label} (cm³)
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const observed = observations.find((o) => o.day === day)
            return (
              <tr key={day} className="border-b border-slate-100">
                <th scope="row" className="py-1 pr-3 font-normal">{day}</th>
                <td className="py-1 pr-3">{observed ? observed.volume_cm3.toFixed(2) : ''}</td>
                {series.map((s) => {
                  const point = s.points.find((p) => p.day === day)
                  const band = point && point.lower_cm3 !== null && point.upper_cm3 !== null ? ` (${point.lower_cm3.toFixed(2)} to ${point.upper_cm3.toFixed(2)})` : ''
                  return (
                    <td key={s.key} className="py-1 pr-3">
                      {point ? point.volume_cm3.toFixed(2) + band : ''}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
