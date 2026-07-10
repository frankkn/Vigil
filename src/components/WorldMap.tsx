import { useEffect, useRef, useState, useCallback } from 'react'
import { WORLD_PATH, BORDER_PATH, COUNTRY_LABELS } from '../data/worldPath'
import { sunPosition } from '../lib/solar'
import { project } from '../lib/projection'
import type { Candle } from '../lib/types'

const W = 1000
const H = 500

interface Props {
  candles: Candle[]
  ownCandleId: string | null
  now: Date
}

interface Tooltip {
  x: number
  y: number
  candle: Candle
}

export default function WorldMap({ candles, ownCandleId, now }: Props) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sun = sunPosition(now)
  const antiLat = -sun.lat
  const antiLng = sun.lng > 0 ? sun.lng - 180 : sun.lng + 180
  const [antiX, antiY] = project(antiLat, antiLng, W, H)

  const handleCandleEnter = useCallback((_e: React.MouseEvent, candle: Candle) => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const scaleX = rect.width / W
    const scaleY = rect.height / H
    const [cx, cy] = project(candle.lat + candle.offsetLat, candle.lng + candle.offsetLng, W, H)
    setTooltip({
      x: cx * scaleX,
      y: cy * scaleY,
      candle,
    })
  }, [])

  const handleCandleLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setTooltip(null), 300)
  }, [])

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current) }, [])

  return (
    <div className="relative w-full h-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Night side: radial gradient centered on anti-solar point */}
          <radialGradient id="nightGrad" cx={antiX / W} cy={antiY / H} r="0.75" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="#000614" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#000d2e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#001040" stopOpacity="0" />
          </radialGradient>
          {/* Glow for candles */}
          <filter id="candleGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="ownGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ocean background */}
        <rect width={W} height={H} fill="#0a1226" />

        {/* Land */}
        <path d={WORLD_PATH} fill="#22314f" stroke="#3d5178" strokeWidth="0.4" />

        {/* Country borders (interior only) */}
        <path d={BORDER_PATH} fill="none" stroke="#31436a" strokeWidth="0.3" opacity="0.9" />

        {/* Night overlay */}
        <rect width={W} height={H} fill="url(#nightGrad)" style={{ pointerEvents: 'none' }} />

        {/* Country names — 安靜的灰藍，永遠不與燭光搶眼 */}
        <g style={{ pointerEvents: 'none' }} fill="#8195bd" fontFamily="system-ui, sans-serif">
          {COUNTRY_LABELS.map(l => (
            <text
              key={l.name}
              x={l.x}
              y={l.y}
              textAnchor="middle"
              fontSize={l.big ? 7 : 5.2}
              opacity={l.big ? 0.6 : 0.45}
              letterSpacing="0.5"
            >
              {l.name}
            </text>
          ))}
        </g>

        {/* Candles */}
        {candles.map(c => {
          const clat = c.lat + c.offsetLat
          const clng = c.lng + c.offsetLng
          const [cx, cy] = project(clat, clng, W, H)
          const isOwn = c.id === ownCandleId
          const remaining = (c.expiresAt - now.getTime()) / (30 * 60 * 1000)
          const opacity = 0.5 + 0.5 * Math.max(0, remaining)

          return (
            <g
              key={c.id}
              transform={`translate(${cx},${cy})`}
              style={{ cursor: 'pointer', opacity }}
              onMouseEnter={e => handleCandleEnter(e, c)}
              onMouseLeave={handleCandleLeave}
            >
              {/* Outer glow */}
              <circle
                r={isOwn ? 9 : 6}
                fill={isOwn ? '#f59e0b' : '#fbbf24'}
                opacity={0.15}
                filter={isOwn ? 'url(#ownGlow)' : 'url(#candleGlow)'}
              />
              {/* Flame */}
              <circle r={isOwn ? 3.5 : 2.5} fill={isOwn ? '#fde68a' : '#fbbf24'} />
              <circle r={isOwn ? 1.5 : 1} fill="#fffbeb" />
              {/* Own candle marker */}
              {isOwn && (
                <circle r={6} fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" opacity={0.8} />
              )}
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <CandleTooltip tooltip={tooltip} now={now} onMouseEnter={() => {
          if (hideTimer.current) clearTimeout(hideTimer.current)
        }} onMouseLeave={handleCandleLeave} />
      )}
    </div>
  )
}

function CandleTooltip({ tooltip, now, onMouseEnter, onMouseLeave }: {
  tooltip: Tooltip
  now: Date
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const { candle } = tooltip
  const minsLeft = Math.max(0, Math.round((candle.expiresAt - now.getTime()) / 60000))

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: tooltip.x,
        top: tooltip.y,
        transform: 'translate(-50%, -130%)',
        zIndex: 10,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        style={{
          background: 'rgba(6, 13, 31, 0.92)',
          border: '1px solid rgba(251, 191, 36, 0.25)',
          borderRadius: '8px',
          padding: '8px 12px',
          minWidth: '120px',
          maxWidth: '200px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 500, marginBottom: candle.message ? 4 : 0 }}>
          {candle.city} · 還有 {minsLeft} 分鐘
        </div>
        {candle.message && (
          <div style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.4 }}>
            {candle.message}
          </div>
        )}
      </div>
      {/* Arrow */}
      <div style={{
        position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
        borderTop: '6px solid rgba(251, 191, 36, 0.25)',
      }} />
    </div>
  )
}
