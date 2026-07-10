# Vigil 守夜 — 產品規格與開發準則

## 這是什麼

凌晨睡不著的時候，打開它，點一根蠟燭，可以留一句話。畫面上是一張顯示著地球夜面的世界地圖，你能看到此刻全世界還有幾根蠟燭亮著、亮在哪些城市、有些燭光旁飄著一句短短的話——幾個和你一樣醒著的陌生人。沒有聊天、沒有身份、沒有回覆。只有「你不是一個人醒著」。

核心哲學：陪伴的最小單位是「知道有人在」。一句話是上限，對話就是打擾。

---

## 產品規則（不可妥協）

1. 一次點擊點燃蠟燭，燃燒 30 分鐘後自動熄滅。燃燒中不可提前熄滅、不可延長；燒完之後可以再點一根新的（新的 30 分鐘、新的一句話）——守一整夜是被允許的，但每一根蠟燭都有自己完整的生滅。
2. 一人同時只能有一根蠟燭（文件 ID = uid 強制；重點 = 前一根過期後才可覆寫）。
3. 點燃時可以「留一句話」（選填，上限 40 字，純文字）。這句話跟蠟燭同生共死：蠟燭熄滅即消失，不進任何歷史、不可編輯、不可回覆。
4. 位置只到時區城市級（用 `Intl` API 的 `timeZone`，如 `Asia/Taipei`）——零 GPS、零 IP 查詢、零權限彈窗。隱私承諾：我們不知道你在哪，只知道你的深夜屬於哪個時區。
5. 沒有帳號（Firebase 匿名登入，使用者無感）、沒有名字、沒有歷史紀錄、沒有任何回覆機制。
6. 世界地圖即時顯示晨昏線（夜面陰影，純太陽位置數學），燭光只會自然出現在夜面。

---

## UI

- 單一畫面：夜面世界地圖 + 燭光 + 一個「點燃」按鈕（旁邊一個選填的一句話輸入框）+ 一行字「此刻有 N 根蠟燭亮著」
- 點/懸停別人的燭光，輕輕浮現那句話與城市名（如「台北 · 還有 12 分鐘」）；沒留話就只有城市名
- 自己的蠟燭有細微標記與剩餘燃燒動畫；燒完後按鈕回到「再點一根」
- 深夜配色，動畫要慢、要安靜；新蠟燭亮起時用極輕的淡入，不用任何音效或彈跳

---

## 架構

**前端**
- Vite + React + TypeScript + Tailwind CSS
- 地圖：內嵌 SVG 世界輪廓 + 時區→代表座標的靜態 JSON 對照表，不用任何地圖庫
- 晨昏線：純太陽位置數學計算，無外部依賴

**後端**
- Firebase Anonymous Auth
- Firestore

**資料模型**

```
candles/{uid} = {
  tz:         string,     // e.g. "Asia/Taipei"
  message?:   string,     // optional, max 40 chars
  litAt:      Timestamp,
  expiresAt:  Timestamp,  // litAt + 30 minutes
  offsetLat:  number,     // random jitter, range [-1.5, 1.5] degrees
  offsetLng:  number      // random jitter, range [-1.5, 1.5] degrees
}
```

`offsetLat` / `offsetLng` 在點燃時由前端產生並寫入，用途是讓同時區的多根蠟燭在地圖上自然散落而不完全重疊。偏移量在蠟燭整個生命週期固定不變；重點時會隨新蠟燭重新隨機。

**Security Rules 強制條件**

- `create`：`litAt == request.time`、`expiresAt == litAt + 30min`、`tz` 為合法時區字串、`message` 若存在則為 `string` 且長度 <= 40、`offsetLat` 與 `offsetLng` 為 number 且絕對值 <= 1.5
- `update`：僅允許「重點（覆寫）」——`resource.data.expiresAt <= request.time`（前一根已燒完）且新資料滿足 `create` 的全部條件；燃燒中的蠟燭任何欄位都不可動
- `delete: false`（不可提前熄滅）
- `read`：對所有人開放

> **實作備註（時鐘偏差）**：`litAt == request.time` 精確成立需要 `serverTimestamp()`，但那樣客戶端算不出 `expiresAt = litAt + 30min`（不知道伺服器精確時間），兩個條件無法同時精確滿足——這是 Firestore rules 的已知限制。實際 rules：`expiresAt == litAt + 30min` **精確強制**（核心不變量：不可延長），`litAt` 允許落在 `request.time ± 2 分鐘`（容忍客戶端時鐘偏差）。最壞情況是時鐘快 2 分鐘的人的蠟燭在他人眼中燒 32 分鐘；不可能永生、不可能延長。

**Firestore TTL policy** 清過期文件（欄位：`expiresAt`，需在 Console 手動設定一次）；前端 `onSnapshot` 訂閱 + 以 `expiresAt` 過濾（TTL 清檔有延遲，客戶端過濾是顯示正確性的真正防線）。

---

## Rules 測試（@firebase/rules-unit-testing）

跑法：`npm run test:rules`（會自動起 Firestore emulator，需要 Java）。本機開發連 emulator：`npm run emulators` + `npm run dev:emu`。

至少涵蓋：

- 重點時機：燒完前覆寫 → 拒絕；燒完後覆寫 → 放行
- `message` 長度上限（40 字）
- 不可 `delete`
- `tz` 合法性驗證
- `expiresAt` 必須剛好等於 `litAt + 30 分鐘`
- `offsetLat` / `offsetLng` 絕對值 <= 1.5

---

## 已知風險（誠實記錄）

匿名短句無人審核（凌晨一點沒有版主）。防線是四個「短」：字數短（40 字）、壽命短（30 分鐘）、無回覆（罵人沒有回音）、無連結（純文字渲染，不解析 URL、不自動連結化）。若上線後濫用超出預期，優先考慮「只顯示同時區的話」而不是加審核。

---

## 刻意不做的事

聊天、回覆、帳號、暱稱、歷史、連續打卡、通知、精確定位、音效、任何 engagement 優化。蠟燭少的時候不造假——「只有你一根」也是真實，孤獨的誠實比熱鬧的謊言重要。

---

## Phases

| Phase | 內容 | 狀態 |
|-------|------|------|
| 1 | 純本地原型：地圖 + 晨昏線 + 點蠟燭 + 留言氣泡動畫（假資料） | ✅ |
| 2 | Firebase 接上：匿名登入、candles 讀寫（含重點邏輯）、rules + emulator 測試 | ✅ |
| 3 | 部署 Firebase Hosting | ✅ |

## 部署

- **正式站**：https://vigil-cc881.web.app
- Hosting：`npm run build`，然後 `npx firebase deploy --only hosting`
- Rules：`npx firebase deploy --only firestore:rules`（改動必須先過 `npm run test:rules`）
- TTL policy：`candles` 集合、`expiresAt` 欄位（已在 Cloud Console 設定；TTL 刪除不走 rules，`delete: false` 擋不到它，這是刻意的）
- 專案為 Blaze 方案（TTL 需要）；已設預算警示

---

## 給 Claude 的開發準則

- 任何功能實作前先問：**這會不會打擾深夜的人？** 會就不做。
- **commit 一律用 local git 身份 `Frank Yang <frank840629@gmail.com>`**，不可用 global 身份（此機器可能有公司 email 的 global config）。
- 這台機器可能有多個 agent 同時操作：**commit 前先 `git fetch` 確認遠端狀態**。
- Security Rules 改動必須先過 emulator 測試才能部署。
- 純文字渲染：永遠不解析 URL、不自動連結化使用者輸入的任何內容。
