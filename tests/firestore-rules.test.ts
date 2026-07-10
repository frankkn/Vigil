import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, setDoc, getDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'

const PROJECT_ID = 'vigil-cc881'
const UID = 'alice'
const MIN = 60 * 1000

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

/** 一份合法的蠟燭資料（litAt = 現在、expiresAt = +30 分） */
function validCandle(overrides: Record<string, unknown> = {}) {
  const litAt = Timestamp.now()
  return {
    tz: 'Asia/Taipei',
    message: '凌晨三點，還醒著',
    litAt,
    expiresAt: Timestamp.fromMillis(litAt.toMillis() + 30 * MIN),
    offsetLat: 0.7,
    offsetLng: -1.2,
    ...overrides,
  }
}

function candleDoc(env: RulesTestEnvironment, asUid: string | null, docId = UID) {
  const ctx = asUid ? env.authenticatedContext(asUid) : env.unauthenticatedContext()
  return doc(ctx.firestore(), 'candles', docId)
}

/** 直接以管理身份塞一根蠟燭（繞過 rules），用來佈置前置狀態 */
async function seedCandle(litAtMs: number) {
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'candles', UID), {
      tz: 'Asia/Taipei',
      litAt: Timestamp.fromMillis(litAtMs),
      expiresAt: Timestamp.fromMillis(litAtMs + 30 * MIN),
      offsetLat: 0,
      offsetLng: 0,
    })
  })
}

describe('create（點燃）', () => {
  it('登入者用自己的 uid 點燃合法蠟燭 → 放行', async () => {
    await assertSucceeds(setDoc(candleDoc(testEnv, UID), validCandle()))
  })

  it('不留話（省略 message）→ 放行', async () => {
    const { message: _drop, ...rest } = validCandle()
    await assertSucceeds(setDoc(candleDoc(testEnv, UID), rest))
  })

  it('未登入 → 拒絕', async () => {
    await assertFails(setDoc(candleDoc(testEnv, null), validCandle()))
  })

  it('文件 ID 不是自己的 uid（幫別人點）→ 拒絕', async () => {
    await assertFails(setDoc(candleDoc(testEnv, UID, 'bob'), validCandle()))
  })

  it('多塞未知欄位 → 拒絕', async () => {
    await assertFails(setDoc(candleDoc(testEnv, UID), validCandle({ nickname: '夜貓' })))
  })
})

describe('重點時機（update）', () => {
  it('燒完前覆寫 → 拒絕', async () => {
    await seedCandle(Date.now() - 10 * MIN) // 還剩 20 分鐘
    await assertFails(setDoc(candleDoc(testEnv, UID), validCandle()))
  })

  it('燒完後覆寫 → 放行', async () => {
    await seedCandle(Date.now() - 31 * MIN) // 已燒完 1 分鐘
    await assertSucceeds(setDoc(candleDoc(testEnv, UID), validCandle()))
  })
})

describe('message 上限', () => {
  it('40 字 → 放行', async () => {
    await assertSucceeds(setDoc(candleDoc(testEnv, UID), validCandle({ message: '守'.repeat(40) })))
  })

  it('41 字 → 拒絕', async () => {
    await assertFails(setDoc(candleDoc(testEnv, UID), validCandle({ message: '守'.repeat(41) })))
  })

  it('message 不是字串 → 拒絕', async () => {
    await assertFails(setDoc(candleDoc(testEnv, UID), validCandle({ message: 12345 })))
  })
})

describe('不可 delete', () => {
  it('燃燒中刪除自己的蠟燭 → 拒絕', async () => {
    await seedCandle(Date.now() - 5 * MIN)
    await assertFails(deleteDoc(candleDoc(testEnv, UID)))
  })

  it('燒完後刪除也一樣 → 拒絕（交給 TTL）', async () => {
    await seedCandle(Date.now() - 40 * MIN)
    await assertFails(deleteDoc(candleDoc(testEnv, UID)))
  })
})

describe('tz 合法性', () => {
  it('常見 IANA 時區 → 放行', async () => {
    for (const tz of ['Asia/Taipei', 'America/Argentina/Buenos_Aires', 'Etc/GMT+8', 'UTC']) {
      await testEnv.clearFirestore()
      await assertSucceeds(setDoc(candleDoc(testEnv, UID), validCandle({ tz })))
    }
  })

  it('非字串 / 亂字串 / 空字串 → 拒絕', async () => {
    for (const tz of [42, 'not a timezone!!!', '', '<script>alert(1)</script>', 'A'.repeat(41)]) {
      await assertFails(setDoc(candleDoc(testEnv, UID), validCandle({ tz })))
    }
  })
})

describe('expiresAt 必須剛好 = litAt + 30 分鐘', () => {
  it('+29 分鐘 → 拒絕', async () => {
    const litAt = Timestamp.now()
    await assertFails(setDoc(candleDoc(testEnv, UID), validCandle({
      litAt, expiresAt: Timestamp.fromMillis(litAt.toMillis() + 29 * MIN),
    })))
  })

  it('+31 分鐘 → 拒絕', async () => {
    const litAt = Timestamp.now()
    await assertFails(setDoc(candleDoc(testEnv, UID), validCandle({
      litAt, expiresAt: Timestamp.fromMillis(litAt.toMillis() + 31 * MIN),
    })))
  })

  it('缺 expiresAt → 拒絕', async () => {
    const { expiresAt: _drop, ...rest } = validCandle()
    await assertFails(setDoc(candleDoc(testEnv, UID), rest))
  })

  it('litAt 偏離現在超過 2 分鐘（偽造時間）→ 拒絕', async () => {
    for (const skewMs of [-10 * MIN, 10 * MIN]) {
      const litAt = Timestamp.fromMillis(Date.now() + skewMs)
      await assertFails(setDoc(candleDoc(testEnv, UID), validCandle({
        litAt, expiresAt: Timestamp.fromMillis(litAt.toMillis() + 30 * MIN),
      })))
    }
  })
})

describe('offsetLat / offsetLng 範圍', () => {
  it('邊界值 ±1.5 → 放行', async () => {
    await assertSucceeds(setDoc(candleDoc(testEnv, UID), validCandle({ offsetLat: 1.5, offsetLng: -1.5 })))
  })

  it('超出 ±1.5 → 拒絕', async () => {
    await assertFails(setDoc(candleDoc(testEnv, UID), validCandle({ offsetLat: 1.6 })))
    await assertFails(setDoc(candleDoc(testEnv, UID), validCandle({ offsetLng: -1.6 })))
  })

  it('不是 number → 拒絕', async () => {
    await assertFails(setDoc(candleDoc(testEnv, UID), validCandle({ offsetLat: '0.5' })))
  })

  it('缺 offset 欄位 → 拒絕', async () => {
    const { offsetLat: _drop, ...rest } = validCandle()
    await assertFails(setDoc(candleDoc(testEnv, UID), rest))
  })
})

describe('read 對所有人開放', () => {
  it('未登入也能看見燭光', async () => {
    await seedCandle(Date.now() - 5 * MIN)
    await assertSucceeds(getDoc(candleDoc(testEnv, null)))
  })
})
