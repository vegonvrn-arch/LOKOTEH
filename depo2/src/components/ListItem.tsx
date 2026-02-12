/**
 * @file ListItem — маленький компонент карточки элемента списка с кнопкой удаления.
 */

import React from 'react'
import { Trash2 } from 'lucide-react'

/**
 * Props для ListItem.
 */
interface ListItemProps {
  /** Уникальный идентификатор элемента. */
  id: string
  /** Основной текст элемента. */
  text: string
  /** Обработчик удаления (опционален — защищаемся от отсутствия). */
  onDelete?: (id: string) => void
}

/**
 * ListItem — карточка элемента списка с минималистичным стилем.
 * Компонент гарантирует корректный перенос текста и то, что кнопка удаления остаётся видимой.
 */
export default function ListItem({ id, text, onDelete }: ListItemProps): JSX.Element {
  /**
   * handleClick — вызывает onDelete с id элемента.
   * Используем явную типизацию события и stopPropagation,
   * чтобы избежать побочных эффектов в будущем.
   * @param e — событие клика по кнопке
   */
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    // Защита: если onDelete не передан — просто выходим, чтобы не выбрасывать ошибку
    if (typeof onDelete === 'function') {
      onDelete(id)
    }
  }

  return (
    <div className="flex w-full items-start justify-between gap-3 rounded-md border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md overflow-visible">
      <div className="min-w-0 pr-2">
        <div className="text-sm text-gray-800 break-words">{text}</div>
      </div>

      {/* Кнопка удаления — фиксированного размера, не сжимается, pointer-events-auto чтобы гарантировать кликабельность */}
      <button
        type="button"
        onClick={handleClick}
        aria-label={`Удалить элемент ${id}`}
        className="ml-2 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-transparent bg-red-50 text-red-600 transition hover:bg-red-100 pointer-events-auto"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}