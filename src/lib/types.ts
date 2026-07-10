export interface Candle {
  id: string          // Firestore doc id（= 點燃者的 uid）
  tz: string
  city: string        // 由 tz 對照表推得；未知時區顯示 tz 原字串
  lat: number
  lng: number
  message?: string
  litAt: number       // ms timestamp
  expiresAt: number   // ms timestamp
  offsetLat: number
  offsetLng: number
}
