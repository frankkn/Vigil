import { useState, useEffect, useCallback } from 'react'
import WorldMap from './components/WorldMap'
import LightPanel from './components/LightPanel'
import { ensureSignedIn } from './lib/firebase'
import { lightCandle, subscribeCandles } from './lib/candles'
import { getUserTz } from './data/timezones'
import type { Candle } from './lib/types'

export default function App() {
  const [now, setNow] = useState(() => new Date())
  const [uid, setUid] = useState<string | null>(null)
  const [candles, setCandles] = useState<Candle[]>([])
  const [error, setError] = useState<string | null>(null)
  const [subKey, setSubKey] = useState(0)

  // 每秒 tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // 匿名登入（使用者無感）
  useEffect(() => {
    return ensureSignedIn(setUid, () => setError('連不上，燭光暫時看不見'))
  }, [])

  // 訂閱蠟燭；query 的過期粗篩會隨時間變舊，每 15 分鐘重建一次訂閱
  useEffect(() => {
    const unsub = subscribeCandles(
      cs => { setCandles(cs); setError(null) },
      () => setError('連不上，燭光暫時看不見'),
    )
    const refresh = setTimeout(() => setSubKey(k => k + 1), 15 * 60 * 1000)
    return () => { unsub(); clearTimeout(refresh) }
  }, [subKey])

  // 畫面上只留還亮著的
  const alive = candles.filter(c => c.expiresAt > now.getTime())
  const ownCandle = alive.find(c => c.id === uid) ?? null

  const handleLight = useCallback(async (message: string) => {
    if (!uid) return
    try {
      await lightCandle(uid, getUserTz(), message)
    } catch {
      setError('點燃失敗了，稍後再試')
    }
  }, [uid])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#060d1f', overflow: 'hidden' }}>
      {/* Map fills entire background */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <WorldMap candles={alive} ownCandleId={uid} now={now} />
      </div>

      {/* Top status */}
      <div
        style={{
          position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
          color: '#4b5563', fontSize: 13, letterSpacing: '0.05em', whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {error ? (
          <span style={{ color: '#6b7280' }}>{error}</span>
        ) : (
          <>此刻有 <span style={{ color: '#fbbf24' }}>{alive.length}</span> 根蠟燭亮著</>
        )}
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
        <LightPanel ownCandle={ownCandle} now={now} onLight={handleLight} disabled={!uid} />
      </div>
    </div>
  )
}
