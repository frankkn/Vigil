// Solar position math — no external deps
// Returns whether a given lat/lng is in the night side of Earth

const DEG = Math.PI / 180

function sunPosition(date: Date): { lat: number; lng: number } {
  const JD = date.getTime() / 86400000 + 2440587.5
  const n = JD - 2451545.0
  const L = (280.46 + 0.9856474 * n) % 360
  const g = (357.528 + 0.9856003 * n) * DEG
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG
  const epsilon = 23.439 * DEG
  const sunLat = Math.asin(Math.sin(epsilon) * Math.sin(lambda)) / DEG
  const GMST = (18.697374558 + 24.06570982441908 * n) % 24
  const sunLng = -(GMST * 15 - (Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda)) / DEG))
  return { lat: sunLat, lng: ((sunLng + 180) % 360) - 180 }
}

export function isNight(lat: number, lng: number, date: Date): boolean {
  const sun = sunPosition(date)
  // Spherical dot product between point and sub-solar point
  const cosAngle = Math.sin(lat * DEG) * Math.sin(sun.lat * DEG) +
    Math.cos(lat * DEG) * Math.cos(sun.lat * DEG) * Math.cos((lng - sun.lng) * DEG)
  return cosAngle < 0
}

export { sunPosition }

// Build a set of polygon points tracing the terminator line
export function terminatorPoints(date: Date, steps = 360): [number, number][] {
  const sun = sunPosition(date)
  const points: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const lng = -180 + (360 * i) / steps
    const lngRad = (lng - sun.lng) * DEG
    const lat = Math.atan(-Math.cos(lngRad) / Math.tan(sun.lat * DEG)) / DEG
    points.push([lat, lng])
  }
  return points
}
