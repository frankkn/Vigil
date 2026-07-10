import {
  collection, doc, onSnapshot, query, setDoc, where, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { getTzCity } from '../data/timezones'
import type { Candle } from './types'

const BURN_MS = 30 * 60 * 1000

/** [-1.5, 1.5] 的隨機散落偏移 */
function jitter(): number {
  return Math.round((Math.random() * 3 - 1.5) * 1000) / 1000
}

/**
 * 點燃（或重點）一根蠟燭。
 * 文件 ID = uid：一人一燭由結構保證；燒完前覆寫會被 rules 拒絕。
 */
export async function lightCandle(uid: string, tz: string, message: string): Promise<void> {
  const litAt = Timestamp.now()
  const data: Record<string, unknown> = {
    tz,
    litAt,
    expiresAt: Timestamp.fromMillis(litAt.toMillis() + BURN_MS),
    offsetLat: jitter(),
    offsetLng: jitter(),
  }
  const trimmed = message.trim()
  if (trimmed) data.message = trimmed.slice(0, 40)

  await setDoc(doc(db, 'candles', uid), data)
}

/**
 * 訂閱還亮著的蠟燭。
 * TTL 清檔有延遲，query 只是粗篩（訂閱當下未過期者）；
 * 呼叫端仍需每次 render 用 expiresAt > now 過濾。
 * 回傳 unsubscribe。
 */
export function subscribeCandles(
  onChange: (candles: Candle[]) => void,
  onError: (e: Error) => void,
): () => void {
  const q = query(
    collection(db, 'candles'),
    where('expiresAt', '>', Timestamp.now()),
  )
  return onSnapshot(q, snap => {
    const candles: Candle[] = snap.docs.map(d => {
      const data = d.data()
      const tz: string = data.tz
      const cityInfo = getTzCity(tz)
      return {
        id: d.id,
        tz,
        city: cityInfo?.city ?? tz,
        lat: cityInfo?.lat ?? 0,
        lng: cityInfo?.lng ?? 0,
        message: data.message,
        litAt: (data.litAt as Timestamp).toMillis(),
        expiresAt: (data.expiresAt as Timestamp).toMillis(),
        offsetLat: data.offsetLat,
        offsetLng: data.offsetLng,
      }
    })
    onChange(candles)
  }, onError)
}
