'use client'

import { useEffect, useRef, useCallback } from 'react'

export const CURRENT_YEAR = new Date().getFullYear()
export const ITEM_HEIGHT = 56
const VISIBLE = 3
export const CONTAINER_H = ITEM_HEIGHT * VISIBLE
export const YEARS = Array.from({ length: CURRENT_YEAR - 1919 }, (_, i) => CURRENT_YEAR - i)
export const DEFAULT_YEAR = CURRENT_YEAR - 25
const DEFAULT_IDX = YEARS.indexOf(DEFAULT_YEAR)

export function YearPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (year: number) => void
}): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartScroll = useRef(0)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const snapToNearest = useCallback((el: HTMLDivElement, animate = true): void => {
    const raw = el.scrollTop / ITEM_HEIGHT
    const idx = Math.max(0, Math.min(Math.round(raw), YEARS.length - 1))
    el.scrollTo({ top: idx * ITEM_HEIGHT, behavior: animate ? 'smooth' : 'instant' })
    onChange(YEARS[idx] ?? DEFAULT_YEAR)
  }, [onChange])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = DEFAULT_IDX * ITEM_HEIGHT
    onChange(DEFAULT_YEAR)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const currentIdx = Math.round(el.scrollTop / ITEM_HEIGHT)
      const delta = e.deltaY > 0 ? 1 : -1
      const nextIdx = Math.max(0, Math.min(currentIdx + delta, YEARS.length - 1))
      el.scrollTo({ top: nextIdx * ITEM_HEIGHT, behavior: 'smooth' })
      onChange(YEARS[nextIdx] ?? DEFAULT_YEAR)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onChange])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const scheduleSnap = (): void => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
      settleTimer.current = setTimeout(() => snapToNearest(el), 120)
    }
    const onScrollEnd = (): void => snapToNearest(el)
    if ('onscrollend' in window) {
      el.addEventListener('scrollend', onScrollEnd)
      return () => el.removeEventListener('scrollend', onScrollEnd)
    }
    el.addEventListener('scroll', scheduleSnap, { passive: true })
    return () => {
      el.removeEventListener('scroll', scheduleSnap)
      if (settleTimer.current) clearTimeout(settleTimer.current)
    }
  }, [snapToNearest])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onMouseDown = (e: MouseEvent): void => {
      isDragging.current = true
      dragStartY.current = e.clientY
      dragStartScroll.current = el.scrollTop
      el.style.cursor = 'grabbing'
      el.style.userSelect = 'none'
      e.preventDefault()
    }
    const onMouseMove = (e: MouseEvent): void => {
      if (!isDragging.current) return
      el.scrollTop = dragStartScroll.current + (dragStartY.current - e.clientY)
    }
    const onMouseUp = (): void => {
      if (!isDragging.current) return
      isDragging.current = false
      el.style.cursor = 'grab'
      el.style.userSelect = ''
      snapToNearest(el)
    }
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [snapToNearest])

  return (
    <div className="mx-auto w-52 rounded-xl border border-border/60 dark:border-white/12 bg-black/[0.04] dark:bg-white/[0.04] overflow-hidden">
      <div
        className="relative"
        style={{
          height: `${CONTAINER_H}px`,
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 33%, black 67%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 33%, black 67%, transparent 100%)',
        }}
      >
        {/* Selected-year highlight */}
        <div
          className="pointer-events-none absolute inset-x-3 z-10 rounded-xl border border-primary/30 bg-primary/5"
          style={{ top: `${ITEM_HEIGHT}px`, height: `${ITEM_HEIGHT}px` }}
        />
        <div
          ref={scrollRef}
          className="h-full overflow-y-scroll overflow-x-hidden select-none"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', cursor: 'grab' }}
        >
          <div style={{ height: `${ITEM_HEIGHT}px` }} />
          {YEARS.map((year) => (
            <div
              key={year}
              style={{ height: `${ITEM_HEIGHT}px` }}
              className={[
                'flex items-center justify-center transition-all duration-100',
                year === value
                  ? 'text-2xl font-bold text-foreground'
                  : 'text-base font-medium text-muted-foreground/50',
              ].join(' ')}
            >
              {year}
            </div>
          ))}
          <div style={{ height: `${ITEM_HEIGHT}px` }} />
        </div>
      </div>
    </div>
  )
}
