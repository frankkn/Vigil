import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'

export const WORLD_W = 1000
export const WORLD_H = 500

export interface Camera { cx: number; cy: number; zoom: number }
export interface ViewBox { x: number; y: number; w: number; h: number }
export interface Size { w: number; h: number }

interface Opts {
  containerRef: React.RefObject<HTMLDivElement | null>
  xformRef: React.RefObject<HTMLDivElement | null>
  svgRef: React.RefObject<SVGSVGElement | null>
  /** 初始中心（世界座標） */
  initialCenter: [number, number]
  /** 手勢開始（tooltip 該收起來了） */
  onGestureStart: () => void
  /** 輕點（未拖曳）：容器相對 px 座標 */
  onTap: (px: number, py: number) => void
}

// cover 模式：世界剛好蓋滿容器的最小倍率
function minZoomFor(size: Size): number {
  return Math.max(1, (WORLD_W / WORLD_H) * (size.h / size.w))
}
function maxZoomFor(size: Size): number {
  return Math.max(8, minZoomFor(size) * 2.5)
}

function viewBoxFor(cam: Camera, size: Size): ViewBox {
  const w = WORLD_W / cam.zoom
  const h = w * (size.h / size.w)
  return { x: cam.cx - w / 2, y: cam.cy - h / 2, w, h }
}

function clampCamera(cam: Camera, size: Size): Camera {
  const zoom = Math.min(maxZoomFor(size), Math.max(minZoomFor(size), cam.zoom))
  const vbW = WORLD_W / zoom
  const vbH = vbW * (size.h / size.w)
  // 某一軸的視窗比世界還大 → 該軸置中
  const cx = vbW >= WORLD_W ? WORLD_W / 2 : Math.min(WORLD_W - vbW / 2, Math.max(vbW / 2, cam.cx))
  const cy = vbH >= WORLD_H ? WORLD_H / 2 : Math.min(WORLD_H - vbH / 2, Math.max(vbH / 2, cam.cy))
  return { cx, cy, zoom }
}

