import { readFileSync, writeFileSync } from 'fs'
import { feature, mesh } from 'topojson-client'

const W = 1000, H = 500

const landTopo = JSON.parse(readFileSync('./node_modules/world-atlas/land-110m.json', 'utf8'))
const countriesTopo = JSON.parse(readFileSync('./node_modules/world-atlas/countries-110m.json', 'utf8'))

function proj([lng, lat]) {
  return [((lng + 180) / 360) * W, ((90 - lat) / 180) * H]
}

function fmt([x, y]) {
  return `${x.toFixed(1)},${y.toFixed(1)}`
}

// 把跨越 ±180 經線的線段切開，避免水平橫線瑕疵
function splitAntimeridian(points) {
  const parts = []
  let cur = [points[0]]
  for (let i = 1; i < points.length; i++) {
    if (Math.abs(points[i][0] - points[i - 1][0]) > 180) {
      parts.push(cur)
      cur = []
    }
    cur.push(points[i])
  }
  parts.push(cur)
  return parts
}

function ringsToPath(rings, close) {
  let d = ''
  for (const ring of rings) {
    const parts = splitAntimeridian(ring)
    for (const part of parts) {
      if (part.length < 2) continue
      d += 'M' + part.map(p => fmt(proj(p))).join('L')
      if (close && parts.length === 1) d += 'Z'
    }
  }
  return d
}

function geometryRings(geom) {
  if (geom.type === 'Polygon') return geom.coordinates
  if (geom.type === 'MultiPolygon') return geom.coordinates.flat()
  return []
}

// --- 陸地輪廓 ---
const land = feature(landTopo, landTopo.objects.land)
let worldPath = ''
for (const f of land.features) {
  worldPath += ringsToPath(geometryRings(f.geometry), true)
}

// --- 國界（只取內部邊界，海岸線交給陸地輪廓）---
const borders = mesh(countriesTopo, countriesTopo.objects.countries, (a, b) => a !== b)
let borderPath = ''
for (const line of borders.coordinates) {
  borderPath += ringsToPath([line], false)
}

