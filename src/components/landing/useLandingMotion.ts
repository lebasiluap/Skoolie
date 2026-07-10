'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Landing-page animation runtime, ported from the design reference:
 *  1. Scroll parallax  — [data-para] (speed), optional [data-para-min] (min vw)
 *  2. Mouse drift      — [data-mouse] (strength), lerped at 0.06/frame
 *  3. 3D tilt          — [data-tilt], optional [data-base] base transform
 *  4. Scroll reveals   — [data-reveal] (stagger delay in ms)
 *  5. Readiness ring   — [data-ring] + [data-ringnum] + [data-bar]
 *
 * Parallax and drift are combined into a single translate3d per frame.
 * Document tops are cached on init / resize / ~600ms after mount (transform
 * cleared before measuring) so the loop never reads getBoundingClientRect
 * mid-flight (which would feed back through the element's own transform).
 * Everything is disabled under prefers-reduced-motion.
 */

/** Parallax + drift intensity multiplier (design runs at 2; range 0–2). */
const MOTION_INTENSITY = 2

export function useLandingMotion(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const intensity = reduce ? 0 : MOTION_INTENSITY
    const tiltOn = !reduce
    const cleanups: Array<() => void> = []

    /* ── Scroll parallax + mouse drift ─────────────────────────── */
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-para], [data-mouse]'))
    const geom = new Map<HTMLElement, { docTop: number; h: number }>()

    const measure = () => {
      const sy = window.scrollY
      for (const el of els) {
        el.style.transform = ''
        const r = el.getBoundingClientRect()
        geom.set(el, { docTop: r.top + sy, h: r.height })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    const settle = window.setTimeout(measure, 600) // re-measure after fonts settle
    cleanups.push(() => {
      window.removeEventListener('resize', measure)
      window.clearTimeout(settle)
    })

    let tmx = 0
    let tmy = 0
    let mx = 0
    let my = 0
    const onMouseMove = (e: MouseEvent) => {
      tmx = (e.clientX / window.innerWidth - 0.5) * 2
      tmy = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouseMove)
    cleanups.push(() => window.removeEventListener('mousemove', onMouseMove))

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    let raf = 0
    const loop = () => {
      mx = lerp(mx, tmx, 0.06)
      my = lerp(my, tmy, 0.06)
      const vh = window.innerHeight
      const sy = window.scrollY
      for (const el of els) {
        let x = 0
        let y = 0
        let speed = parseFloat(el.dataset.para || '0')
        if (el.dataset.paraMin && window.innerWidth < parseFloat(el.dataset.paraMin)) speed = 0
        if (speed) {
          const g = geom.get(el)
          if (g) {
            const p = (g.docTop + g.h / 2 - sy - vh / 2) / vh
            y += p * speed * 90 * intensity
          }
        }
        const ms = parseFloat(el.dataset.mouse || '0')
        if (ms) {
          const mScale = Math.min(1, window.innerWidth / 1500) // tame drift on narrow screens
          x += mx * ms * intensity * mScale
          y += my * ms * intensity * mScale
        }
        el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`
      }
      raf = requestAnimationFrame(loop)
    }
    if (intensity > 0) raf = requestAnimationFrame(loop)
    cleanups.push(() => cancelAnimationFrame(raf))

    /* ── 3D tilt (cards + phones) ──────────────────────────────── */
    if (tiltOn) {
      for (const card of Array.from(root.querySelectorAll<HTMLElement>('[data-tilt]'))) {
        const base = card.dataset.base || ''
        card.style.willChange = 'transform'
        const onMove = (e: MouseEvent) => {
          const r = card.getBoundingClientRect()
          const px = (e.clientX - r.left) / r.width - 0.5
          const py = (e.clientY - r.top) / r.height - 0.5
          card.style.transition = 'transform .08s linear'
          card.style.transform = `perspective(900px) ${base} rotateY(${(px * 10).toFixed(2)}deg) rotateX(${(-py * 10).toFixed(2)}deg)`
        }
        const onLeave = () => {
          card.style.transition = 'transform .5s cubic-bezier(.2,.8,.25,1)'
          card.style.transform = base
        }
        card.addEventListener('mousemove', onMove)
        card.addEventListener('mouseleave', onLeave)
        cleanups.push(() => {
          card.removeEventListener('mousemove', onMove)
          card.removeEventListener('mouseleave', onLeave)
        })
      }
    }

    /* ── Scroll reveals ────────────────────────────────────────── */
    if (!reduce) {
      const reveals = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
      for (const el of reveals) {
        el.style.opacity = '0'
        el.style.transform = 'translateY(44px)'
      }
      const io = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (!en.isIntersecting) continue
            const el = en.target as HTMLElement
            const d = parseInt(el.dataset.reveal || '0', 10)
            el.style.transition = `opacity .8s ${d}ms cubic-bezier(.2,.8,.25,1), transform .8s ${d}ms cubic-bezier(.2,.8,.25,1)`
            el.style.opacity = '1'
            el.style.transform = 'translateY(0)'
            io.unobserve(el)
          }
        },
        { threshold: 0.15 }
      )
      for (const el of reveals) io.observe(el)
      cleanups.push(() => io.disconnect())
    }

    /* ── Readiness ring + topic bars animate on view ───────────── */
    const ring = root.querySelector<SVGCircleElement>('[data-ring]')
    const num = root.querySelector<HTMLElement>('[data-ringnum]')
    if (ring) {
      const io2 = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return
          const target = 78
          const circ = 2 * Math.PI * 62
          ring.setAttribute('stroke-dasharray', `${((circ * target) / 100).toFixed(1)} ${circ.toFixed(1)}`)
          const t0 = performance.now()
          const tick = (t: number) => {
            const p = Math.min((t - t0) / 1400, 1)
            const ease = 1 - Math.pow(1 - p, 3) // cubic ease-out
            if (num) num.textContent = `${Math.round(target * ease)}%`
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          for (const bar of Array.from(root.querySelectorAll<HTMLElement>('[data-bar]'))) {
            bar.style.width = `${bar.dataset.bar}%`
          }
          io2.disconnect()
        },
        { threshold: 0.4 }
      )
      io2.observe(ring)
      cleanups.push(() => io2.disconnect())
    }

    return () => {
      for (const fn of cleanups) fn()
    }
  }, [rootRef])
}
