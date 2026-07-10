import { useState, useEffect, useCallback } from 'react'
import WorldMap from './components/WorldMap'
import LightPanel from './components/LightPanel'
import { FAKE_CANDLES, type Candle } from './lib/fakeCandles'
import { getUserTz, getTzCity } from './data/timezones'

const UID = 'local-user'
const BURN_MS = 30 * 60 * 1000

function jitter(): number {
  return (Math.random() - 0.5) * 3  // [-1.5, 1.5]
}

export default function App() {
  const [now, setNow] = useState(() => new Date())
  const [candles, setCandles] = useState<Candle[]>(FAKE_CANDLES)
  const [ownCandleId, setOwnCandleId] = useState<string | null>(null)

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Remove expired candles
  useEffect(() => {
    setCandles(prev => prev.filter(c => c.expiresAt > now.getTime()))
  }, [now])

  const ownCandle = candles.find(c => c.id === ownCandleId && c.expiresAt > now.getTime()) ?? null

  const handleLight = useCallback((message: string) => {
    const tz = getUserTz()
    const tzCity = getTzCity(tz)
    const litAt = now.getTime()
    const expiresAt = litAt + BURN_MS

    const newCandle: Candle = {
      id: UID,
      tz,
      city: tzCity?.city ?? tz,
      lat: tzCity?.lat ?? 0,
      lng: tzCity?.lng ?? 0,
      message: message || undefined,
      litAt,
      expiresAt,
      offsetLat: jitter(),
      offsetLng: jitter(),
      isOwn: true,
    }

    setCandles(prev => {
      const without = prev.filter(c => c.id !== UID)
      return [...without, newCandle]
    })
    setOwnCandleId(UID)
  }, [now])

  const activeCount = candles.filter(c => c.expiresAt > now.getTime()).length

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#060d1f', overflow: 'hidden' }}>
      {/* Map fills entire background */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <WorldMap candles={candles} ownCandleId={ownCandleId} now={now} />
      </div>

      {/* Top status */}
      <div
        style={{
          position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
          color: '#4b5563', fontSize: 13, letterSpacing: '0.05em', whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        此刻有{' '}
        <span style={{ color: '#fbbf24' }}>{activeCount}</span>
        {' '}根蠟燭亮著
      </div>

      {/* Title */}
      <div style={{
        position: 'absolute', top: 24, left: 28,
        color: 'rgba(251, 191, 36, 0.6)', fontSize: 15, fontWeight: 400, letterSpacing: '0.1em',
        pointerEvents: 'none',
      }}>
        守夜
      </div>

      {/* Control panel — bottom right */}
      <div style={{ position: 'absolute', bottom: 32, right: 28 }}>
        <LightPanel ownCandle={ownCandle} now={now} onLight={handleLight} />
      </div>
    </div>
  )
}
