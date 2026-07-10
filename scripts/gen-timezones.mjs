import { readFileSync, writeFileSync } from 'fs'

const SCRATCH = 'C:/Users/User/AppData/Local/Temp/claude/c--Users-User-Desktop-Vigil/42ec5a45-178f-4915-84f3-c18bbf262f48/scratchpad'

// 既有的繁體中文城市名（tz → 中文），保留這些好看的在地名稱
const ZH = {
  'Pacific/Midway': '中途島', 'Pacific/Honolulu': '火奴魯魯', 'America/Anchorage': '安克拉治',
  'America/Los_Angeles': '洛杉磯', 'America/Vancouver': '溫哥華', 'America/Denver': '丹佛',
  'America/Phoenix': '鳳凰城', 'America/Chicago': '芝加哥', 'America/Mexico_City': '墨西哥城',
  'America/New_York': '紐約', 'America/Toronto': '多倫多', 'America/Sao_Paulo': '聖保羅',
  'America/Argentina/Buenos_Aires': '布宜諾斯艾利斯', 'America/Santiago': '聖地牙哥',
  'America/Bogota': '波哥大', 'America/Lima': '利馬', 'America/Caracas': '卡拉卡斯',
  'Atlantic/Azores': '亞速爾', 'Atlantic/Reykjavik': '雷克雅維克', 'Europe/London': '倫敦',
  'Europe/Lisbon': '里斯本', 'Europe/Paris': '巴黎', 'Europe/Berlin': '柏林',
  'Europe/Amsterdam': '阿姆斯特丹', 'Europe/Madrid': '馬德里', 'Europe/Rome': '羅馬',
  'Europe/Stockholm': '斯德哥爾摩', 'Europe/Warsaw': '華沙', 'Europe/Athens': '雅典',
  'Europe/Helsinki': '赫爾辛基', 'Europe/Istanbul': '伊斯坦堡', 'Europe/Moscow': '莫斯科',
  'Africa/Cairo': '開羅', 'Africa/Lagos': '拉各斯', 'Africa/Nairobi': '奈洛比',
  'Africa/Johannesburg': '約翰尼斯堡', 'Asia/Dubai': '杜拜', 'Asia/Karachi': '喀拉蚩',
  'Asia/Kolkata': '加爾各答', 'Asia/Dhaka': '達卡', 'Asia/Yangon': '仰光', 'Asia/Bangkok': '曼谷',
  'Asia/Jakarta': '雅加達', 'Asia/Singapore': '新加坡', 'Asia/Kuala_Lumpur': '吉隆坡',
  'Asia/Ho_Chi_Minh': '胡志明市', 'Asia/Manila': '馬尼拉', 'Asia/Taipei': '台北',
  'Asia/Shanghai': '上海', 'Asia/Hong_Kong': '香港', 'Asia/Seoul': '首爾', 'Asia/Tokyo': '東京',
  'Asia/Ulaanbaatar': '烏蘭巴托', 'Asia/Almaty': '阿拉木圖', 'Asia/Tashkent': '塔什干',
  'Asia/Tehran': '德黑蘭', 'Asia/Riyadh': '利雅德', 'Asia/Jerusalem': '耶路撒冷',
  'Australia/Perth': '伯斯', 'Australia/Darwin': '達爾文', 'Australia/Brisbane': '布里斯本',
  'Australia/Sydney': '雪梨', 'Australia/Melbourne': '墨爾本', 'Pacific/Auckland': '奧克蘭',
  'Pacific/Fiji': '蘇瓦',
  // 補幾個常見大城的中文名
  'Europe/Kyiv': '基輔', 'Europe/Kiev': '基輔', 'Asia/Kabul': '喀布爾', 'Asia/Baghdad': '巴格達',
  'Asia/Beirut': '貝魯特', 'Asia/Colombo': '可倫坡', 'Asia/Kathmandu': '加德滿都',
  'Asia/Bangkok ': '曼谷', 'Europe/Brussels': '布魯塞爾', 'Europe/Vienna': '維也納',
  'Europe/Zurich': '蘇黎世', 'Europe/Oslo': '奧斯陸', 'Europe/Copenhagen': '哥本哈根',
  'Europe/Dublin': '都柏林', 'Europe/Prague': '布拉格', 'Europe/Budapest': '布達佩斯',
  'Europe/Bucharest': '布加勒斯特', 'America/Montevideo': '蒙特維多', 'America/La_Paz': '拉巴斯',
  'America/Guatemala': '瓜地馬拉市', 'Australia/Adelaide': '阿得雷德', 'Africa/Casablanca': '卡薩布蘭加',
  'Africa/Tunis': '突尼斯', 'Africa/Accra': '阿克拉', 'Africa/Algiers': '阿爾及爾',
  'Africa/Addis_Ababa': '阿迪斯阿貝巴', 'Asia/Jakarta ': '雅加達',
}

