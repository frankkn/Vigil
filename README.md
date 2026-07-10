<div align="right">

**English** | [繁體中文](README.zh-TW.md)

</div>

# Vigil 🕯️ 守夜

**Can't sleep at 3 AM? Open it, light a candle, leave one line if you want. On a world map showing Earth's night side, see how many candles are still burning right now — and where — a few strangers awake with you.**

🔗 Live: **https://vigil-cc881.web.app**

## How to use

### Web
Just open [https://vigil-cc881.web.app](https://vigil-cc881.web.app) in any browser. No sign-up, no install — you're signed in anonymously the moment it loads.

### iOS (Add to Home Screen)
1. Open [https://vigil-cc881.web.app](https://vigil-cc881.web.app) in **Safari**
2. Tap the **Share** button ↑ → choose **Add to Home Screen**
3. Tap **Add** — a Vigil icon appears on your home screen and works like an app

## What is this

It's late, you're awake, and it's quiet. You open Vigil and light a candle. It burns for 30 minutes on a dark world map, somewhere over your timezone. Next to it you might leave a single short line. Across the map, other candles are lit — Tokyo, London, a city you've never been to — some with a line drifting beside them, most just glowing.

No chat. No profiles. No replies. Just: **you're not the only one awake.**

Vigil is built on one idea: **the smallest unit of company is knowing someone is there.** One line is the ceiling; a conversation would be an intrusion.

### The rules (non-negotiable)

- **One tap lights a candle; it burns 30 minutes, then goes out on its own.** While burning it can't be snuffed early or extended. After it's out you may light a fresh one — a new 30 minutes, a new line. Keeping vigil all night is allowed, but every candle lives and dies in full
- **One candle per person at a time.** The document ID *is* your anonymous uid — the structure guarantees it
- **You may leave one line** (optional, 40 characters max, plain text). It lives and dies with the candle: when the flame goes out the words are gone. No history, no editing, no replies. URLs are never parsed or linkified
- **Location is timezone-city only** — derived from your browser's `Intl` timezone (e.g. `Asia/Taipei`). Zero GPS, zero IP lookup, zero permission prompt. We don't know where you are; we only know which timezone your late night belongs to
- **No account** (anonymous auth, invisible to you), **no name, no history, no reply mechanism**
- **Candles only appear on the night side.** The map draws the day/night terminator live from pure solar-position math; your flame sits over the dark half of the Earth

## The map

A single screen: the night-side world map, the candles, one "light" button with an optional one-line input, and a line that reads *"N candles are burning right now."*

- **Pan, zoom, and wrap.** Drag to pan (the world wraps seamlessly east–west), scroll or pinch to zoom in. On a phone it opens centered on your own timezone, filling the screen
- **Hover or tap a candle** and its city and time remaining surface softly — *"Tokyo · 12 minutes left"* — with the line beside it, if there is one
- **Your own candle** carries a faint marker and a burn-down animation; when it's spent, the button returns to "light another"
- **Quiet by design.** Deep-night palette, slow animations, no sound. Candles breathe gently, fade in when lit, and dim as they burn out. As your timezone nears sunrise, a faint warm glow rises from the horizon — the night really does end

Same-timezone candles are scattered by a small random offset (~0.3°) so they don't stack on one pixel; zooming in separates them further.

## Honesty as infrastructure

The product's promises are enforced by Firestore Security Rules, not by good intentions:

- **A candle burns exactly 30 minutes** — `expiresAt == litAt + 30min` is enforced precisely; it can't be extended
- **No overwriting a burning candle** — a relight is only allowed once the previous one has expired (`resource.data.expiresAt <= request.time`)
- **Deletion is impossible** (`allow delete: if false`) — you cannot snuff a candle early; expiry is the only way out
- **Field-level validation** — timezone must be a valid IANA string, the message must be a string ≤ 40 characters, the scatter offset is bounded
- **Reads are open to everyone**; expired documents are swept by Firestore TTL

All of it is covered by the emulator test suite (`npm run test:rules`).

## Tech

- **Vite + React + TypeScript + Tailwind CSS v4**
- **Firebase**: anonymous auth (invisible sign-in), Firestore (realtime sync via `onSnapshot`), Hosting — no custom backend at all
- **The map is hand-built, no map library**: an inline SVG world outline (from world-atlas 110m TopoJSON), a timezone→coordinate table generated from IANA `zone1970.tab`, and a custom pan/zoom/wrap camera
- **The day/night terminator is pure solar-position math** — no external dependency

## Local development

```bash
npm install

# Real Firebase project (uses .env.local)
npm run dev

# Full stack against local emulators
npm run emulators          # Auth :9099 + Firestore :8080
npm run dev:emu

# Security Rules test suite (spins up the Firestore emulator; needs Java)
npm run test:rules
```

To run against a real Firebase project, copy `.env.example` to `.env.local` and fill in your web app config.

## Deliberately not building

Chat, replies, accounts, nicknames, history, streaks, notifications, precise location, sound effects, and any engagement optimization.

When candles are few, we don't fake them — *"only you tonight"* is also true. The honesty of solitude matters more than the lie of a crowd.
