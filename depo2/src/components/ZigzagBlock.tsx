/**
 * @file ZigzagBlock — контейнер, который держит содержимое списка и динамическую SVG-лому.
 * Ломаная создаётся вне скролливаемой области и подстраивается под высоту содержимого.
 */

import React, { useEffect, useRef, useState } from 'react'
import ZigzagLine from './ZigzagLine'

/**
 * Props для ZigzagBlock.
 */
interface ZigzagBlockProps {
  /** Внутренний контент (обычно список). */
  children?: React.ReactNode
  /** Максимальная высота блока в пикселях. */
  maxHeight?: number
  /** Отступ содержимого слева, чтобы не перекрывать ломаную (в px). */
  leftPad?: number
}

/**
 * ZigzagBlock — компонент-обёртка со скроллом и динамической ломаной слева.
 * Ломаная рендерится позади контента и не перехватывает события (pointer-events-none),
 * а высота линии вычисляется по реальной высоте содержимого (scrollHeight).
 */
export default function ZigzagBlock({ children, maxHeight = 480, leftPad = 36 }: ZigzagBlockProps): JSX.Element {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [contentHeight, setContentHeight] = useState<number>(200)

  /**
   * measure — измеряет реальную высоту содержимого (scrollHeight)
   * и обновляет высоту SVG-ломаной.
   */
  const measure = (): void => {
    const el = contentRef.current
    if (!el) return
    // Используем scrollHeight, чтобы учитывать весь контент, в том числе за пределами видимой области
    const h = Math.max(el.scrollHeight, el.clientHeight)
    // Добавим небольшой запас, чтобы линия доходила до нижнего отступа
    setContentHeight(Math.max(40, Math.round(h + 8)))
  }

  useEffect(() => {
    measure()
    const onResize = () => requestAnimationFrame(measure)
    window.addEventListener('resize', onResize)

    // ResizeObserver для отслеживания изменения размеров содержимого
    const el = contentRef.current
    let ro: ResizeObserver | null = null
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        requestAnimationFrame(measure)
      })
      ro.observe(el)
    }

    return () => {
      window.removeEventListener('resize', onResize)
      if (ro) ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Мутации внутри контейнера (добавление/удаление элементов) также должны пересчитывать высоту.
   */
  useEffect(() => {
    const el = contentRef.current
    if (!el || typeof MutationObserver === 'undefined') return
    const obs = new MutationObserver(() => {
      requestAnimationFrame(measure)
    })
    obs.observe(el, { childList: true, subtree: true })
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="relative rounded-lg border border-gray-200 bg-gray-50" style={{ minHeight: 120 }}>
        {/* Ломаная расположена абсолютным слоем позади контента.
            pointer-events-none позволяет кликам по контенту проходить без препятствий. */}
        <div
          className="absolute left-4 top-4 bottom-4 flex items-start pointer-events-none z-0"
          style={{ width: leftPad }}
          aria-hidden
        >
          <ZigzagLine
            height={Math.max(40, contentHeight - 8)}
            width={leftPad}
            amplitude={Math.min(12, leftPad - 8)}
            step={28}
            stroke="#94a3b8"
            strokeWidth={2}
          />
        </div>

        {/* Скроллируемая область с контентом.
            Явно задаём pointer-events-auto и увеличиваем z-index, чтобы гарантировать кликабельность вложенных кнопок. */}
        <div
          ref={contentRef}
          className="relative z-30 pointer-events-auto max-h-[calc(100vh-120px)] overflow-auto p-4"
          style={{ maxHeight, paddingLeft: leftPad + 16, paddingRight: 20 }}
        >
          <div className="space-y-3">{children}</div>
        </div>
      </div>
    </div>
  )
}