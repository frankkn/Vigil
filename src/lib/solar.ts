// Solar position math — no external deps

const DEG = Math.PI / 180

/** 正規化到 [-180, 180)；JS 的 % 對負數保留負號，需先 +540 再取模 */
function normLng(lng: number): number {
  return ((lng % 360) + 540) % 360 - 180
}

export function sunPosition(date: Date): { lat: number; lng: number } {
  const JD = date.getTime() / 86400000 + 2440587.5
  const n = JD - 2451545.0
  const L = (280.46 + 0.9856474 * n) % 360
  const g = (357.528 + 0.9856003 * n) * DEG
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG
  const epsilon = 23.439 * DEG
  const sunLat = Math.asin(Math.sin(epsilon) * Math.sin(lambda)) / DEG
  const GMST = (18.697374558 + 24.06570982441908 * n) % 24
  const sunLng = -(GMST * 15 - (Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda)) / DEG))
  return { lat: sunLat, lng: normLng(sunLng) }
}

/** 某地此刻的太陽高度角（度）。>0 白天，<0 夜晚 */
export function sunAltitude(lat: number, lng: number, date: Date): number {
  const s = sunPosition(date)
  const sin = Math.sin(lat * DEG) * Math.sin(s.lat * DEG) +
    Math.cos(lat * DEG) * Math.cos(s.lat * DEG) * Math.cos((lng - s.lng) * DEG)
  return Math.asin(Math.max(-1, Math.min(1, sin))) / DEG
}

/**
 * 「快天亮了」的暖光強度 [0,1]。
 * 只在日出前後、且太陽正在升起（早晨側）時浮現：從天光將明（約 -10°）漸強，
 * 到日出後不久（約 +5°）漸退。傍晚（太陽下降）不觸發——守夜等的是天亮，不是天黑。
 */
export function dawnIntensity(lat: number, lng: number, date: Date): number {
  const alt = sunAltitude(lat, lng, date)
  const altLater = sunAltitude(lat, lng, new Date(date.getTime() + 15 * 60000))
  if (altLater <= alt) return 0 // 太陽在下降 = 黃昏，不算
  if (alt <= -10 || alt >= 5) return 0
  // -10° → 0，-2° → 峰值 1，+5° → 0（不對稱的柔和隆起）
  return alt <= -2 ? (alt + 10) / 8 : 1 - (alt + 2) / 7
}
