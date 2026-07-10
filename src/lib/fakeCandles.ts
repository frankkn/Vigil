export interface Candle {
  id: string
  tz: string
  city: string
  lat: number
  lng: number
  message?: string
  litAt: number       // ms timestamp
  expiresAt: number   // ms timestamp
  offsetLat: number
  offsetLng: number
  isOwn?: boolean
}

const NOW = Date.now()
const MIN = 60 * 1000

export const FAKE_CANDLES: Candle[] = [
  {
    id: 'fake-1', tz: 'Asia/Tokyo', city: '東京',
    lat: 35.7, lng: 139.7, message: '睡不著，聽著雨聲',
    litAt: NOW - 5 * MIN, expiresAt: NOW + 25 * MIN,
    offsetLat: 0.3, offsetLng: -0.8,
  },
  {
    id: 'fake-2', tz: 'Asia/Seoul', city: '首爾',
    lat: 37.6, lng: 127.0,
    litAt: NOW - 12 * MIN, expiresAt: NOW + 18 * MIN,
    offsetLat: -0.5, offsetLng: 0.4,
  },
  {
    id: 'fake-3', tz: 'Asia/Shanghai', city: '上海',
    lat: 31.2, lng: 121.5, message: '快天亮了',
    litAt: NOW - 20 * MIN, expiresAt: NOW + 10 * MIN,
    offsetLat: 0.9, offsetLng: -0.3,
  },
  {
    id: 'fake-4', tz: 'Asia/Taipei', city: '台北',
    lat: 25.0, lng: 121.6, message: '凌晨三點還是在加班',
    litAt: NOW - 3 * MIN, expiresAt: NOW + 27 * MIN,
    offsetLat: -0.2, offsetLng: 0.7,
  },
  {
    id: 'fake-5', tz: 'America/New_York', city: '紐約',
    lat: 40.7, lng: -74.0, message: 'can\'t sleep again',
    litAt: NOW - 8 * MIN, expiresAt: NOW + 22 * MIN,
    offsetLat: 0.6, offsetLng: -0.5,
  },
  {
    id: 'fake-6', tz: 'Europe/London', city: '倫敦',
    lat: 51.5, lng: -0.1,
    litAt: NOW - 15 * MIN, expiresAt: NOW + 15 * MIN,
    offsetLat: -0.4, offsetLng: 0.2,
  },
  {
    id: 'fake-7', tz: 'Europe/Paris', city: '巴黎',
    lat: 48.9, lng: 2.3, message: 'bonne nuit',
    litAt: NOW - 2 * MIN, expiresAt: NOW + 28 * MIN,
    offsetLat: 0.1, offsetLng: -0.6,
  },
]
