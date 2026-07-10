// Equirectangular projection: lat/lng → [x, y] in [0..width, 0..height]
export function project(lat: number, lng: number, width: number, height: number): [number, number] {
  const x = ((lng + 180) / 360) * width
  const y = ((90 - lat) / 180) * height
  return [x, y]
}

export function unproject(x: number, y: number, width: number, height: number): [number, number] {
  const lng = (x / width) * 360 - 180
  const lat = 90 - (y / height) * 180
  return [lat, lng]
}