// --- 國名標籤 ---
const ZH_NAMES = {
  'Russia': '俄羅斯', 'Canada': '加拿大', 'United States of America': '美國',
  'China': '中國', 'Brazil': '巴西', 'Australia': '澳洲', 'India': '印度',
  'Argentina': '阿根廷', 'Kazakhstan': '哈薩克', 'Algeria': '阿爾及利亞',
  'Dem. Rep. Congo': '剛果', 'Greenland': '格陵蘭', 'Saudi Arabia': '沙烏地阿拉伯',
  'Mexico': '墨西哥', 'Indonesia': '印尼', 'Sudan': '蘇丹', 'Libya': '利比亞',
  'Iran': '伊朗', 'Mongolia': '蒙古', 'Peru': '秘魯', 'Chad': '查德',
  'Niger': '尼日', 'Angola': '安哥拉', 'Mali': '馬利', 'South Africa': '南非',
  'Colombia': '哥倫比亞', 'Ethiopia': '衣索比亞', 'Bolivia': '玻利維亞',
  'Mauritania': '茅利塔尼亞', 'Egypt': '埃及', 'Tanzania': '坦尚尼亞',
  'Nigeria': '奈及利亞', 'Venezuela': '委內瑞拉', 'Namibia': '納米比亞',
  'Mozambique': '莫三比克', 'Pakistan': '巴基斯坦', 'Turkey': '土耳其',
  'Chile': '智利', 'Zambia': '尚比亞', 'Myanmar': '緬甸', 'Afghanistan': '阿富汗',
  'Somalia': '索馬利亞', 'Central African Rep.': '中非', 'S. Sudan': '南蘇丹',
  'Ukraine': '烏克蘭', 'Madagascar': '馬達加斯加', 'Botswana': '波札那',
  'Kenya': '肯亞', 'France': '法國', 'Yemen': '葉門', 'Thailand': '泰國',
  'Spain': '西班牙', 'Turkmenistan': '土庫曼', 'Cameroon': '喀麥隆',
  'Papua New Guinea': '巴布亞紐幾內亞', 'Sweden': '瑞典', 'Uzbekistan': '烏茲別克',
  'Morocco': '摩洛哥', 'Iraq': '伊拉克', 'Paraguay': '巴拉圭', 'Zimbabwe': '辛巴威',
  'Japan': '日本', 'Germany': '德國', 'Congo': '剛果共和國', 'Finland': '芬蘭',
  'Vietnam': '越南', 'Malaysia': '馬來西亞', 'Norway': '挪威', 'Poland': '波蘭',
  "Côte d'Ivoire": '象牙海岸', 'Oman': '阿曼', 'Italy': '義大利',
  'Philippines': '菲律賓', 'Ecuador': '厄瓜多', 'Burkina Faso': '布吉納法索',
  'New Zealand': '紐西蘭', 'Gabon': '加彭', 'Guinea': '幾內亞',
  'United Kingdom': '英國', 'Ghana': '迦納', 'Romania': '羅馬尼亞', 'Laos': '寮國',
  'Uganda': '烏干達', 'Guyana': '蓋亞那', 'Belarus': '白俄羅斯',
  'Kyrgyzstan': '吉爾吉斯', 'Senegal': '塞內加爾', 'Syria': '敘利亞',
  'Cambodia': '柬埔寨', 'Uruguay': '烏拉圭', 'Suriname': '蘇利南',
  'Tunisia': '突尼西亞', 'Bangladesh': '孟加拉', 'Nepal': '尼泊爾',
  'Tajikistan': '塔吉克', 'Greece': '希臘', 'Nicaragua': '尼加拉瓜',
  'North Korea': '北韓', 'South Korea': '南韓', 'Malawi': '馬拉威',
  'Eritrea': '厄利垂亞', 'Benin': '貝南', 'Honduras': '宏都拉斯',
  'Liberia': '賴比瑞亞', 'Bulgaria': '保加利亞', 'Cuba': '古巴',
  'Guatemala': '瓜地馬拉', 'Iceland': '冰島', 'Hungary': '匈牙利',
  'Portugal': '葡萄牙', 'Jordan': '約旦', 'Azerbaijan': '亞塞拜然',
  'Austria': '奧地利', 'United Arab Emirates': '阿聯', 'Czechia': '捷克',
  'Serbia': '塞爾維亞', 'Panama': '巴拿馬', 'Ireland': '愛爾蘭',
  'Georgia': '喬治亞', 'Sri Lanka': '斯里蘭卡', 'Croatia': '克羅埃西亞',
  'Costa Rica': '哥斯大黎加', 'Slovakia': '斯洛伐克', 'Denmark': '丹麥',
  'Netherlands': '荷蘭', 'Switzerland': '瑞士', 'Taiwan': '台灣',
  'Belgium': '比利時', 'Israel': '以色列', 'Moldova': '摩爾多瓦',
  'Fiji': '斐濟', 'Kuwait': '科威特', 'Armenia': '亞美尼亞', 'Qatar': '卡達',
  'Jamaica': '牙買加', 'Lebanon': '黎巴嫩', 'Cyprus': '賽普勒斯',
  'Haiti': '海地', 'Dominican Rep.': '多明尼加', 'Bhutan': '不丹',
  'Lithuania': '立陶宛', 'Latvia': '拉脫維亞', 'Estonia': '愛沙尼亞',
  'Albania': '阿爾巴尼亞', 'Solomon Is.': '索羅門群島', 'Vanuatu': '萬那杜',
  'Timor-Leste': '東帝汶', 'Brunei': '汶萊', 'Rwanda': '盧安達',
  'Djibouti': '吉布地', 'Lesotho': '賴索托', 'Eswatini': '史瓦帝尼',
  'Bosnia and Herz.': '波士尼亞', 'North Macedonia': '北馬其頓',
  'Slovenia': '斯洛維尼亞', 'Montenegro': '蒙特內哥羅', 'Kosovo': '科索沃',
  'El Salvador': '薩爾瓦多', 'Belize': '貝里斯', 'Togo': '多哥',
  'Sierra Leone': '獅子山', 'W. Sahara': '西撒哈拉', 'Guinea-Bissau': '幾內亞比索',
  'Eq. Guinea': '赤道幾內亞', 'Gambia': '甘比亞', 'Luxembourg': '盧森堡',
  'Palestine': '巴勒斯坦', 'Bahamas': '巴哈馬', 'Trinidad and Tobago': '千里達',
  'Puerto Rico': '波多黎各', 'New Caledonia': '新喀里多尼亞',
}

