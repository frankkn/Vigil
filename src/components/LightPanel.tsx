import { useState, useEffect } from 'react'
import type { Candle } from '../lib/types'

interface Props {
  ownCandle: Candle | null
  now: Date
  onLight: (message: string) => Promise<void> | void
  disabled?: boolean
  isMobile: boolean
}

const MAX = 40
// 熄滅後多留一點「還在燒」的緩衝：伺服器時鐘可能略慢於本機，太早開放重點會被 rules 拒
const RELIGHT_GRACE_MS = 2000

export default function LightPanel({ ownCandle, now, onLight, disabled, isMobile }: Props) {
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [kbInset, setKbInset] = useState(0)

  // iOS 鍵盤彈出時 visualViewport 縮小，把貼底底欄往上頂，避免被鍵盤蓋住
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onChange = () => setKbInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    vv.addEventListener('resize', onChange)
    vv.addEventListener('scroll', onChange)
    onChange()
    return () => {
      vv.removeEventListener('resize', onChange)
      vv.removeEventListener('scroll', onChange)
    }
  }, [])

  const burning = !!ownCandle && now.getTime() < ownCandle.expiresAt + RELIGHT_GRACE_MS
  const minsLeft = ownCandle
    ? Math.max(0, Math.round((ownCandle.expiresAt - now.getTime()) / 60000))
    : 0
  const burnRatio = ownCandle
    ? Math.max(0, (ownCandle.expiresAt - now.getTime()) / (30 * 60 * 1000))
    : 0

  async function handleLight() {
    if (burning || disabled || pending) return
    const trimmed = [...message.trim()].slice(0, MAX).join('')
    setPending(true)
    try {
      await onLight(trimmed)
      setMessage('')
    } catch {
      // 失敗時保留使用者剛打的話（錯誤訊息已由上層顯示）
    } finally {
      setPending(false)
    }
  }

  const buttonLabel = pending ? '點燃中…' : ownCandle ? '再點一根' : '點燃蠟燭'

  const buttonStyle: React.CSSProperties = {
    padding: isMobile ? '9px 18px' : '9px 0',
    width: isMobile ? undefined : '100%',
    flexShrink: 0,
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
    whiteSpace: 'nowrap',
  }

  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: kbInset,
          zIndex: 20,
          background: 'rgba(6, 13, 31, 0.9)',
          borderTop: '1px solid rgba(251, 191, 36, 0.15)',
          borderRadius: '14px 14px 0 0',
          padding: kbInset > 0 ? '10px 14px' : '10px 14px calc(10px + env(safe-area-inset-bottom))',
          backdropFilter: 'blur(12px)',
          transition: 'bottom 0.15s ease-out',
        }}
      >
        {burning ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CandleFlame small />
              <span style={{ color: '#fbbf24', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
                還有 {minsLeft} 分鐘
              </span>
              <div style={{ flex: 1, height: 2, background: 'rgba(251, 191, 36, 0.15)', borderRadius: 1, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${burnRatio * 100}%`,
                  background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  transition: 'width 1s linear',
                }} />
              </div>
            </div>
            {ownCandle?.message && (
              <div style={{
                marginTop: 6, color: '#9ca3af', fontSize: 12, fontStyle: 'italic',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                「{ownCandle.message}」
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, MAX))}
                placeholder="留一句話（選填）"
                maxLength={MAX}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#e5e7eb',
                  fontSize: 14,
                  padding: '9px 10px',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button onClick={handleLight} disabled={disabled || pending} style={buttonStyle}>
                {buttonLabel}
              </button>
            </div>
            {message.length > 0 && (
              <div style={{ color: '#4b5563', fontSize: 11, textAlign: 'right', marginTop: 4 }}>
                {message.length}/{MAX}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // 桌面：右下浮動卡片
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
      {burning ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <CandleFlame />
            <div>
              <div style={{ color: '#fbbf24', fontSize: 13, fontWeight: 500 }}>蠟燭燃燒中</div>
              <div style={{ color: '#6b7280', fontSize: 12 }}>還有 {minsLeft} 分鐘</div>
            </div>
          </div>
          <div style={{ height: 2, background: 'rgba(251, 191, 36, 0.15)', borderRadius: 1, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${burnRatio * 100}%`,
              background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              borderRadius: 1,
              transition: 'width 1s linear',
            }} />
          </div>
          {ownCandle?.message && (
            <div style={{ marginTop: 10, color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
              「{ownCandle.message}」
            </div>
          )}
        </div>
      ) : (
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
            style={buttonStyle}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)')}
          >
            {buttonLabel}
          </button>
        </div>
      )}
    </div>
  )
}

function CandleFlame({ small }: { small?: boolean }) {
  return (
    <svg width={small ? 15 : 20} height={small ? 21 : 28} viewBox="0 0 20 28" fill="none">
      <ellipse cx="10" cy="24" rx="3" ry="1.5" fill="#92400e" opacity="0.6" />
      <rect x="8.5" y="16" width="3" height="8" rx="1.5" fill="#78350f" />
      <ellipse cx="10" cy="14" rx="5" ry="7" fill="#f59e0b" opacity="0.6" />
      <ellipse cx="10" cy="13" rx="3.5" ry="5.5" fill="#fbbf24" />
      <ellipse cx="10" cy="12" rx="2" ry="3.5" fill="#fde68a" />
      <ellipse cx="10" cy="11.5" rx="1" ry="1.8" fill="#fffbeb" />
    </svg>
  )
}
