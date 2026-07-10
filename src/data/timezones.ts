export interface TzCity {
  tz: string
  city: string
  lat: number
  lng: number
}

export const TZ_CITIES: TzCity[] = [
  { tz: 'Pacific/Midway', city: '中途島', lat: 28.2, lng: -177.4 },
  { tz: 'Pacific/Honolulu', city: '火奴魯魯', lat: 21.3, lng: -157.8 },
  { tz: 'America/Anchorage', city: '安克拉治', lat: 61.2, lng: -149.9 },
  { tz: 'America/Los_Angeles', city: '洛杉磯', lat: 34.1, lng: -118.2 },
  { tz: 'America/Vancouver', city: '溫哥華', lat: 49.2, lng: -123.1 },
  { tz: 'America/Denver', city: '丹佛', lat: 39.7, lng: -104.9 },
  { tz: 'America/Phoenix', city: '鳳凰城', lat: 33.4, lng: -112.1 },
  { tz: 'America/Chicago', city: '芝加哥', lat: 41.9, lng: -87.6 },
  { tz: 'America/Mexico_City', city: '墨西哥城', lat: 19.4, lng: -99.1 },
  { tz: 'America/New_York', city: '紐約', lat: 40.7, lng: -74.0 },
  { tz: 'America/Toronto', city: '多倫多', lat: 43.7, lng: -79.4 },
  { tz: 'America/Sao_Paulo', city: '聖保羅', lat: -23.5, lng: -46.6 },
  { tz: 'America/Buenos_Aires', city: '布宜諾斯艾利斯', lat: -34.6, lng: -58.4 },
  { tz: 'America/Santiago', city: '聖地牙哥', lat: -33.5, lng: -70.7 },
  { tz: 'America/Bogota', city: '波哥大', lat: 4.7, lng: -74.1 },
  { tz: 'America/Lima', city: '利馬', lat: -12.0, lng: -77.0 },
  { tz: 'America/Caracas', city: '卡拉卡斯', lat: 10.5, lng: -66.9 },
  { tz: 'Atlantic/Azores', city: '亞速爾', lat: 37.7, lng: -25.7 },
  { tz: 'Atlantic/Reykjavik', city: '雷克雅維克', lat: 64.1, lng: -21.9 },
  { tz: 'Europe/London', city: '倫敦', lat: 51.5, lng: -0.1 },
  { tz: 'Europe/Lisbon', city: '里斯本', lat: 38.7, lng: -9.1 },
  { tz: 'Europe/Paris', city: '巴黎', lat: 48.9, lng: 2.3 },
  { tz: 'Europe/Berlin', city: '柏林', lat: 52.5, lng: 13.4 },
  { tz: 'Europe/Amsterdam', city: '阿姆斯特丹', lat: 52.4, lng: 4.9 },
  { tz: 'Europe/Madrid', city: '馬德里', lat: 40.4, lng: -3.7 },
  { tz: 'Europe/Rome', city: '羅馬', lat: 41.9, lng: 12.5 },
  { tz: 'Europe/Stockholm', city: '斯德哥爾摩', lat: 59.3, lng: 18.1 },
  { tz: 'Europe/Warsaw', city: '華沙', lat: 52.2, lng: 21.0 },
  { tz: 'Europe/Athens', city: '雅典', lat: 38.0, lng: 23.7 },
  { tz: 'Europe/Helsinki', city: '赫爾辛基', lat: 60.2, lng: 24.9 },
  { tz: 'Europe/Istanbul', city: '伊斯坦堡', lat: 41.0, lng: 28.9 },
  { tz: 'Europe/Moscow', city: '莫斯科', lat: 55.8, lng: 37.6 },
  { tz: 'Africa/Cairo', city: '開羅', lat: 30.1, lng: 31.2 },
  { tz: 'Africa/Lagos', city: '拉各斯', lat: 6.5, lng: 3.4 },
  { tz: 'Africa/Nairobi', city: '奈洛比', lat: -1.3, lng: 36.8 },
  { tz: 'Africa/Johannesburg', city: '約翰尼斯堡', lat: -26.2, lng: 28.0 },
  { tz: 'Asia/Dubai', city: '杜拜', lat: 25.2, lng: 55.3 },
  { tz: 'Asia/Karachi', city: '喀拉蚩', lat: 24.9, lng: 67.0 },
  { tz: 'Asia/Kolkata', city: '孟買', lat: 19.1, lng: 72.9 },
  { tz: 'Asia/Dhaka', city: '達卡', lat: 23.7, lng: 90.4 },
  { tz: 'Asia/Yangon', city: '仰光', lat: 16.9, lng: 96.2 },
  { tz: 'Asia/Bangkok', city: '曼谷', lat: 13.8, lng: 100.5 },
  { tz: 'Asia/Jakarta', city: '雅加達', lat: -6.2, lng: 106.8 },
  { tz: 'Asia/Singapore', city: '新加坡', lat: 1.4, lng: 103.8 },
  { tz: 'Asia/Kuala_Lumpur', city: '吉隆坡', lat: 3.1, lng: 101.7 },
  { tz: 'Asia/Ho_Chi_Minh', city: '胡志明市', lat: 10.8, lng: 106.7 },
  { tz: 'Asia/Manila', city: '馬尼拉', lat: 14.6, lng: 121.0 },
  { tz: 'Asia/Taipei', city: '台北', lat: 25.0, lng: 121.6 },
  { tz: 'Asia/Shanghai', city: '上海', lat: 31.2, lng: 121.5 },
  { tz: 'Asia/Hong_Kong', city: '香港', lat: 22.3, lng: 114.2 },
  { tz: 'Asia/Seoul', city: '首爾', lat: 37.6, lng: 127.0 },
  { tz: 'Asia/Tokyo', city: '東京', lat: 35.7, lng: 139.7 },
  { tz: 'Asia/Ulaanbaatar', city: '烏蘭巴托', lat: 47.9, lng: 106.9 },
  { tz: 'Asia/Almaty', city: '阿拉木圖', lat: 43.3, lng: 77.0 },
  { tz: 'Asia/Tashkent', city: '塔什干', lat: 41.3, lng: 69.3 },
  { tz: 'Asia/Tehran', city: '德黑蘭', lat: 35.7, lng: 51.4 },
  { tz: 'Asia/Riyadh', city: '利雅德', lat: 24.7, lng: 46.7 },
  { tz: 'Asia/Jerusalem', city: '耶路撒冷', lat: 31.8, lng: 35.2 },
  { tz: 'Australia/Perth', city: '伯斯', lat: -31.9, lng: 115.9 },
  { tz: 'Australia/Darwin', city: '達爾文', lat: -12.5, lng: 130.8 },
  { tz: 'Australia/Brisbane', city: '布里斯本', lat: -27.5, lng: 153.0 },
  { tz: 'Australia/Sydney', city: '雪梨', lat: -33.9, lng: 151.2 },
  { tz: 'Australia/Melbourne', city: '墨爾本', lat: -37.8, lng: 145.0 },
  { tz: 'Pacific/Auckland', city: '奧克蘭', lat: -36.9, lng: 174.8 },
  { tz: 'Pacific/Fiji', city: '蘇瓦', lat: -18.1, lng: 178.4 },
]

export function getTzCity(tz: string): TzCity | undefined {
  return TZ_CITIES.find(c => c.tz === tz)
}

export function getUserTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
