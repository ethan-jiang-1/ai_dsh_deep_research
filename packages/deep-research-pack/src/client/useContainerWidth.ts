/**
 * useContainerWidth.ts — 追踪容器元素实测宽度的共享 hook（BUG-472 / BUG-477 / BUG-482）。
 *
 * 在真实浏览器通过 ResizeObserver + clientWidth 实时回报容器宽（px）；
 * 在无真实布局的 jsdom/SSR 下当测量值为 0 时保持 `null`，便于调用方保留测试默认态。
 */
import { useEffect, useState } from 'react'

export function useContainerWidth(element: HTMLElement | null): number | null {
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    if (element === null) {
      setWidth(null)
      return undefined
    }
    const measure = (reported?: number): void => {
      const next = typeof reported === 'number' && reported > 0
        ? reported
        : element.clientWidth > 0
          ? element.clientWidth
          : element.getBoundingClientRect().width
      if (next > 0) setWidth(Math.round(next))
    }
    measure()

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver((entries) => {
        const entry = entries[0]
        measure(entry?.contentRect.width)
      })
      observer.observe(element)
    }
    const onResize = (): void => { measure() }
    if (typeof window !== 'undefined') window.addEventListener('resize', onResize)
    return () => {
      observer?.disconnect()
      if (typeof window !== 'undefined') window.removeEventListener('resize', onResize)
    }
  }, [element])

  return width
}