// ISO 6709 座標（±DDMM 或 ±DDMMSS）→ 十進位度
function parseCoord(s) {
  const m = s.match(/^([+-]\d{2,3})(\d{2})(\d{2})?([+-]\d{3,4})(\d{2})(\d{2})?$/)
  if (!m) return null
  const lat = (+m[1]) + Math.sign(+m[1]) * ((+m[2]) / 60 + (m[3] ? +m[3] : 0) / 3600)
  const lng = (+m[4]) + Math.sign(+m[4]) * ((+m[5]) / 60 + (m[6] ? +m[6] : 0) / 3600)
  return [Math.round(lat * 100) / 100, Math.round(lng * 100) / 100]
}

function cityFromTz(tz) {
  const seg = tz.split('/').pop().replace(/_/g, ' ')
  return seg
}

// 1) zone1970.tab → 每個 canonical 時區的座標
const zoneLines = readFileSync(`${SCRATCH}/zone1970.tab`, 'utf8').split('\n')
const table = {} // tz → { city, lat, lng }
for (const line of zoneLines) {
  if (!line || line.startsWith('#')) continue
  const [, coords, tz] = line.split('\t')
  const c = parseCoord(coords)
  if (!c || !tz) continue
  table[tz] = { city: ZH[tz] ?? cityFromTz(tz), lat: c[0], lng: c[1] }
}

// 2) backward → 別名（舊名/CLDR 名 → canonical），讓 alias 也查得到座標
const backLines = readFileSync(`${SCRATCH}/backward`, 'utf8').split('\n')
const alias = {} // aliasTz → canonicalTz
for (const line of backLines) {
  if (!line.startsWith('Link')) continue
  const parts = line.split(/\s+/)
  const target = parts[1]   // canonical
  const link = parts[2]     // alias
  if (target && link && table[target]) alias[link] = target
}

// 常見別名保險（有些瀏覽器回報這些）
const EXTRA_ALIAS = {
  'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Europe/Kiev': 'Europe/Kyiv', 'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'Asia/Rangoon': 'Asia/Yangon', 'Pacific/Ponape': 'Pacific/Pohnpei',
  'Atlantic/Faeroe': 'Atlantic/Faroe', 'Asia/Katmandu': 'Asia/Kathmandu',
}
for (const [a, t] of Object.entries(EXTRA_ALIAS)) {
  if (table[t]) alias[a] = t
}

// 若別名的中文名存在，讓 canonical 也採用（例如 Europe/Kiev 的中文補到 Europe/Kyiv）
for (const [a, t] of Object.entries(alias)) {
  if (ZH[a] && table[t] && !ZH[t]) table[t].city = ZH[a]
}

const out =
  `// 由 scripts/gen-timezones.mjs 從 IANA zone1970.tab + backward 產生，勿手改\n` +
  `export interface TzCity { city: string; lat: number; lng: number }\n\n` +
  `export const TZ_TABLE: Record<string, TzCity> = ${JSON.stringify(table, null, 0)};\n\n` +
  `export const TZ_ALIAS: Record<string, string> = ${JSON.stringify(alias, null, 0)};\n`

writeFileSync('./src/data/tzTable.ts', out, 'utf8')
console.log(`canonical zones: ${Object.keys(table).length}, aliases: ${Object.keys(alias).length}`)
