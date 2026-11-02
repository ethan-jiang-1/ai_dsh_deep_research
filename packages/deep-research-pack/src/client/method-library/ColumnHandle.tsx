// ColumnHandle.tsx — 方法库两列的分隔条（拖动 + 方向键调宽）。
//
// 从 MethodLibraryView.tsx 拆出（2026-11-03 审计 P4）。
import { useRef } from 'react'
import type { ReactNode } from 'react'

export function ColumnHandle({ onDrag, value, min, max }: {
  onDrag: (delta: number) => void
  value: number
  min: number
  max: number
}): ReactNode {
  const lastX = useRef<number | null>(null)
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="调整方法库列宽"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') onDrag(-16)
        if (event.key === 'ArrowRight') onDrag(16)
      }}
      style={{ flex: '0 0 5px', cursor: 'col-resize', background: 'transparent', position: 'relative', zIndex: 2, touchAction: 'none' }}
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
      <div style={{ position: 'absolute', left: 2, top: 0, bottom: 0, width: 1, background: 'var(--dsw-alias-border-l1)' }} />
    </div>
  )
}