export function useMapCamera(opts: Opts) {
  const [size, setSize] = useState<Size>({ w: 1, h: 1 })
  const [camera, setCameraState] = useState<Camera | null>(null)

  const optsRef = useRef(opts)
  optsRef.current = opts

  const sizeRef = useRef(size)
  const camRef = useRef<Camera | null>(null)      // 已 commit 的相機（viewBox 的真相）
  const liveRef = useRef<Camera | null>(null)     // 手勢進行中的相機
  const initialCamRef = useRef<Camera | null>(null)

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const rectRef = useRef<DOMRect | null>(null)
  const segRef = useRef<{ cam: Camera; mid: { x: number; y: number }; dist: number } | null>(null)
  const movedRef = useRef(false)
  const downPosRef = useRef({ x: 0, y: 0 })
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null)
  const lastPointerTypeRef = useRef('mouse')
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef(0)
  const gestureBaseRef = useRef<Camera | null>(null) // Safari GestureEvent 基準

  // ---- 命令式渲染 ----

  const applyViewBox = useCallback((cam: Camera) => {
    const svg = optsRef.current.svgRef.current
    if (!svg) return
    const vb = viewBoxFor(cam, sizeRef.current)
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`)
  }, [])

  // 手勢中：只動 wrapper 的 CSS transform（GPU 合成，SVG 零重繪）
  const applyLive = useCallback((next: Camera) => {
    const live = clampCamera(next, sizeRef.current)
    liveRef.current = live
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      const xform = optsRef.current.xformRef.current
      const committed = camRef.current
      const cur = liveRef.current
      if (!xform || !committed || !cur) return
      const sz = sizeRef.current
      const vb1 = viewBoxFor(committed, sz)
      const vb2 = viewBoxFor(cur, sz)
      const k2 = sz.w / vb2.w
      const s = vb1.w / vb2.w
      const tx = (vb1.x - vb2.x) * k2
      const ty = (vb1.y - vb2.y) * k2
      xform.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`
    })
  }, [])

  const commit = useCallback(() => {
    const cur = liveRef.current
    if (cur) camRef.current = cur
    liveRef.current = null
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0 }
    const xform = optsRef.current.xformRef.current
    if (xform) xform.style.transform = ''
    if (camRef.current) {
      applyViewBox(camRef.current)
      setCameraState({ ...camRef.current })
    }
  }, [applyViewBox])

  // 以容器內某點為錨縮放
  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    const base = liveRef.current ?? camRef.current
    if (!base) return
    const sz = sizeRef.current
    const zoom = Math.min(maxZoomFor(sz), Math.max(minZoomFor(sz), base.zoom * factor))
    const vb1 = viewBoxFor(base, sz)
    const k1 = sz.w / vb1.w
    const wx = vb1.x + px / k1
    const wy = vb1.y + py / k1
    const vbW2 = WORLD_W / zoom
    const vbH2 = vbW2 * (sz.h / sz.w)
    const k2 = sz.w / vbW2
    applyLive({ cx: wx - px / k2 + vbW2 / 2, cy: wy - py / k2 + vbH2 / 2, zoom })
  }, [applyLive])

  // ---- 手勢 ----

  useEffect(() => {
    const el = opts.containerRef.current
    if (!el) return

    const posOf = (e: { clientX: number; clientY: number }) => {
      const r = rectRef.current ?? el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    const startSegment = () => {
      const cam = liveRef.current ?? camRef.current
      if (!cam) return
      const pts = [...pointers.current.values()]
      if (pts.length >= 2) {
        const [a, b] = pts
        segRef.current = {
          cam,
          mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          dist: Math.max(12, Math.hypot(b.x - a.x, b.y - a.y)),
        }
      } else if (pts.length === 1) {
        segRef.current = { cam, mid: pts[0], dist: 0 }
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      lastPointerTypeRef.current = e.pointerType
      if (pointers.current.size === 0) rectRef.current = el.getBoundingClientRect()
      try { el.setPointerCapture(e.pointerId) } catch { /* pointer 已離開時忽略 */ }
      const pos = posOf(e)
      pointers.current.set(e.pointerId, pos)
      if (pointers.current.size === 1) {
        movedRef.current = false
        downPosRef.current = pos
        startSegment()
      } else if (pointers.current.size === 2) {
        movedRef.current = true
        optsRef.current.onGestureStart()
        startSegment()
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return
      const pos = posOf(e)
      pointers.current.set(e.pointerId, pos)
      const seg = segRef.current
      if (!seg) return
      const sz = sizeRef.current

      if (pointers.current.size === 1) {
        if (!movedRef.current) {
          if (Math.hypot(pos.x - downPosRef.current.x, pos.y - downPosRef.current.y) < 6) return
          movedRef.current = true
          optsRef.current.onGestureStart()
        }
        const k = (sz.w * seg.cam.zoom) / WORLD_W
        applyLive({
          cx: seg.cam.cx - (pos.x - seg.mid.x) / k,
          cy: seg.cam.cy - (pos.y - seg.mid.y) / k,
          zoom: seg.cam.zoom,
        })
      } else if (pointers.current.size >= 2) {
        const [a, b] = [...pointers.current.values()]
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const dist = Math.hypot(b.x - a.x, b.y - a.y)
        const zoom = Math.min(maxZoomFor(sz), Math.max(minZoomFor(sz), seg.cam.zoom * (dist / seg.dist)))
        // 讓 seg 開始時位於 seg.mid 下的世界點，跟著移到現在的 mid
        const vb1 = viewBoxFor(seg.cam, sz)
        const k1 = sz.w / vb1.w
        const wx = vb1.x + seg.mid.x / k1
        const wy = vb1.y + seg.mid.y / k1
        const vbW2 = WORLD_W / zoom
        const vbH2 = vbW2 * (sz.h / sz.w)
        const k2 = sz.w / vbW2
        applyLive({ cx: wx - mid.x / k2 + vbW2 / 2, cy: wy - mid.y / k2 + vbH2 / 2, zoom })
      }
    }

    const onPointerEnd = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return
      const pos = posOf(e)
      pointers.current.delete(e.pointerId)

      if (pointers.current.size > 0) {
        startSegment() // pinch → 單指續拖
        return
      }
      if (movedRef.current || e.type === 'pointercancel') {
        commit()
        return
      }
      // 輕點
      const last = lastTapRef.current
      if (last && e.timeStamp - last.t < 320 && Math.hypot(pos.x - last.x, pos.y - last.y) < 30) {
        lastTapRef.current = null
        optsRef.current.onGestureStart()
        zoomAt(pos.x, pos.y, 2)
        commit()
      } else {
        lastTapRef.current = { t: e.timeStamp, x: pos.x, y: pos.y }
        optsRef.current.onTap(pos.x, pos.y)
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (wheelTimerRef.current === null) {
        rectRef.current = el.getBoundingClientRect()
        optsRef.current.onGestureStart()
      } else {
        clearTimeout(wheelTimerRef.current)
      }
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1)
      const factor = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0022))
      const pos = posOf(e)
      zoomAt(pos.x, pos.y, factor)
      wheelTimerRef.current = setTimeout(() => {
        wheelTimerRef.current = null
        commit()
      }, 140)
    }

    const onDblClick = (e: MouseEvent) => {
      e.preventDefault()
      if (lastPointerTypeRef.current === 'touch') return // 觸控雙點已在 pointer 路徑處理
      rectRef.current = el.getBoundingClientRect()
      optsRef.current.onGestureStart()
      const pos = posOf(e)
      zoomAt(pos.x, pos.y, 2)
      commit()
    }

    // macOS Safari trackpad pinch（不送 ctrl+wheel）
    type SafariGestureEvent = Event & { scale: number; clientX: number; clientY: number }
    const onGestureStart = (e: Event) => {
      e.preventDefault()
      rectRef.current = el.getBoundingClientRect()
      gestureBaseRef.current = liveRef.current ?? camRef.current
      optsRef.current.onGestureStart()
    }
    const onGestureChange = (e: Event) => {
      e.preventDefault()
      const ge = e as SafariGestureEvent
      const base = gestureBaseRef.current
      if (!base) return
      const pos = posOf(ge)
      const sz = sizeRef.current
      const zoom = Math.min(maxZoomFor(sz), Math.max(minZoomFor(sz), base.zoom * ge.scale))
      const vb1 = viewBoxFor(base, sz)
      const k1 = sz.w / vb1.w
      const wx = vb1.x + pos.x / k1
      const wy = vb1.y + pos.y / k1
      const vbW2 = WORLD_W / zoom
      const vbH2 = vbW2 * (sz.h / sz.w)
      const k2 = sz.w / vbW2
      applyLive({ cx: wx - pos.x / k2 + vbW2 / 2, cy: wy - pos.y / k2 + vbH2 / 2, zoom })
    }
    const onGestureEnd = (e: Event) => {
      e.preventDefault()
      gestureBaseRef.current = null
      commit()
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerEnd)
    el.addEventListener('pointercancel', onPointerEnd)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('dblclick', onDblClick)
    const hasGestureEvents = 'GestureEvent' in window
    if (hasGestureEvents) {
      el.addEventListener('gesturestart', onGestureStart)
      el.addEventListener('gesturechange', onGestureChange)
      el.addEventListener('gestureend', onGestureEnd)
    }
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerEnd)
      el.removeEventListener('pointercancel', onPointerEnd)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('dblclick', onDblClick)
      if (hasGestureEvents) {
        el.removeEventListener('gesturestart', onGestureStart)
        el.removeEventListener('gesturechange', onGestureChange)
        el.removeEventListener('gestureend', onGestureEnd)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 尺寸：初始 + ResizeObserver ----

  useLayoutEffect(() => {
    const el = opts.containerRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) {
        sizeRef.current = { w: r.width, h: r.height }
        setSize(sizeRef.current)
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 尺寸就緒/改變：初始化或重新 clamp 相機
  useLayoutEffect(() => {
    if (size.w <= 1) return
    if (!camRef.current) {
      const [ix, iy] = optsRef.current.initialCenter
      const cam = clampCamera({ cx: ix, cy: iy, zoom: minZoomFor(size) }, size)
      camRef.current = cam
      initialCamRef.current = cam
    } else {
      camRef.current = clampCamera(camRef.current, size)
      initialCamRef.current = clampCamera(
        { ...initialCamRef.current!, zoom: minZoomFor(size) }, size)
    }
    applyViewBox(camRef.current)
    setCameraState({ ...camRef.current })
  }, [size, applyViewBox])

  const reset = useCallback(() => {
    if (!initialCamRef.current) return
    liveRef.current = { ...initialCamRef.current }
    commit()
  }, [commit])

  const viewBox = camera ? viewBoxFor(camera, size) : null
  const pxPerUnit = viewBox ? size.w / viewBox.w : 1
  const init = initialCamRef.current
  const isAway = !!(camera && init && (
    Math.abs(camera.zoom / init.zoom - 1) > 0.02 ||
    Math.abs(camera.cx - init.cx) > 3 ||
    Math.abs(camera.cy - init.cy) > 3
  ))

  return { camera, viewBox, size, pxPerUnit, isAway, reset }
}
