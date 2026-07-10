import { useRef, useState, useCallback, useEffect } from 'react'
import { WORLD_PATH, BORDER_PATH, COUNTRY_LABELS } from '../data/worldPath'
import { sunPosition } from '../lib/solar'
import { project } from '../lib/projection'
import { useMapCamera, WORLD_W, WORLD_H } from '../hooks/useMapCamera'
import type { Candle } from '../lib/types'

interface Props {
  candles: Candle[]
  ownCandleId: string | null
  now: Date
  centerLatLng: [number, number]
  isMobile: boolean
}

export default function WorldMap({ candles, ownCandleId, now, centerLatLng, isMobile }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const xformRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltipId, setTooltipId] = useState<string | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapAt = useRef(0)

  const candlesRef = useRef(candles)
  candlesRef.current = candles

  const dismissTooltip = useCallback(() => setTooltipId(null), [])

  const [initX, initY] = project(centerLatLng[0], centerLatLng[1], WORLD_W, WORLD_H)

  const cameraApi = useRef<ReturnType<typeof useMapCamera> | null>(null)

  const handleTap = useCallback((px: number, py: number) => {
    lastTapAt.current = Date.now()
    const api = cameraApi.current
    if (!api?.viewBox) return
    const { viewBox: vb, size, pxPerUnit: k } = api
    const wx = vb.x + (px / size.w) * vb.w
    const wy = vb.y + (py / size.h) * vb.h
    let best: { id: string; d: number } | null = null
    for (const c of candlesRef.current) {
      const [cx, cy] = project(c.lat + c.offsetLat, c.lng + c.offsetLng, WORLD_W, WORLD_H)
      // 經度環繞距離
      let dx = (cx - wx) % WORLD_W
      if (dx > WORLD_W / 2) dx -= WORLD_W
      if (dx < -WORLD_W / 2) dx += WORLD_W
      const d = Math.hypot(dx * k, (cy - wy) * k)
      if (d <= 20 && (!best || d < best.d)) best = { id: c.id, d }
    }
    setTooltipId(prev => (best && best.id !== prev ? best.id : null))
  }, [])

  const api = useMapCamera({
    containerRef, xformRef, svgRef,
    initialCenter: [initX, initY],
    onGestureStart: dismissTooltip,
    onTap: handleTap,
  })
  cameraApi.current = api
  const { viewBox: vb, size, pxPerUnit: k, zoomRel, isAway, reset } = api

  // 國名隨 zoom 次線性放大（封頂），拉近時看得清楚、不會變巨字
  const labelMult = Math.min(2.2, Math.pow(zoomRel, 0.55))

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current) }, [])

  const sun = sunPosition(now)
  const antiLat = -sun.lat
  const antiLng = sun.lng > 0 ? sun.lng - 180 : sun.lng + 180
  const [antiX, antiY] = project(antiLat, antiLng, WORLD_W, WORLD_H)

  // 桌面 hover（觸控後 700ms 內忽略 iOS 合成的 mouseenter）
  const handleEnter = useCallback((id: string) => {
    if (Date.now() - lastTapAt.current < 700) return
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setTooltipId(id)
  }, [])
  const handleLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setTooltipId(null), 300)
  }, [])

  const tooltipCandle = tooltipId ? candles.find(c => c.id === tooltipId) ?? null : null

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden"
      style={{ touchAction: 'none', cursor: 'grab' }}
    >
      <div ref={xformRef} style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', willChange: 'transform' }}>
        {/* viewBox 由 useMapCamera 命令式設定，不進 JSX（避免 now tick 蓋掉手勢中的相機） */}
        <svg ref={svgRef} preserveAspectRatio="xMidYMid slice" className="w-full h-full" style={{ display: 'block' }}>
          <defs>
            {/* 夜面漸層 ×3（各差 360°）：用 darken 混合取最暗，讓夜色在經度上真正週期化、拷貝交界無接縫 */}
            {[-WORLD_W, 0, WORLD_W].map(off => (
              <radialGradient
                key={off}
                id={`nightGrad${off}`}
                gradientUnits="userSpaceOnUse"
                cx={antiX + off}
                cy={antiY}
                r={WORLD_W * 0.75}
                gradientTransform={`matrix(1 0 0 0.5 0 ${antiY * 0.5})`}
              >
                <stop offset="0%" stopColor="#000614" stopOpacity="0.5" />
                <stop offset="60%" stopColor="#000d2e" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#001040" stopOpacity="0" />
              </radialGradient>
            ))}
            {/* 燭光光暈：漸層圓，比 feGaussianBlur 便宜非常多 */}
            <radialGradient id="glowGrad">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.55" />
              <stop offset="45%" stopColor="#fbbf24" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ocean */}
          <rect x={-WORLD_W} y={-WORLD_H} width={WORLD_W * 3} height={WORLD_H * 3} fill="#0a1226" />

          {/* 橫向環繞：地形渲染三份（±360°），相機經度取模後永遠看得到內容 */}
          {[-WORLD_W, 0, WORLD_W].map(off => (
            <g key={`land${off}`} transform={off === 0 ? undefined : `translate(${off},0)`}>
              <path d={WORLD_PATH} fill="#22314f" stroke="#3d5178" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
              <path d={BORDER_PATH} fill="none" stroke="#31436a" strokeWidth="0.5" opacity="0.9" vectorEffect="non-scaling-stroke" />
            </g>
          ))}

          {/* Night overlay：三張全寬漸層取最暗（darken），週期無縫；蓋在地形上、國名與蠟燭下 */}
          {[-WORLD_W, 0, WORLD_W].map(off => (
            <rect
              key={`night${off}`}
              x={-WORLD_W}
              y={0}
              width={WORLD_W * 3}
              height={WORLD_H}
              fill={`url(#nightGrad${off})`}
              style={{ pointerEvents: 'none', mixBlendMode: 'darken' }}
            />
          ))}

          {/* 國名與蠟燭 ×3 */}
          {[-WORLD_W, 0, WORLD_W].map(off => (
            <g key={`marks${off}`} transform={off === 0 ? undefined : `translate(${off},0)`}>
              {/* 國名：隨 zoom 次線性放大的螢幕定字級 */}
              <g style={{ pointerEvents: 'none' }} fill="#8195bd" fontFamily="system-ui, sans-serif">
                {COUNTRY_LABELS.map(l => (
                  <text
                    key={l.name}
                    x={l.x}
                    y={l.y}
                    textAnchor="middle"
                    fontSize={((l.big ? 11 : 8) * labelMult) / k}
                    opacity={l.big ? 0.6 : Math.min(0.7, 0.45 + (labelMult - 1) * 0.2)}
                    letterSpacing={0.5 / k}
                  >
                    {l.name}
                  </text>
                ))}
              </g>

              {/* 蠟燭：幾何以螢幕 px 定義，scale(1/k) 保持固定大小；拉近時位置自然散開 */}
              {candles.map(c => {
                const [cx, cy] = project(c.lat + c.offsetLat, c.lng + c.offsetLng, WORLD_W, WORLD_H)
                const isOwn = c.id === ownCandleId
                const remaining = (c.expiresAt - now.getTime()) / (30 * 60 * 1000)
                const opacity = 0.5 + 0.5 * Math.max(0, remaining)
                return (
                  <g
                    key={c.id}
                    transform={`translate(${cx},${cy}) scale(${1 / k})`}
                    opacity={opacity}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => handleEnter(c.id)}
                    onMouseLeave={handleLeave}
                  >
                    <circle r={isOwn ? 22 : 15} fill="url(#glowGrad)" />
                    <circle r={isOwn ? 4.5 : 3.2} fill={isOwn ? '#fde68a' : '#fbbf24'} />
                    <circle r={isOwn ? 2 : 1.3} fill="#fffbeb" />
                    {isOwn && (
                      <circle r={8.5} fill="none" stroke="#f59e0b" strokeWidth={1.2} strokeDasharray="2.5 2.5" opacity={0.85} />
                    )}
                  </g>
                )
              })}
            </g>
          ))}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltipCandle && vb && (
        <CandleTooltip
          candle={tooltipCandle}
          now={now}
          vb={vb}
          size={size}
          onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current) }}
          onMouseLeave={handleLeave}
        />
      )}

      {/* 回到初始視角 */}
      {isAway && (
        <button
          onClick={reset}
          onPointerDown={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
          aria-label="回到初始視角"
          style={{
            position: 'absolute',
            left: 16,
            bottom: isMobile ? 96 : 24,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(6, 13, 31, 0.8)',
            border: '1px solid rgba(251, 191, 36, 0.25)',
            color: 'rgba(251, 191, 36, 0.75)',
            fontSize: 17,
            lineHeight: 1,
            cursor: 'pointer',
            backdropFilter: 'blur(6px)',
          }}
        >
          ⌖
        </button>
      )}
    </div>
  )
}

