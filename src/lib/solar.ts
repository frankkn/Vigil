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
