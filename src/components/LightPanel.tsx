import { useState } from 'react'
import type { Candle } from '../lib/types'

interface Props {
  ownCandle: Candle | null
  now: Date
  onLight: (message: string) => Promise<void> | void
  disabled?: boolean
}

export default function LightPanel({ ownCandle, now, onLight, disabled }: Props) {
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const MAX = 40

  const minsLeft = ownCandle
    ? Math.max(0, Math.round((ownCandle.expiresAt - now.getTime()) / 60000))
    : 0
  const burnRatio = ownCandle
    ? Math.max(0, (ownCandle.expiresAt - now.getTime()) / (30 * 60 * 1000))
    : 0

  const canRelight = !ownCandle || now.getTime() >= ownCandle.expiresAt

  async function handleLight() {
    if (!canRelight || disabled || pending) return
    const trimmed = message.trim().slice(0, MAX)
    setPending(true)
    try {
      await onLight(trimmed)
      setMessage('')
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      style={{
        background: 'rgba(6, 13, 31, 0.88)',
        border: '1px solid rgba(251, 191, 36, 0.15)',
        borderRadius: '12px',
        padding: '16px 20px',
        backdropFilter: 'blur(12px)',
        width: '280px',
      }}
    >
      {ownCandle && now.getTime() < ownCandle.expiresAt ? (
        // Burning state
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <CandleFlame />
            <div>
              <div style={{ color: '#fbbf24', fontSize: 13, fontWeight: 500 }}>蠟燭燃燒中</div>
              <div style={{ color: '#6b7280', fontSize: 12 }}>還有 {minsLeft} 分鐘</div>
            </div>
          </div>
          {/* Burn progress bar */}
          <div style={{
            height: 2, background: 'rgba(251, 191, 36, 0.15)', borderRadius: 1, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${burnRatio * 100}%`,
              background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              borderRadius: 1,
              transition: 'width 1s linear',
            }} />
          </div>
          {ownCandle.message && (
            <div style={{ marginTop: 10, color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
              「{ownCandle.message}」
            </div>
          )}
        </div>
      ) : (
        // Light state
        <div>
          <div style={{ marginBottom: 10 }}>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, MAX))}
              placeholder="留一句話（選填）"
              maxLength={MAX}
              rows={2}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#e5e7eb',
                fontSize: 13,
                padding: '8px 10px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
            />
            <div style={{ color: '#4b5563', fontSize: 11, textAlign: 'right', marginTop: 2 }}>
              {message.length}/{MAX}
            </div>
          </div>
          <button
            onClick={handleLight}
            disabled={disabled || pending}
            style={{
              width: '100%',
              padding: '9px 0',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(251, 191, 36, 0.4)',
              borderRadius: 8,
              color: '#fbbf24',
              fontSize: 14,
              fontWeight: 500,
              cursor: disabled || pending ? 'default' : 'pointer',
              opacity: disabled || pending ? 0.5 : 1,
              letterSpacing: '0.02em',
              transition: 'background 0.2s, opacity 0.3s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)')}
          >
            {pending ? '點燃中…' : ownCandle ? '再點一根' : '點燃蠟燭'}
          </button>
        </div>
      )}
    </div>
  )
}

function CandleFlame() {
  return (
    <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
      <ellipse cx="10" cy="24" rx="3" ry="1.5" fill="#92400e" opacity="0.6" />
      <rect x="8.5" y="16" width="3" height="8" rx="1.5" fill="#78350f" />
      <ellipse cx="10" cy="14" rx="5" ry="7" fill="#f59e0b" opacity="0.6" />
      <ellipse cx="10" cy="13" rx="3.5" ry="5.5" fill="#fbbf24" />
      <ellipse cx="10" cy="12" rx="2" ry="3.5" fill="#fde68a" />
      <ellipse cx="10" cy="11.5" rx="1" ry="1.8" fill="#fffbeb" />
      <style>{`
        @keyframes flicker {
          0%,100% { transform: scaleX(1) scaleY(1); }
          25% { transform: scaleX(0.95) scaleY(1.04); }
          75% { transform: scaleX(1.05) scaleY(0.97); }
        }
        .flame { animation: flicker 2.5s ease-in-out infinite; transform-origin: 10px 22px; }
      `}</style>
    </svg>
  )
}