// 一定要有的（面積排不進前段但重要）
const FORCE_INCLUDE = new Set([
  'Taiwan', 'South Korea', 'North Korea', 'Bangladesh', 'Nepal', 'Cambodia',
  'Sri Lanka', 'Israel', 'Jordan', 'United Arab Emirates', 'Azerbaijan',
  'Georgia', 'Portugal', 'Czechia', 'Austria', 'Switzerland', 'Netherlands',
  'Denmark', 'Ireland', 'Greece', 'Serbia', 'Bulgaria', 'Hungary', 'Iceland',
  'Cuba', 'Uruguay', 'Tunisia',
])
const EXCLUDE = new Set(['Antarctica', 'Fr. S. Antarctic Lands'])

// 取國家最大的一個 ring，算它的平面重心（經度跨 180 時先平移再算）
function largestRingCentroid(geom) {
  let best = null
  for (const ring of geometryRings(geom)) {
    const lngs = ring.map(p => p[0])
    const crosses = Math.max(...lngs) - Math.min(...lngs) > 180
    const pts = ring.map(([lng, lat]) => [crosses && lng < 0 ? lng + 360 : lng, lat])
    let a = 0, cx = 0, cy = 0
    for (let i = 0; i < pts.length - 1; i++) {
      const cross = pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
      a += cross
      cx += (pts[i][0] + pts[i + 1][0]) * cross
      cy += (pts[i][1] + pts[i + 1][1]) * cross
    }
    a /= 2
    if (!best || Math.abs(a) > Math.abs(best.area)) {
      let lng = cx / (6 * a)
      if (lng > 180) lng -= 360
      best = { area: Math.abs(a), lng, lat: cy / (6 * a) }
    }
  }
  return best
}

const countries = feature(countriesTopo, countriesTopo.objects.countries).features
const ranked = countries
  .map(f => ({ name: f.properties.name, c: largestRingCentroid(f.geometry) }))
  .filter(x => x.c && !EXCLUDE.has(x.name))
  .sort((a, b) => b.c.area - a.c.area)

const missing = []
const labels = []
ranked.forEach((x, rank) => {
  if (rank < 80 || FORCE_INCLUDE.has(x.name)) {
    const zh = ZH_NAMES[x.name]
    if (!zh) missing.push(x.name)
    const [px, py] = proj([x.c.lng, x.c.lat])
    labels.push({
      name: zh ?? x.name,
      x: Math.round(px * 10) / 10,
      y: Math.round(py * 10) / 10,
      big: rank < 30,
    })
  }
})

const output =
  `export const WORLD_PATH = ${JSON.stringify(worldPath)};\n\n` +
  `export const BORDER_PATH = ${JSON.stringify(borderPath)};\n\n` +
  `export interface CountryLabel { name: string; x: number; y: number; big: boolean }\n\n` +
  `export const COUNTRY_LABELS: CountryLabel[] = ${JSON.stringify(labels)};\n`

writeFileSync('./src/data/worldPath.ts', output, 'utf8')
console.log(`worldPath.ts: land ${worldPath.length} chars, borders ${borderPath.length} chars, ${labels.length} labels`)
if (missing.length) console.log('缺中文名（顯示英文）:', missing.join(', '))