function CandleTooltip({ candle, now, vb, size, onMouseEnter, onMouseLeave }: {
  candle: Candle
  now: Date
  vb: { x: number; y: number; w: number; h: number }
  size: { w: number; h: number }
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const [wx0, wy] = project(candle.lat + candle.offsetLat, candle.lng + candle.offsetLng, WORLD_W, WORLD_H)
  // 環繞：取離視窗中心最近的那份拷貝
  const wx = wx0 + WORLD_W * Math.round((vb.x + vb.w / 2 - wx0) / WORLD_W)
  const sx = ((wx - vb.x) / vb.w) * size.w
  const sy = ((wy - vb.y) / vb.h) * size.h
  const minsLeft = Math.max(0, Math.round((candle.expiresAt - now.getTime()) / 60000))

  return (
    <div
      style={{
        position: 'absolute',
        left: sx,
        top: sy,
        transform: 'translate(-50%, calc(-100% - 18px))',
        zIndex: 10,
        touchAction: 'none',
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
        <div style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 500, marginBottom: candle.message ? 4 : 0, whiteSpace: 'nowrap' }}>
          {candle.city} · 還有 {minsLeft} 分鐘
        </div>
        {candle.message && (
          <div style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.4 }}>
            {candle.message}
          </div>
        )}
      </div>
      <div style={{
        position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
        borderTop: '6px solid rgba(251, 191, 36, 0.25)',
      }} />
    </div>
  )
}
