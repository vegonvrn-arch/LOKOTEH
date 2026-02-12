/**
 * @file ZigzagLine — отрисовка вертикальной зигзагообразной линии как SVG.
 * Рисуется по заданной высоте в пикселях; генерация точек ломаной осуществляется здесь.
 */

import React from 'react'

/**
 * Props для ZigzagLine.
 */
interface ZigzagLineProps {
  /** Высота SVG в пикселях. */
  height: number
  /** Ширина линии в пикселях (вьюбокс ширина). */
  width?: number
  /** Амплитуда зигзага (смещение по X в px). */
  amplitude?: number
  /** Расстояние между вершинами по Y в px. */
  step?: number
  /** Цвет линии. */
  stroke?: string
  /** Толщина линии. */
  strokeWidth?: number
}

/**
 * ZigzagLine — компонент SVG, рисующий вертикальную ломаную.
 * Используется как декоративный/ориентирный элемент в блоке.
 */
export default function ZigzagLine({
  height,
  width = 28,
  amplitude = 10,
  step = 24,
  stroke = '#94a3b8',
  strokeWidth = 2,
}: ZigzagLineProps): JSX.Element {
  // Минимальная высота для корректного рендера
  const safeHeight = Math.max(40, Math.round(height))

  // Генерируем точки ломаной: чередуем x=amplitude и x=0
  const points: { x: number; y: number }[] = []
  for (let y = 0; y <= safeHeight; y += step) {
    const idx = Math.round(y / step)
    const x = idx % 2 === 0 ? amplitude : 0
    points.push({ x, y })
  }
  // Убедимся, что линия уходит до конца
  if (points[points.length - 1].y < safeHeight) {
    const idx = points.length
    const x = idx % 2 === 0 ? amplitude : 0
    points.push({ x, y: safeHeight })
  }

  // Собираем атрибут points как строку для polyline
  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <svg
      width={width}
      height={safeHeight}
      viewBox={`0 0 ${width} ${safeHeight}`}
      preserveAspectRatio="none"
      aria-hidden
      className="block pointer-events-none"
    >
      <polyline
        points={pointsAttr}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
