'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Landing-page animation runtime, ported from the design reference:
 *  1. Scroll parallax  — [data-para] (speed), optional [data-para-min] (min vw)
 *  2. Mouse drift      — [data-mouse] (strength), lerped at 0.06/frame
 *  3. 3D tilt          — [data-tilt], optional [data-base] base transform
 *                        (mouse-driven only; touch-scrolls never trigger tilt)
 *  4. Scroll reveals   — [data-reveal] = variant name (up | left | right |
 *                        zoom | flip | blur | rise-rotate | pop) or a bare
 *                        number (legacy: "up" with that delay). Stagger via
 *                        [data-reveal-delay]. Revealed elements gain .lp-in
 *                        so CSS can choreograph children (week checkmarks,
 *                        leaderboard rows, combo bar).
 *  5. Count-up stats   — [data-count] + optional [data-suffix]
 *  6. Readiness ring   — [data-ring] + [data-ringnum] + [data-bar]
 *
 * Reveals and counters run once per mount. Scrolling away must never reset
 * content to a hidden/moved pose: transformed IntersectionObserver targets
 * can otherwise toggle their own intersection and visibly jump on re-entry.
 *
 * Parallax and drift are combined into a single translate3d per frame.
 * Untransformed layout positions are cached on init / resize / font readiness
 * so the loop never clears a visible transform or reads getBoundingClientRect
 * mid-flight (which would feed back through the element's own transform).
 * Everything is disabled under prefers-reduced-motion.
 */

/** Parallax + drift intensity multiplier (design runs at 2; range 0–2). */
const MOTION_INTENSITY = 1

export function useLandingMotion(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    // Mobile browser chrome resizes the viewport during scrolling. Keep
    // layout-bearing content stable there; CSS float animations still work.
    const intensity = reduce || !finePointer ? 0 : MOTION_INTENSITY
    /* tilt is mouse-driven — skip it entirely on touch / coarse-pointer devices */
    const tiltOn = !reduce && finePointer
    const cleanups: Array<() => void> = []

    /* Hero decorations fade; the page root/header NEVER moves. */
    const decor = Array.from(root.querySelectorAll<HTMLElement>('.lp-hero-decor, .lp-scroll-cue'))
    const onDecorScroll = () => {
      const hide = window.scrollY > 60
      for (const el of decor) el.classList.toggle('lp-decor-hide', hide)
    }
    onDecorScroll()
    window.addEventListener('scroll', onDecorScroll, { passive: true })
    cleanups.push(() => window.removeEventListener('scroll', onDecorScroll))

    /* ── Scroll parallax + mouse drift ─────────────────────────── */
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-para], [data-mouse]'))
    const geom = new Map<HTMLElement, { docTop: number; h: number }>()

    const measure = () => {
      for (const el of els) {
        let top = 0
        let node: HTMLElement | null = el
        while (node) {
          top += node.offsetTop
          const parent = node.offsetParent as HTMLElement | null
          if (parent) top += parent.clientTop
          node = parent
        }
        geom.set(el, { docTop: top, h: el.offsetHeight })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    let disposed = false
    void document.fonts?.ready.then(() => { if (!disposed) measure() })
    cleanups.push(() => {
      window.removeEventListener('resize', measure)
      disposed = true
    })

    let tmx = 0
    let tmy = 0
    let mx = 0
    let my = 0
    const onMouseMove = (e: MouseEvent) => {
      tmx = (e.clientX / window.innerWidth - 0.5) * 2
      tmy = (e.clientY / window.innerHeight - 0.5) * 2
      requestFrame()
    }
    if (intensity) window.addEventListener('mousemove', onMouseMove, { passive: true })
    cleanups.push(() => window.removeEventListener('mousemove', onMouseMove))

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    let raf = 0
    const requestFrame = () => { if (!raf && intensity > 0) raf = requestAnimationFrame(loop) }
    const loop = () => {
      raf = 0
      mx = lerp(mx, tmx, 0.06)
      my = lerp(my, tmy, 0.06)
      const vh = window.innerHeight
      const vw = window.innerWidth
      const sy = window.scrollY
      for (const el of els) {
        let x = 0
        let y = 0
        let speed = parseFloat(el.dataset.para || '0')
        if (el.dataset.paraMin && vw < parseFloat(el.dataset.paraMin)) speed = 0
        if (speed) {
          const g = geom.get(el)
          if (g) {
            const p = (g.docTop + g.h / 2 - sy - vh / 2) / vh
            // Bound decorative travel so distant sections can't fling their
            // ornaments into neighbouring content as you scroll quickly.
            y += Math.max(-48, Math.min(48, p * speed * 90 * intensity))
          }
        }
        const ms = parseFloat(el.dataset.mouse || '0')
        if (ms) {
          const mScale = Math.min(1, vw / 1500) // tame drift on narrow screens
          x += mx * ms * intensity * mScale
          y += my * ms * intensity * mScale
        }
        el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`
      }
      if (Math.abs(mx-tmx) > .01 || Math.abs(my-tmy) > .01) requestFrame()
    }
    requestFrame()
    window.addEventListener('scroll', requestFrame, { passive: true })
    window.addEventListener('resize', requestFrame)
    cleanups.push(() => { cancelAnimationFrame(raf); window.removeEventListener('scroll',requestFrame); window.removeEventListener('resize',requestFrame) })

    /* ── 3D tilt (cards + phones) ──────────────────────────────── */
    if (tiltOn) {
      for (const card of Array.from(root.querySelectorAll<HTMLElement>('[data-tilt]'))) {
        const base = card.dataset.base || ''
        card.style.willChange = 'transform'
        const onMove = (e: MouseEvent) => {
          if (card.hasAttribute('data-reveal') && card.dataset.motionReady !== 'true') return
          const r = card.getBoundingClientRect()
          const px = (e.clientX - r.left) / r.width - 0.5
          const py = (e.clientY - r.top) / r.height - 0.5
          card.style.transition = 'transform .08s linear'
          card.style.transform = `perspective(900px) ${base} rotateY(${(px * 10).toFixed(2)}deg) rotateX(${(-py * 10).toFixed(2)}deg)`
        }
        const onLeave = () => {
          if (card.hasAttribute('data-reveal') && card.dataset.motionReady !== 'true') return
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

    /* ── Scroll reveals (one-shot; never rewind visible content) ── */
    if (!reduce) {
      /* Shorter travel on phones avoids cards sliding under a scrolling finger. */
      const small = window.innerWidth < 700
      const HIDDEN: Record<string, string> = small
        ? {
            up: 'translateY(24px)',
            left: 'translateX(-24px)',
            right: 'translateX(24px)',
            zoom: 'scale(.8)',
            flip: 'perspective(900px) rotateX(16deg) translateY(26px)',
            blur: 'translateY(18px)',
            'rise-rotate': 'translateY(52px) rotate(2.5deg)',
            pop: 'scale(.5)',
          }
        : {
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
      const DUR = small ? '.55s' : '.8s'
      const POP_DUR = small ? '.75s' : '.65s'
      const conf = (el: HTMLElement) => {
        const raw = el.dataset.reveal || 'up'
        const legacy = /^\d+$/.test(raw)
        const variant = legacy || !(raw in HIDDEN) ? 'up' : raw
        const delay = parseInt(el.dataset.revealDelay || (legacy ? raw : '0'), 10) || 0
        return { variant, delay }
      }
      const reveals = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
      /* Initial pose only. Once shown, an element stays shown. */
      const toHidden = (el: HTMLElement) => {
        const { variant } = conf(el)
        el.style.transition = 'none'
        el.style.opacity = '0'
        el.style.transform = HIDDEN[variant]
        if (variant === 'blur') el.style.filter = 'blur(8px)'
      }
      for (const el of reveals) toHidden(el)
      const shown = new Set<HTMLElement>()
      const inTimers = new Map<HTMLElement, number>()
      const readyTimers = new Map<HTMLElement, number>()
      const io = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            const el = en.target as HTMLElement
            if (en.isIntersecting && en.intersectionRatio + 0.001 >= 0.15) {
              /* ≥15% visible → animate in (setting the transition in the
                 same style recalc as the target values starts the tween) */
              if (shown.has(el)) continue
              shown.add(el)
              io.unobserve(el)
              const { variant, delay: d } = conf(el)
              const tEase = variant === 'pop' ? SPRING : EASE
              const tDur = variant === 'pop' ? POP_DUR : DUR
              el.style.transition = `opacity ${DUR} ${d}ms ${EASE}, transform ${tDur} ${d}ms ${tEase}, filter ${DUR} ${d}ms ${EASE}`
              el.style.opacity = '1'
              el.style.transform = SHOWN[variant] || 'translateY(0)'
              if (variant === 'blur') el.style.filter = 'blur(0px)'
              /* .lp-in unlocks CSS child choreography once the element lands */
              inTimers.set(
                el,
                window.setTimeout(() => el.classList.add('lp-in'), d + 180)
              )
              readyTimers.set(el, window.setTimeout(() => { el.dataset.motionReady = 'true' }, d + 1050))
            }
            /* 0 < ratio < 15%: hysteresis dead-band — never toggle here */
          }
        },
        { threshold: [0, 0.15] }
      )
      for (const el of reveals) io.observe(el)
      cleanups.push(() => {
        io.disconnect()
        for (const t of inTimers.values()) window.clearTimeout(t)
        for (const t of readyTimers.values()) window.clearTimeout(t)
      })
    }

    /* ── Stat count-ups ([data-count]) ─────────────────────────── */
    if (!reduce) {
      const counters = Array.from(root.querySelectorAll<HTMLElement>('[data-count]'))
      if (counters.length) {
        const resetCount = (el: HTMLElement) => {
          el.textContent = `0${el.dataset.suffix || ''}`
        }
        for (const el of counters) resetCount(el)
        const counting = new Set<HTMLElement>() // "fired while visible"
        const countRafs = new Map<HTMLElement, number>()
        const io3 = new IntersectionObserver(
          (entries) => {
            for (const en of entries) {
              const el = en.target as HTMLElement
              if (en.isIntersecting && en.intersectionRatio + 0.001 >= 0.6) {
                if (counting.has(el)) continue
                counting.add(el)
                io3.unobserve(el)
                const target = parseInt(el.dataset.count || '0', 10)
                const suffix = el.dataset.suffix || ''
                const t0 = performance.now()
                const tick = (t: number) => {
                  const p = Math.min((t - t0) / 1500, 1)
                  const ease = 1 - Math.pow(1 - p, 3) // cubic ease-out
                  el.textContent = `${Math.round(target * ease).toLocaleString('en-US')}${suffix}`
                  if (p < 1) countRafs.set(el, requestAnimationFrame(tick))
                  else countRafs.delete(el)
                }
                countRafs.set(el, requestAnimationFrame(tick))
              }
            }
          },
          { threshold: [0, 0.6] }
        )
        for (const el of counters) io3.observe(el)
        cleanups.push(() => {
          io3.disconnect()
          for (const r of countRafs.values()) cancelAnimationFrame(r)
        })
      }
    }

    /* ── Readiness ring + topic bars (one-shot) ────────────────── */
    const ring = root.querySelector<SVGCircleElement>('[data-ring]')
    const num = root.querySelector<HTMLElement>('[data-ringnum]')
    if (ring) {
      const target = 78
      const circ = 2 * Math.PI * 62
      const finalDash = `${((circ * target) / 100).toFixed(1)} ${circ.toFixed(1)}`
      const bars = Array.from(root.querySelectorAll<HTMLElement>('[data-bar]'))

      if (reduce) {
        /* Reduced motion: render final values immediately, no tweens */
        ring.style.transition = 'none'
        ring.setAttribute('stroke-dasharray', finalDash)
        if (num) num.textContent = `${target}%`
        for (const bar of bars) {
          bar.style.transition = 'none'
          bar.style.width = `${bar.dataset.bar}%`
        }
      } else {
        /* Observe the HTML card, NOT the <circle>: Chromium's
           IntersectionObserver treats SVG child elements as having no
           layout box, so observing the circle never reports an
           intersection and the whole choreography sat at 0 forever.
           Watching the card also matches the intent: fire when the card
           itself is ~40% visible. Do not reset on exit: transforms do affect
           intersection geometry and must not feed back into a reset loop. */
        const card =
          ring.closest<HTMLElement>('[data-tilt]') ??
          (ring.ownerSVGElement?.parentElement as HTMLElement | null) ??
          root
        /* JSX puts the tween transitions inline on the ring/bars — capture
           them so resets can go through `transition: none` and replays can
           restore the originals (React won't re-apply them for us). */
        const ringTransition = ring.style.transition
        const barTransitions = new Map<HTMLElement, string>()
        for (const bar of bars) barTransitions.set(bar, bar.style.transition)
        let fired = false // "fired while visible"
        let ringRaf = 0
        const io2 = new IntersectionObserver(
          (entries) => {
            for (const en of entries) {
              if (en.isIntersecting && en.intersectionRatio + 0.001 >= 0.4) {
                if (fired) continue
                fired = true
                io2.unobserve(card)
                /* restore the transition in the same recalc as the value
                   change so the tween runs from the reset start values */
                ring.style.transition = ringTransition
                ring.setAttribute('stroke-dasharray', finalDash)
                const t0 = performance.now()
                const tick = (t: number) => {
                  const p = Math.min((t - t0) / 1400, 1)
                  const ease = 1 - Math.pow(1 - p, 3) // cubic ease-out
                  if (num) num.textContent = `${Math.round(target * ease)}%`
                  if (p < 1) ringRaf = requestAnimationFrame(tick)
                }
                ringRaf = requestAnimationFrame(tick)
                for (const bar of bars) {
                  bar.style.transition = barTransitions.get(bar) || ''
                  bar.style.width = `${bar.dataset.bar}%`
                }
              }
            }
          },
          { threshold: [0, 0.4] }
        )
        io2.observe(card)
        cleanups.push(() => {
          io2.disconnect()
          cancelAnimationFrame(ringRaf)
        })
      }
    }

    return () => {
      for (const fn of cleanups) fn()
    }
  }, [rootRef])
}
