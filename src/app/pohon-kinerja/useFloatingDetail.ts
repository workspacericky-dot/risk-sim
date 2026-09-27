'use client'

import { useEffect, useRef, useState } from 'react'

type Position = { left: number; top: number; width: number; height: number }

export function useFloatingDetail(selected: string, expanded: Set<string>, zoom: number, mode: string, region: string) {
  const canvasScrollRef = useRef<HTMLDivElement>(null)
  const detailSlotRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Position | null>(null)

  useEffect(() => {
    const canvas = canvasScrollRef.current
    const slot = detailSlotRef.current
    if (!canvas || !slot) return
    let frame = 0

    function update() {
      if (!canvas || !slot) return
      if (window.matchMedia('(max-width: 1020px)').matches) {
        setPosition(null)
        return
      }

      const slotRect = slot.getBoundingClientRect()
      const selectedElement = [...canvas.querySelectorAll('[data-node-id]')]
        .find(element => element.getAttribute('data-node-id') === selected)
      const selectedRect = selectedElement?.getBoundingClientRect()
      const headerBottom = [...document.querySelectorAll('header')].reduce((bottom, header) => {
        const placement = window.getComputedStyle(header).position
        const rect = header.getBoundingClientRect()
        return (placement === 'sticky' || placement === 'fixed') && rect.top <= 0 && rect.bottom > 0
          ? Math.max(bottom, rect.bottom + 12) : bottom
      }, 16)

      const minimumHeight = Math.min(340, Math.max(180, window.innerHeight - headerBottom - 16))
      const top = Math.min(
        Math.max((selectedRect?.top ?? slotRect.top) - 16, headerBottom),
        window.innerHeight - minimumHeight - 16,
      )
      const next: Position = {
        left: Math.round(slotRect.left),
        top: Math.round(top),
        width: Math.round(slotRect.width),
        height: Math.round(Math.max(180, window.innerHeight - top - 16)),
      }
      setPosition(previous => previous && previous.left === next.left && previous.top === next.top &&
        previous.width === next.width && previous.height === next.height ? previous : next)
    }

    function schedule() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    schedule()
    canvas.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const observer = new ResizeObserver(schedule)
    observer.observe(slot)
    observer.observe(canvas)
    return () => {
      cancelAnimationFrame(frame)
      canvas.removeEventListener('scroll', schedule)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer.disconnect()
    }
  }, [selected, expanded, zoom, mode, region])

  return { canvasScrollRef, detailSlotRef, position }
}
