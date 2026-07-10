import { readFileSync, writeFileSync } from 'fs'
import { feature } from 'topojson-client'

const topo = JSON.parse(readFileSync('./node_modules/world-atlas/land-110m.json', 'utf8'))
const land = feature(topo, topo.objects.land)

const W = 1000, H = 500

function projectCoord([lng, lat]) {
  const x = ((lng + 180) / 360) * W
  const y = ((90 - lat) / 180) * H
  return `${x.toFixed(2)},${y.toFixed(2)}`
}

function geoToPath(geo) {
  let d = ''
  for (const poly of geo.geometry.coordinates) {
    const rings = geo.geometry.type === 'MultiPolygon' ? poly : [poly]
    for (const ring of rings) {
      d += 'M' + ring.map(projectCoord).join('L') + 'Z'
    }
  }
  return d
}

let fullPath = ''
for (const feature of land.features) {
  fullPath += geoToPath(feature)
}

const output = `export const WORLD_PATH = ${JSON.stringify(fullPath)};\n`
writeFileSync('./src/data/worldPath.ts', output, 'utf8')
console.log('Generated worldPath.ts, size:', output.length, 'chars')
