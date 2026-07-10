import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(app)
export const db = getFirestore(app)

// vite --mode emulator：連本機 emulator，不碰正式資料
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

/**
 * 匿名登入（使用者無感）。回傳 unsubscribe。
 * uid 準備好時呼叫 onReady(uid)；失敗時呼叫 onError。
 * 登入失敗（多為載入當下的暫時性網路問題）以退避重試，不需使用者重新整理。
 */
export function ensureSignedIn(
  onReady: (uid: string) => void,
  onError: (e: Error) => void,
): () => void {
  let cancelled = false
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0

  const trySignIn = () => {
    signInAnonymously(auth).catch((e: Error) => {
      if (cancelled) return
      onError(e)
      const delay = Math.min(30000, 1000 * 2 ** attempt) // 1s,2s,4s… 封頂 30s
      attempt++
      retryTimer = setTimeout(trySignIn, delay)
    })
  }

  const unsub = onAuthStateChanged(auth, user => {
    if (user) {
      attempt = 0
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
      onReady(user.uid)
    } else {
      trySignIn()
    }
  })

  return () => {
    cancelled = true
    if (retryTimer) clearTimeout(retryTimer)
    unsub()
  }
}
