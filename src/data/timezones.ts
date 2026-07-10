import { TZ_TABLE, TZ_ALIAS, type TzCity } from './tzTable'

export type { TzCity }

/**
 * 由時區字串查代表城市座標。
 * 依序：直接命中 → 別名（舊名/CLDR 名）→ Etc/GMT±N 或 UTC 以偏移量推經度。
 * 查不到才回 undefined（呼叫端有海上 0,0 的最終退路，但正常不會走到）。
 */
export function getTzCity(tz: string): TzCity | undefined {
  const direct = TZ_TABLE[tz]
  if (direct) return direct

  const canonical = TZ_ALIAS[tz]
  if (canonical && TZ_TABLE[canonical]) return TZ_TABLE[canonical]

  // UTC / Etc/GMT±N：沒有真實城市，用偏移量放在對應經度上（IANA 的 Etc/GMT 正負號是相反的）
  if (tz === 'UTC' || tz === 'Etc/UTC' || tz === 'GMT') {
    return { city: 'UTC', lat: 0, lng: 0 }
  }
  const m = tz.match(/^Etc\/GMT([+-])(\d{1,2})$/)
  if (m) {
    const offset = (m[1] === '+' ? -1 : 1) * parseInt(m[2], 10)
    return { city: `UTC${offset >= 0 ? '+' : ''}${offset}`, lat: 0, lng: Math.max(-180, Math.min(180, offset * 15)) }
  }

  return undefined
}

export function getUserTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
