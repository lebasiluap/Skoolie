'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Landing-page animation runtime, ported from the design reference:
 *  1. Scroll parallax  — [data-para] (speed), optional [data-para-min] (min vw)
 *  2. Mouse drift      — [data-mouse] (strength), lerped at 0.06/frame
 *  3. 3D tilt          — [data-tilt], optional [data-base] base transform
 *                        (mouse-driven on fine pointers; touch devices get a
 *                        250ms touchstart tilt pulse instead)
 *  4. Scroll reveals   — [data-reveal] = variant name (up | left | right |
 *                        zoom | flip | blur | rise-rotate | pop) or a bare
 *                        number (legacy: "up" with that delay). Stagger via
 *                        [data-reveal-delay]. Revealed elements gain .lp-in
 *                        so CSS can choreograph children (week checkmarks,
 *                        leaderboard rows, combo bar).
 *  5. Count-up stats   — [data-count] + optional [data-suffix]
 *  6. Readiness ring   — [data-ring] + [data-ringnum] + [data-bar]
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
    /* tilt is mouse-driven — skip it entirely on touch / coarse-pointer devices */
    const tiltOn = !reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const cleanups: Array<() => void> = []

    /* ── Hero decor chips fade once the page scrolls (never touch the nav) ── */
    const decor = Array.from(root.querySelectorAll<HTMLElement>('.lp-hero-decor'))
    if (decor.length) {
      const onDecorScroll = () => {
        const hide = window.scrollY > 60
        for (const el of decor) el.classList.toggle('lp-decor-hide', hide)
      }
      onDecorScroll()
      window.addEventListener('scroll', onDecorScroll, { passive: true })
      cleanups.push(() => window.removeEventListener('scroll', onDecorScroll))
    }

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
    window.addEventListener('mousemove', onMouseMove, { passive: true })
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
    } else if (!reduce) {
      /* Touch replacement: a brief tilt pulse on tap (250ms, transform-only).
         Phones (.lp-phone) are excluded — below 1050px their transform is
         pinned flat by CSS, so a pulse there would be a no-op anyway. */
      for (const card of Array.from(root.querySelectorAll<HTMLElement>('[data-tilt]:not(.lp-phone)'))) {
        const base = card.dataset.base || ''
        let back = 0
        const onTouch = () => {
          window.clearTimeout(back)
          card.style.transition = 'transform .25s cubic-bezier(.2,.8,.25,1)'
          card.style.transform = `perspective(900px) ${base} rotateX(3deg) scale(.985)`
          back = window.setTimeout(() => {
            card.style.transform = base
          }, 250)
        }
        card.addEventListener('touchstart', onTouch, { passive: true })
        cleanups.push(() => {
          card.removeEventListener('touchstart', onTouch)
          window.clearTimeout(back)
        })
      }
    }

    /* ── Scroll reveals (variant-aware, one-shot) ──────────────── */
    if (!reduce) {
      const HIDDEN: Record<string, string> = {
        up: 'translateY(44px)',
        left: 'translateX(-60px)',
        right: 'translateX(60px)',
        zoom: 'scale(.85)',
        flip: 'perspective(900px) rotateX(14deg) translateY(20px)',
        blur: 'translateY(14px)',
        'rise-rotate': 'translateY(40px) rotate(2deg)',
        pop: 'scale(.55)',
      }
      const SHOWN: Record<string, string> = {
        flip: 'perspective(900px) rotateX(0deg) translateY(0)',
      }
      const EASE = 'cubic-bezier(.2,.8,.25,1)'
      const SPRING = 'cubic-bezier(.34,1.56,.64,1)' // overshoot for "pop"
      const conf = (el: HTMLElement) => {
        const raw = el.dataset.reveal || 'up'
        const legacy = /^\d+$/.test(raw)
        const variant = legacy || !(raw in HIDDEN) ? 'up' : raw
        const delay = parseInt(el.dataset.revealDelay || (legacy ? raw : '0'), 10) || 0
        return { variant, delay }
      }
      const reveals = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
      for (const el of reveals) {
        const { variant } = conf(el)
        el.style.opacity = '0'
        el.style.transform = HIDDEN[variant]
        if (variant === 'blur') el.style.filter = 'blur(8px)'
      }
      const io = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (!en.isIntersecting) continue
            const el = en.target as HTMLElement
            const { variant, delay: d } = conf(el)
            const tEase = variant === 'pop' ? SPRING : EASE
            const tDur = variant === 'pop' ? '.65s' : '.8s'
            el.style.transition = `opacity .8s ${d}ms ${EASE}, transform ${tDur} ${d}ms ${tEase}, filter .8s ${d}ms ${EASE}`
            el.style.opacity = '1'
            el.style.transform = SHOWN[variant] || 'translateY(0)'
            if (variant === 'blur') el.style.filter = 'blur(0px)'
            /* .lp-in unlocks CSS child choreography once the element lands */
            window.setTimeout(() => el.classList.add('lp-in'), d + 180)
            io.unobserve(el)
          }
        },
        { threshold: 0.15 }
      )
      for (const el of reveals) io.observe(el)
      cleanups.push(() => io.disconnect())
    }

    /* ── Stat count-ups ([data-count]) ─────────────────────────── */
    if (!reduce) {
      const counters = Array.from(root.querySelectorAll<HTMLElement>('[data-count]'))
      if (counters.length) {
        for (const el of counters) el.textContent = `0${el.dataset.suffix || ''}`
        const io3 = new IntersectionObserver(
          (entries) => {
            for (const en of entries) {
              if (!en.isIntersecting) continue
              const el = en.target as HTMLElement
              const target = parseInt(el.dataset.count || '0', 10)
              const suffix = el.dataset.suffix || ''
              const t0 = performance.now()
              const tick = (t: number) => {
                const p = Math.min((t - t0) / 1500, 1)
                const ease = 1 - Math.pow(1 - p, 3) // cubic ease-out
                el.textContent = `${Math.round(target * ease).toLocaleString('en-US')}${suffix}`
                if (p < 1) requestAnimationFrame(tick)
              }
              requestAnimationFrame(tick)
              io3.unobserve(el)
            }
          },
          { threshold: 0.6 }
        )
        for (const el of counters) io3.observe(el)
        cleanups.push(() => io3.disconnect())
      }
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
