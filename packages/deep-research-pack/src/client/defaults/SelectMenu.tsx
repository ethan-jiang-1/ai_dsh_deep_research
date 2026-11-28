// SelectMenu.tsx — 项目默认面板下拉控件，使用 DSH 原生 Menu 原语替换原生 <select>。
import { useState, type ReactNode } from 'react'
import { IconChevronDownOutlineRegular, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './defaults.module.css'

export interface SelectMenuOption {
  readonly value: string
  readonly label: string
}

export interface SelectMenuProps {
  readonly testId: string
  readonly ariaLabel: string
  readonly value: string
  readonly options: readonly SelectMenuOption[]
  readonly disabled?: boolean | undefined
  readonly className?: string | undefined
  readonly onChange: (value: string) => void
}

/** 用 DSH Menu 原语包装的单选下拉按钮；保留 value 属性供无浏览器单测断言。 */
export function SelectMenu(props: SelectMenuProps): ReactNode {
  const { testId, ariaLabel, value, options, disabled = false, className = '', onChange } = props
  const [open, setOpen] = useState(false)
  const current = options.find((item) => item.value === value)
  const items = options.map((item) => ({ id: item.value, label: item.label }))

  const trigger = (
    <button
      type="button"
      data-testid={testId}
      aria-label={ariaLabel}
      aria-haspopup="menu"
      aria-expanded={open}
      value={value}
      data-value={value}
      disabled={disabled}
      className={css.selectButton}
      onClick={() => { setOpen((prev) => !prev) }}
    >
      <span className={css.selectLabel}>{current?.label ?? value}</span>
      <IconChevronDownOutlineRegular size={12} />
    </button>
  )

  return (
    <Menu
      open={open}
      anchor={trigger}
      items={items}
      selectedId={value}
      portal
      minWidthFromAnchor
      className={className === '' ? undefined : className}
      onSelect={(id) => {
        onChange(id)
        setOpen(false)
      }}
      onClose={() => { setOpen(false) }}
    />
  )
}
