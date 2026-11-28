// ColumnHandle.tsx — 方法库两列的分隔条（拖动 + 方向键调宽）。
//
// 从 MethodLibraryView.tsx 拆出（2026-11-03 审计 P4）。
import { useRef } from 'react'
import type { ReactNode } from 'react'
import css from './library.module.css'

export function ColumnHandle({ onDrag, value, min, max, label }: {
  onDrag: (delta: number) => void
  value: number
  min: number
  max: number
  label: string
}): ReactNode {
  const lastX = useRef<number | null>(null)
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      className={css.columnHandle}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); onDrag(-16) }
        else if (event.key === 'ArrowRight') { event.preventDefault(); onDrag(16) }
        else if (event.key === 'Home') { event.preventDefault(); onDrag(min - value) }
        else if (event.key === 'End') { event.preventDefault(); onDrag(max - value) }
      }}
      onPointerDown={(event) => {
        event.preventDefault()
        lastX.current = event.clientX
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (lastX.current === null) return
        const delta = event.clientX - lastX.current
        lastX.current = event.clientX
        onDrag(delta)
      }}
      onPointerUp={() => { lastX.current = null }}
      onPointerCancel={() => { lastX.current = null }}
    >
      <div className={css.columnHandleLine} />
    </div>
  )
}
