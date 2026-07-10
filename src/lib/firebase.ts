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
 */
export function ensureSignedIn(
  onReady: (uid: string) => void,
  onError: (e: Error) => void,
): () => void {
  const unsub = onAuthStateChanged(auth, user => {
    if (user) {
      onReady(user.uid)
    } else {
      signInAnonymously(auth).catch(onError)
    }
  })
  return unsub
}
