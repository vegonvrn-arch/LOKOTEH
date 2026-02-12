/**
 * @file Home page with a blueprint viewer and editor (segments + polylines).
 *
 * Provides view and edit modes, zoom, persistent storage and small modals.
 */

import React, { useEffect, useRef, useState } from 'react'

/**
 * Describes a highlightable segment on the blueprint.
 */
interface Segment {
  /** Unique identifier. */
  id: string
  /** Short code label (e.g. TP-2). */
  code: string
  /** Optional human-readable title. */
  title: string
  /** Optional details/description. */
  details: string
  /** Top offset in %. */
  top: number
  /** Left offset in %. */
  left: number
  /** Width in %. */
  width: number
  /** Height in %. */
  height: number
  /** Color keyword for styling. */
  color: 'cyan' | 'emerald' | 'amber'
}

/**
 * Point of a polyline in percentage coordinates.
 */
interface PolylinePoint {
  /** X in %. */
  x: number
  /** Y in %. */
  y: number
}

/**
 * Allowed color for polylines.
 */
type PolylineColor = 'cyan' | 'emerald' | 'amber'

/**
 * Allowed dash style for polylines.
 */
type PolylineDashStyle = 'solid' | 'dashed' | 'dotted'

/**
 * Polyline drawn over the blueprint.
 */
interface Polyline {
  /** Unique identifier. */
  id: string
  /** Short label. */
  label: string
  /** Optional description. */
  description: string
  /** Color keyword for styling. */
  color: PolylineColor
  /** Stroke thickness in SVG units. */
  strokeWidth: number
  /** Stroke dash style. */
  dashStyle: PolylineDashStyle
  /** Points. */
  points: PolylinePoint[]
}

/** Storage keys */
const SEGMENTS_STORAGE_KEY = 'blueprint-segments-v2'
const POLYLINES_STORAGE_KEY = 'blueprint-polylines-v1'
const WHEEL_POLYLINES_STORAGE_KEY = 'wheel-modal-polylines-v1'

/** Default segments */
const DEFAULT_SEGMENTS: Segment[] = [
  {
    id: 'tp2',
    code: 'TP-2',
    title: 'Участок TP-2',
    details: 'Выделение рядом с надписью TP-2 в правой верхней части чертежа.',
    top: 13.744785262817327,
    left: 86.56305506441433,
    width: 10,
    height: 7,
    color: 'cyan',
  },
  {
    id: 'otk',
    code: 'OTK',
    title: 'Приёмная OTK (ОТК)',
    details: 'Зона приёмной ОТК на схеме.',
    top: 51.423155845950475,
    left: 24.31348894489884,
    width: 4,
    height: 8,
    color: 'emerald',
  },
  {
    id: 'seg-mljiz58p',
    code: 'КЦ',
    title: 'Колесный цех',
    details: '',
    top: 41.13431810215078,
    left: 75.61856116451851,
    width: 15,
    height: 8,
    color: 'amber',
  },
]

/** Default polylines shown in Home (when nothing in localStorage) */
const DEFAULT_HOME_POLYLINES: Polyline[] = [
  {
    id: 'wheel-poly-mljuz1y8',
    label: 'Линия 1',
    description: '',
    color: 'cyan',
    strokeWidth: 0.3,
    dashStyle: 'dashed',
    points: [
      { x: 15.412186622619629, y: 88.62004089355469 },
      { x: 16.129032135009766, y: 84.09867095947266 },
      { x: 15.770608901977539, y: 18.53879737854004 },
    ],
  },
]

/** URLs for detail images */
const TP2_IMAGE_URL =
  'https://pub-cdn.sider.ai/u/U005HE2ZZKA/web-coder/698db9dbacf1d7aa3a59c612/resource/7a9bee46-9817-4bbb-bca8-db9a2c838107.png'
const WHEEL_SHOP_IMAGE_URL =
  'https://pub-cdn.sider.ai/u/U005HE2ZZKA/web-coder/698db9dbacf1d7aa3a59c612/resource/7b604018-5588-46f4-a4b4-5dfade9de718.jpg'

/**
 * Returns Tailwind classes for a segment color.
 */
function getSegmentColorClasses(color: Segment['color']): {
  border: string
  bg: string
  shadow: string
  badgeText: string
} {
  switch (color) {
    case 'emerald':
      return {
        border: 'border-emerald-400',
        bg: 'bg-emerald-500/12',
        shadow: 'shadow-[0_0_0_1px_rgba(16,185,129,0.55)]',
        badgeText: 'text-emerald-300',
      }
    case 'amber':
      return {
        border: 'border-amber-400',
        bg: 'bg-amber-500/12',
        shadow: 'shadow-[0_0_0_1px_rgba(251,191,36,0.55)]',
        badgeText: 'text-amber-300',
      }
    case 'cyan':
    default:
      return {
        border: 'border-cyan-400',
        bg: 'bg-cyan-500/12',
        shadow: 'shadow-[0_0_0_1px_rgba(34,211,238,0.55)]',
        badgeText: 'text-cyan-300',
      }
  }
}

/**
 * Returns stroke color for polyline by logical color key.
 */
function getPolylineStrokeColor(color: PolylineColor): string {
  switch (color) {
    case 'emerald':
      return '#34d399'
    case 'amber':
      return '#fbbf24'
    case 'cyan':
    default:
      return '#22d3ee'
  }
}

/**
 * Utility: copy JSON to clipboard.
 * @param data - anything serializable to JSON
 * @returns promise resolving to true if success
 */
async function copyJsonToClipboard(data: unknown): Promise<boolean> {
  const json = JSON.stringify(data, null, 2)
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(json)
      return true
    }
  } catch {
    // fallthrough to legacy download approach
  }
  return false
}

/**
 * Utility: download JSON as file.
 * @param data - anything serializable to JSON
 * @param filename - suggested filename
 */
function downloadJsonFile(data: unknown, filename = 'data.json'): void {
  try {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch {
    // ignore
  }
}

/**
 * Layout component that provides a neutral dark background.
 */
function BlueprintBackground({ children }: { children?: React.ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen w-full bg-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),transparent_55%),radial-gradient(circle_at_bottom,_rgba(45,212,191,0.06),transparent_55%)]" />
      <div className="relative z-10 flex min-h-screen flex-col items-stretch justify-start px-4 py-4">
        {children}
      </div>
    </div>
  )
}

/**
 * Modal confirmation dialog for destructive actions.
 */
function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description?: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element | null {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
        <h3 className="text-sm font-semibold text-slate-50">{title}</h3>
        {description && <p className="mt-2 text-xs text-slate-400">{description}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-200 hover:bg-slate-700"
          >
            Отменить
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md border border-red-500/60 bg-red-700 px-3 py-1 text-sm font-semibold text-white hover:bg-red-600"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Renders the blueprint with segment overlays and polylines.
 */
function BlueprintImageWithSegments({
  segments,
  activeSegmentId,
  isEditMode,
  zoom,
  onSelectSegment,
  onSegmentPositionChange,
  onZoomChange,
  onHoverSegmentChange,
  onSegmentClick,
  polylines = [],
  isDrawingPolyline = false,
  activePolylineId,
  onAddPolylinePointFromCanvas,
}: {
  segments: Segment[]
  activeSegmentId: string | null
  isEditMode: boolean
  zoom: number
  onSelectSegment?: (id: string) => void
  onSegmentPositionChange?: (id: string, patch: Pick<Segment, 'top' | 'left'>) => void
  onZoomChange?: (next: number) => void
  onHoverSegmentChange?: (id: string | null) => void
  onSegmentClick?: (segment: Segment) => void
  polylines?: Polyline[]
  isDrawingPolyline?: boolean
  activePolylineId?: string | null
  onAddPolylinePointFromCanvas?: (p: PolylinePoint) => void
}): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [dragState, setDragState] = useState<{
    id: string
    offsetX: number
    offsetY: number
  } | null>(null)
  const [previewPoint, setPreviewPoint] = useState<{ x: number; y: number } | null>(null)

  const clampPercent = (v: number) => {
    if (Number.isNaN(v)) return 0
    if (v < 0) return 0
    if (v > 100) return 100
    return v
  }

  const clientToSvgPercent = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const svgP = pt.matrixTransform(ctm.inverse())
    return { x: clampPercent(svgP.x), y: clampPercent(svgP.y) }
  }

  const handleMouseDown = (event: React.MouseEvent, segment: Segment): void => {
    if (!isEditMode || !onSegmentPositionChange || !svgRef.current) return
    event.preventDefault()
    const point = clientToSvgPercent(event.clientX, event.clientY)
    if (!point) return
    const offsetX = point.x - segment.left
    const offsetY = point.y - segment.top
    setDragState({ id: segment.id, offsetX, offsetY })
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>): void => {
    if (!onZoomChange) return
    event.preventDefault()
    const zoomStep = 0.1
    const minZoom = 0.5
    const maxZoom = 4
    const direction = event.deltaY > 0 ? -1 : 1
    const nextZoom = Math.min(maxZoom, Math.max(minZoom, zoom + direction * zoomStep))
    onZoomChange(Number(nextZoom.toFixed(2)))
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!isEditMode || !isDrawingPolyline || !onAddPolylinePointFromCanvas) return
    if (previewPoint) {
      onAddPolylinePointFromCanvas(previewPoint)
      return
    }
    const point = clientToSvgPercent(event.clientX, event.clientY)
    if (!point) return
    onAddPolylinePointFromCanvas({ x: point.x, y: point.y })
  }

  const handleMouseMoveOnCanvas = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!isEditMode || !isDrawingPolyline) {
      if (previewPoint) setPreviewPoint(null)
      return
    }
    const point = clientToSvgPercent(event.clientX, event.clientY)
    if (!point) {
      if (previewPoint) setPreviewPoint(null)
      return
    }
    setPreviewPoint({ x: point.x, y: point.y })
  }

  useEffect(() => {
    if (!dragState || !onSegmentPositionChange) return
    const handleMouseMove = (event: MouseEvent): void => {
      const img = imgRef.current
      if (!img) return
      const rect = img.getBoundingClientRect()
      const rawLeftPercent = ((event.clientX - rect.left - dragState.offsetX) / rect.width) * 100
      const rawTopPercent = ((event.clientY - rect.top - dragState.offsetY) / rect.height) * 100
      const left = clampPercent(rawLeftPercent)
      const top = clampPercent(rawTopPercent)
      onSegmentPositionChange(dragState.id, { top, left })
    }
    const stopDragging = (): void => setDragState(null)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopDragging)
    window.addEventListener('mouseleave', stopDragging)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopDragging)
      window.removeEventListener('mouseleave', stopDragging)
    }
  }, [dragState, onSegmentPositionChange])

  return (
    <div className="relative h-full w-full overflow-auto">
      <div
        ref={containerRef}
        className="relative inline-block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
        onWheel={handleWheel}
        style={{ width: `${zoom * 100}%` }}
      >
        <img
          ref={imgRef}
          src="https://pub-cdn.sider.ai/u/U005HE2ZZKA/web-coder/698db9dbacf1d7aa3a59c612/resource/b642a1cc-6137-4801-83dc-e031ae9f2213.jpg"
          alt="Чертеж"
          className="block h-auto w-full"
        />

        <svg ref={svgRef} className="pointer-events-none absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none">
          {polylines.map((polyline) => {
            if (!polyline.points || polyline.points.length === 0) return null
            const stroke = getPolylineStrokeColor(polyline.color)
            const isActivePolyline = activePolylineId === polyline.id
            const pointsAttr = polyline.points.map((p) => `${p.x},${p.y}`).join(' ')
            const baseWidth = typeof polyline.strokeWidth === 'number' ? polyline.strokeWidth : 0.7
            const dashStyle = polyline.dashStyle ?? 'solid'
            const dashArray = dashStyle === 'dashed' ? '2,2' : dashStyle === 'dotted' ? '1,1' : undefined
            return (
              <g key={polyline.id}>
                {polyline.points.length >= 2 && (
                  <polyline
                    points={pointsAttr}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={isActivePolyline ? baseWidth + 0.2 : baseWidth}
                    strokeOpacity={isActivePolyline ? 0.95 : 0.8}
                    strokeDasharray={dashArray}
                  />
                )}
                {isEditMode &&
                  polyline.points.map((point, index) => (
                    <circle key={`${polyline.id}-pt-${index}`} cx={point.x} cy={point.y} r={isActivePolyline ? 1.2 : 0.9} fill={stroke} fillOpacity={0.95} />
                  ))}
              </g>
            )
          })}

          {isEditMode && isDrawingPolyline && previewPoint && <circle cx={previewPoint.x} cy={previewPoint.y} r={1} fill="#22d3ee" fillOpacity={0.95} />}
        </svg>

        <div
          className="absolute inset-0 z-30"
          style={{ pointerEvents: isEditMode && isDrawingPolyline ? 'auto' : 'none' }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMoveOnCanvas}
          onMouseLeave={() => setPreviewPoint(null)}
        />

        {segments.map((segment) => {
          const isActive = activeSegmentId === segment.id
          const colorClasses = getSegmentColorClasses(segment.color)
          const baseClasses = ['absolute rounded-lg border-2 transition-all duration-200']
          if (isEditMode) {
            baseClasses.push(colorClasses.border, colorClasses.bg, colorClasses.shadow, 'opacity-80 hover:opacity-100 cursor-move', 'pointer-events-auto')
          } else {
            baseClasses.push('cursor-pointer', 'pointer-events-auto')
            if (isActive) baseClasses.push(colorClasses.border, colorClasses.bg, colorClasses.shadow, 'opacity-100')
            else baseClasses.push('border-transparent', 'bg-transparent', 'opacity-0')
          }
          return (
            <div
              key={segment.id}
              className={baseClasses.join(' ')}
              style={{
                top: `${segment.top}%`,
                left: `${segment.left}%`,
                width: `${segment.width}%`,
                height: `${segment.height}%`,
              }}
              onClick={() => {
                if (isDrawingPolyline) return
                if (isEditMode && onSelectSegment) onSelectSegment(segment.id)
                else if (!isEditMode && onSegmentClick) onSegmentClick(segment)
              }}
              onMouseDown={(event) => handleMouseDown(event, segment)}
              onMouseEnter={() => {
                if (!isEditMode && onHoverSegmentChange) onHoverSegmentChange(segment.id)
              }}
              onMouseLeave={() => {
                if (!isEditMode && onHoverSegmentChange) onHoverSegmentChange(null)
              }}
            >
              {isEditMode && (
                <div
                  className={[
                    'pointer-events-none absolute left-1 top-1 rounded-md bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    colorClasses.badgeText,
                  ].join(' ')}
                >
                  {segment.code || 'SEG'}
                </div>
              )}

              {!isEditMode && isActive && (
                <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-max max-w-xs rounded-lg border border-slate-800 bg-slate-950/95 px-3 py-2 text-xs text-slate-50 shadow-xl">
                  <div
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                      colorClasses.badgeText,
                    ].join(' ')}
                  >
                    <span>{segment.code}</span>
                  </div>
                  {segment.title && <div className="mt-1 font-medium text-slate-50">{segment.title}</div>}
                  {segment.details && <div className="mt-1 text-[11px] leading-snug text-slate-300">{segment.details}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Sidebar for edit mode (controls and import/export).
 */
function BlueprintSidebarEdit({
  segments,
  selectedSegmentId,
  onSelectSegment,
  onUpdateSegment,
  onAddSegment,
  onDeleteSegment,
  onImportSegments,
  onResetToDefault,
  polylines,
  activePolylineId,
  isDrawingPolyline,
  onStartPolyline,
  onFinishPolyline,
  onClearPolylines,
  onUpdatePolyline,
  onSelectPolyline,
  onDeletePolyline,
}: {
  segments: Segment[]
  selectedSegmentId: string | null
  onSelectSegment: (id: string) => void
  onUpdateSegment: (id: string, patch: Partial<Segment>) => void
  onAddSegment: () => void
  onDeleteSegment: (id: string) => void
  onImportSegments: (segments: Segment[]) => void
  onResetToDefault: () => void
  polylines: Polyline[]
  activePolylineId: string | null
  isDrawingPolyline: boolean
  onStartPolyline: () => void
  onFinishPolyline: () => void
  onClearPolylines: () => void
  onUpdatePolyline: (id: string, patch: Partial<Polyline>) => void
  onSelectPolyline: (id: string) => void
  onDeletePolyline: (id: string) => void
}): JSX.Element {
  const selected = segments.find((s) => s.id === selectedSegmentId) || segments[0]

  const clampPercent = (value: number) => {
    if (Number.isNaN(value)) return 0
    if (value < 0) return 0
    if (value > 100) return 100
    return value
  }

  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)

  const normalizeImportedSegments = (raw: unknown): Segment[] | null => {
    if (!Array.isArray(raw)) return null
    const allowedColors: Segment['color'][] = ['cyan', 'emerald', 'amber']
    const toSegmentColor = (value: unknown): Segment['color'] => {
      if (typeof value === 'string' && allowedColors.includes(value as Segment['color'])) return value as Segment['color']
      return 'cyan'
    }
    const safeNumber = (value: unknown, fallback = 0): number => {
      if (typeof value === 'number' && Number.isFinite(value)) return clampPercent(value)
      return fallback
    }
    const result: Segment[] = []
    for (const item of raw) {
      if (!item || typeof item !== 'object') return null
      const obj = item as Record<string, unknown>
      if (typeof obj.id !== 'string' || obj.id.trim().length === 0) return null
      const segment: Segment = {
        id: obj.id,
        code: typeof obj.code === 'string' ? obj.code : 'SEG',
        title: typeof obj.title === 'string' ? obj.title : '',
        details: typeof obj.details === 'string' ? obj.details : '',
        top: safeNumber(obj.top, 0),
        left: safeNumber(obj.left, 0),
        width: safeNumber(obj.width, 10),
        height: safeNumber(obj.height, 8),
        color: toSegmentColor(obj.color),
      }
      result.push(segment)
    }
    return result
  }

  const handleApplyImport = (): void => {
    setImportError(null)
    setImportSuccess(false)
    if (!importText.trim()) {
      setImportError('Вставьте JSON перед импортом.')
      return
    }
    try {
      const parsed = JSON.parse(importText)
      const normalized = normalizeImportedSegments(parsed)
      if (!normalized || normalized.length === 0) {
        setImportError('Некорректный формат данных или пустой список сегментов.')
        return
      }
      onImportSegments(normalized)
      setImportSuccess(true)
    } catch {
      setImportError('Не удалось разобрать JSON. Проверьте формат.')
    }
  }

  const handleCopyJson = async (): Promise<void> => {
    const ok = await copyJsonToClipboard(polylines)
    if (ok) {
      setImportError(null)
      setImportSuccess(true)
    } else {
      setImportError('Clipboard API недоступен. Попробуйте скачать JSON.')
      setImportSuccess(false)
    }
  }

  const handleDownloadJson = (): void => {
    downloadJsonFile(polylines, 'polylines.json')
  }

  const handleCopyAllSegments = async (): Promise<void> => {
    const ok = await copyJsonToClipboard(segments)
    if (ok) {
      setImportError(null)
      setImportSuccess(true)
    } else {
      setImportError('Clipboard API недоступен. Попробуйте скачать JSON.')
      setImportSuccess(false)
    }
  }

  /**
   * currentActivePolylineId — безопасный ID для управления линиями.
   * Если activePolylineId отсутствует (null), используем первую линию из списка.
   */
  const currentActivePolylineId = activePolylineId ?? polylines[0]?.id ?? null
  const currentActivePolyline = polylines.find((p) => p.id === currentActivePolylineId) ?? null

  return (
    <aside className="flex h-full flex-col gap-4">
      <header className="space-y-1.5">
        <h2 className="text-sm font-semibold tracking-tight text-slate-50">Режим редактирования</h2>
        <p className="text-[11px] text-slate-400">
          Добавляйте блоки и задавайте им положение в процентах относительно чертежа.
        </p>
      </header>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-cyan-500/40 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-cyan-100 shadow-sm hover:border-cyan-400 hover:bg-slate-900"
            onClick={onAddSegment}
          >
            + Добавить блок
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-red-500/40 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-red-200 shadow-sm hover:border-red-400 hover:bg-slate-900"
            onClick={onResetToDefault}
          >
            Сбросить схему
          </button>
        </div>
        <span className="text-[11px] text-slate-400">
          Всего блоков: <span className="font-semibold text-slate-100">{segments.length}</span>
        </span>
      </div>

      <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/60 p-1">
        {segments.map((segment) => {
          const isActive = selected && selected.id === segment.id
          return (
            <button
              key={segment.id}
              type="button"
              className={[
                'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[11px]',
                'transition',
                isActive ? 'bg-slate-800 text-slate-50' : 'bg-transparent text-slate-300 hover:bg-slate-800/70',
              ].join(' ')}
              onClick={() => onSelectSegment(segment.id)}
            >
              <span className="flex items-center gap-1.5">
                <span className={['h-2 w-2 rounded-full', getSegmentColorClasses(segment.color).border].join(' ')} />
                <span className="font-semibold uppercase tracking-wide">{segment.code || 'SEG'}</span>
              </span>
              {segment.title && <span className="line-clamp-1 text-[10px] text-slate-400">{segment.title}</span>}
            </button>
          )
        })}
        {segments.length === 0 && <div className="px-2 py-1.5 text-[11px] text-slate-400">Пока нет ни одного блока. Нажмите «Добавить блок».</div>}
      </div>

      {selected ? (
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-100">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Параметры блока</span>
            <button type="button" className="text-[11px] text-red-400 hover:text-red-300" onClick={() => onDeleteSegment(selected.id)}>
              Удалить
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-0.5">
              <span className="block text-[10px] text-slate-400">Код</span>
              <input className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-400" value={selected.code} onChange={(e) => onUpdateSegment(selected.id, { code: e.target.value })} />
            </label>
            <label className="space-y-0.5">
              <span className="block text-[10px] text-slate-400">Цвет</span>
              <select className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-400" value={selected.color} onChange={(e) => onUpdateSegment(selected.id, { color: e.target.value as Segment['color'] })}>
                <option value="cyan">Cyan</option>
                <option value="emerald">Emerald</option>
                <option value="amber">Amber</option>
              </select>
            </label>
          </div>

          <label className="space-y-0.5">
            <span className="block text-[10px] text-slate-400">Название</span>
            <input className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-400" value={selected.title} onChange={(e) => onUpdateSegment(selected.id, { title: e.target.value })} />
          </label>

          <label className="space-y-0.5">
            <span className="block text-[10px] text-slate-400">Описание</span>
            <textarea className="h-16 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-400" value={selected.details} onChange={(e) => onUpdateSegment(selected.id, { details: e.target.value })} />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-0.5">
              <span className="block text-[10px] text-slate-400">Top (%)</span>
              <input type="number" className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-400" value={selected.top} min={0} max={100} step={0.5} onChange={(e) => onUpdateSegment(selected.id, { top: clampPercent(Number(e.target.value)) })} />
            </label>
            <label className="space-y-0.5">
              <span className="block text-[10px] text-slate-400">Left (%)</span>
              <input type="number" className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-400" value={selected.left} min={0} max={100} step={0.5} onChange={(e) => onUpdateSegment(selected.id, { left: clampPercent(Number(e.target.value)) })} />
            </label>
            <label className="space-y-0.5">
              <span className="block text-[10px] text-slate-400">Width (%)</span>
              <input type="number" className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-400" value={selected.width} min={0} max={100} step={0.5} onChange={(e) => onUpdateSegment(selected.id, { width: clampPercent(Number(e.target.value)) })} />
            </label>
            <label className="space-y-0.5">
              <span className="block text-[10px] text-slate-400">Height (%)</span>
              <input type="number" className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-400" value={selected.height} min={0} max={100} step={0.5} onChange={(e) => onUpdateSegment(selected.id, { height: clampPercent(Number(e.target.value)) })} />
            </label>
          </div>

          <p className="text-[10px] text-slate-500">Положение и размеры считаются от границ изображения. Значения 0–100 (%).</p>
          <p className="text-[10px] text-slate-500">Изменения блоков автоматически сохраняются в этом браузере.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/70 p-3 text-[11px] text-slate-400">Нет выбранного блока. Добавьте новый или выберите из списка выше.</div>
      )}

      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Ломаные линии</span>
          <span className="text-[10px] text-slate-400">Линий: <span className="font-semibold text-slate-100">{polylines.length}</span></span>
        </div>
        <p className="text-[10px] text-slate-500">Нажмите «Начать линию», затем кликайте по схеме, чтобы добавить точки. После завершения нажмите «Завершить».</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onStartPolyline} disabled={isDrawingPolyline} className={['rounded-md border px-2 py-1 text-[11px] font-medium shadow-sm', isDrawingPolyline ? 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500' : 'border-emerald-500/60 bg-emerald-600/80 text-emerald-50 hover:bg-emerald-500'].join(' ')}>
            Начать линию
          </button>
          <button type="button" onClick={onFinishPolyline} disabled={!isDrawingPolyline} className={['rounded-md border px-2 py-1 text-[11px] font-medium shadow-sm', !isDrawingPolyline ? 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500' : 'border-cyan-500/60 bg-cyan-600/80 text-cyan-50 hover:bg-cyan-500'].join(' ')}>
            Завершить линию
          </button>
          <button type="button" onClick={onClearPolylines} className="rounded-md border border-red-500/60 bg-slate-900 px-2 py-1 text-[11px] font-medium text-red-200 hover:border-red-400 hover:bg-slate-950">
            Очистить линии
          </button>

          {/* Export / Copy buttons for polylines */}
          <button type="button" onClick={handleCopyJson} className="rounded-md border border-cyan-500/40 bg-slate-900 px-2 py-1 text-[11px] font-medium text-cyan-100 hover:border-cyan-400 hover:bg-slate-950">
            Скопировать линии (JSON)
          </button>
          <button type="button" onClick={handleDownloadJson} className="rounded-md border border-cyan-500/40 bg-slate-900 px-2 py-1 text-[11px] font-medium text-cyan-100 hover:border-cyan-400 hover:bg-slate-950">
            Скачать линии (.json)
          </button>
        </div>

        {polylines.length > 0 && (
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="block text-[10px] text-slate-400">Выбранная линия</span>
                <select className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-cyan-400" value={currentActivePolylineId ?? ''} onChange={(e) => onSelectPolyline(e.target.value)}>
                  {polylines.map((polyline) => (
                    <option key={polyline.id} value={polyline.id}>
                      {polyline.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ml-2 flex items-center gap-2">
                <input className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:border-cyan-400" value={currentActivePolyline?.label ?? ''} onChange={(e) => { if (currentActivePolylineId) onUpdatePolyline(currentActivePolylineId, { label: e.target.value }) }} placeholder="Название линии" />
                <button
                  type="button"
                  onClick={() => {
                    const idToDelete = currentActivePolylineId ?? polylines[0]?.id ?? null
                    if (!idToDelete) return
                    onDeletePolyline(idToDelete)
                  }}
                  className="rounded-md border border-red-500/60 bg-slate-900 px-2 py-1 text-[11px] font-medium text-red-200 hover:border-red-400 hover:bg-slate-950"
                >
                  Удалить
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="space-y-0.5">
                <span className="block text-[10px] text-slate-400">Цвет</span>
                <select className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-cyan-400" value={currentActivePolyline?.color ?? 'cyan'} onChange={(e) => { if (currentActivePolylineId) onUpdatePolyline(currentActivePolylineId, { color: e.target.value as PolylineColor }) }}>
                  <option value="cyan">Cyan</option>
                  <option value="emerald">Emerald</option>
                  <option value="amber">Amber</option>
                </select>
              </label>

              <label className="space-y-0.5">
                <span className="block text-[10px] text-slate-400">Толщина</span>
                <select className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-cyan-400" value={String(currentActivePolyline?.strokeWidth ?? 0.7)} onChange={(e) => { if (currentActivePolylineId) onUpdatePolyline(currentActivePolylineId, { strokeWidth: Number(e.target.value) || 0.7 }) }}>
                  <option value="0.05">Экстра тонкая (0.05)</option>
                  <option value="0.3">Очень тонкая</option>
                  <option value="0.5">Тонкая</option>
                  <option value="0.7">Средняя</option>
                  <option value="1.0">Толстая</option>
                </select>
              </label>

              <label className="space-y-0.5">
                <span className="block text-[10px] text-slate-400">Тип</span>
                <select className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-cyan-400" value={currentActivePolyline?.dashStyle ?? 'solid'} onChange={(e) => { if (currentActivePolylineId) onUpdatePolyline(currentActivePolylineId, { dashStyle: e.target.value as PolylineDashStyle }) }}>
                  <option value="solid">Сплошная</option>
                  <option value="dashed">Штриховая</option>
                  <option value="dotted">Пунктирная</option>
                </select>
              </label>
            </div>
          </div>
        )}
        <p className="text-[10px] text-slate-500">Линии автоматически сохраняются в этом браузере и отображаются и в режиме просмотра.</p>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Импорт / экспорт</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleCopyAllSegments} className="rounded-md border border-cyan-500/40 bg-slate-900 px-2 py-1 text-[10px] font-medium text-cyan-100 hover:border-cyan-400 hover:bg-slate-950">Скопировать JSON</button>
            <button type="button" onClick={() => downloadJsonFile(segments, 'segments.json')} className="rounded-md border border-cyan-500/40 bg-slate-900 px-2 py-1 text-[10px] font-medium text-cyan-100 hover:border-cyan-400 hover:bg-slate-950">Скачать JSON</button>
          </div>
        </div>
        <p className="text-[10px] text-slate-500">Используйте JSON, чтобы перенести схему на другое устройство.</p>
        <textarea className="h-24 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-cyan-400" placeholder='Вставьте сюда JSON' value={importText} onChange={(e) => { setImportText(e.target.value); setImportError(null); setImportSuccess(false) }} />
        <button type="button" onClick={handleApplyImport} className="w-full rounded-md border border-emerald-500/50 bg-emerald-600/80 px-2 py-1.5 text-[11px] font-medium text-emerald-50 hover:bg-emerald-500">Применить импорт</button>
        {importError && <p className="text-[10px] text-red-400">{importError}</p>}
        {importSuccess && !importError && <p className="text-[10px] text-emerald-400">Операция выполнена.</p>}
      </div>
    </aside>
  )
}

/**
 * Modal dialog showing a detailed blueprint image.
 */
function BlueprintDetailModal({ open, title, description, imageUrl, onClose, overlay }: {
  open: boolean
  title: string
  description?: string
  imageUrl: string
  onClose: () => void
  overlay?: React.ReactNode
}): JSX.Element | null {
  if (!open) return null
  const handleOpenInNewWindow = (): void => {
    if (typeof window !== 'undefined') window.open(imageUrl, '_blank', 'noopener,noreferrer')
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-slate-500 hover:bg-slate-800">Закрыть</button>
        </header>
        <div className="flex-1 overflow-auto bg-slate-950">
          <div className="mx-auto max-w-full p-4">
            <div className="relative overflow-auto rounded-lg border border-slate-800 bg-slate-900">
              <img src={imageUrl} alt={title} className="block h-auto max-h-[70vh] w-full object-contain" />
              {overlay}
            </div>
          </div>
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-slate-800 px-4 py-3">
          <p className="text-[11px] text-slate-400">Нажмите «Открыть в новом окне», чтобы подробно рассмотреть схему.</p>
          <button type="button" onClick={handleOpenInNewWindow} className="rounded-md border border-cyan-500/60 bg-cyan-600/80 px-3 py-1.5 text-xs font-semibold text-cyan-50 shadow-sm hover:bg-cyan-500">Открыть в новом окне</button>
        </footer>
      </div>
    </div>
  )
}

/**
 * Wheel detail modal with integrated polyline drawing controls and storage.
 *
 * Renders the wheel shop image and provides a drawing area directly on top of the image,
 * as well as a controls panel under the image inside the modal to name, save and delete lines.
 */
function WheelDetailModal({
  open,
  imageUrl,
  title,
  description,
  onClose,
}: {
  open: boolean
  imageUrl: string
  title: string
  description?: string
  onClose: () => void
}): JSX.Element | null {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const imgContainerRef = useRef<HTMLDivElement | null>(null)

  const [polylines, setPolylines] = useState<Polyline[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem(WHEEL_POLYLINES_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Polyline>[]
          if (Array.isArray(parsed)) {
            return parsed.map((rawP) => ({
              id: String(rawP.id),
              label: typeof rawP.label === 'string' ? rawP.label : 'Линия',
              description: typeof rawP.description === 'string' ? rawP.description : '',
              color: (rawP.color as PolylineColor) ?? 'cyan',
              strokeWidth: typeof rawP.strokeWidth === 'number' && Number.isFinite(rawP.strokeWidth) ? rawP.strokeWidth : 0.7,
              dashStyle: rawP.dashStyle === 'dashed' || rawP.dashStyle === 'dotted' ? (rawP.dashStyle as PolylineDashStyle) : 'solid',
              points: Array.isArray(rawP.points) ? (rawP.points as PolylinePoint[]) : [],
            }))
          }
        }
      }
    } catch {
      // ignore
    }
    return []
  })

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(WHEEL_POLYLINES_STORAGE_KEY, JSON.stringify(polylines))
    } catch {}
  }, [polylines])

  const [activeId, setActiveId] = useState<string | null>(polylines[0]?.id ?? null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [previewPoint, setPreviewPoint] = useState<PolylinePoint | null>(null)

  /**
   * isEditMode — переключатель режима модалки:
   * true  — редактирование (позволяет рисовать, переименовывать, удалять линии)
   * false — просмотр (рисование и правка отключены)
   */
  const [isEditMode, setIsEditMode] = useState<boolean>(false)

  useEffect(() => {
    if (open) {
      // sync active with existing polylines on open
      setActiveId((curr) => curr ?? polylines[0]?.id ?? null)
    }
  }, [open, polylines.length])

  /**
   * Convert client coordinates to percent coordinates in SVG viewBox (0..100).
   */
  const clientToSvgPercent = (clientX: number, clientY: number): PolylinePoint | null => {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const svgP = pt.matrixTransform(ctm.inverse())
    const clamp = (v: number) => {
      if (Number.isNaN(v)) return 0
      if (v < 0) return 0
      if (v > 100) return 100
      return v
    }
    return { x: clamp(svgP.x), y: clamp(svgP.y) }
  }

  /**
   * Handle click on the image container: in edit mode + drawing active, add point.
   */
  const handleContainerClick = (e: React.MouseEvent) => {
    if (!isEditMode || !isDrawing) return
    const p = clientToSvgPercent(e.clientX, e.clientY)
    if (!p) return
    if (!activeId) return
    setPolylines((prev) => prev.map((pl) => (pl.id === activeId ? { ...pl, points: [...pl.points, p] } : pl)))
  }

  /**
   * Preview point while moving mouse — only in edit mode and while drawing.
   */
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isEditMode) {
      if (previewPoint) setPreviewPoint(null)
      return
    }
    if (!isDrawing) {
      if (previewPoint) setPreviewPoint(null)
      return
    }
    const p = clientToSvgPercent(e.clientX, e.clientY)
    if (!p) {
      if (previewPoint) setPreviewPoint(null)
      return
    }
    setPreviewPoint(p)
  }

  /**
   * Start a new line — only allowed in edit mode.
   */
  const startLine = () => {
    if (!isEditMode) return
    const id = `wheel-poly-${Date.now().toString(36)}`
    const newLine: Polyline = { id, label: `Линия ${polylines.length + 1}`, description: '', color: 'cyan', strokeWidth: 0.7, dashStyle: 'solid', points: [] }
    setPolylines((prev) => [...prev, newLine])
    setActiveId(id)
    setIsDrawing(true)
  }

  /**
   * Finish drawing current line.
   */
  const finishLine = () => {
    setIsDrawing(false)
    setPreviewPoint(null)
  }

  const updateActive = (patch: Partial<Polyline>) => {
    if (!activeId) return
    setPolylines((prev) => prev.map((p) => (p.id === activeId ? { ...p, ...patch } : p)))
  }

  const deleteLine = (id: string) => {
    setPolylines((prev) => prev.filter((p) => p.id !== id))
    setActiveId((curr) => (curr === id ? null : curr))
    if (activeId === id) setIsDrawing(false)
  }

  const clearAll = () => {
    setPolylines([])
    setActiveId(null)
    setIsDrawing(false)
  }

  /**
   * Export/copy functions for wheel modal polylines.
   */
  const handleCopyWheelPolylines = async () => {
    const ok = await copyJsonToClipboard(polylines)
    if (!ok) {
      // if clipboard fails, trigger download as fallback
      downloadJsonFile(polylines, 'wheel-polylines.json')
    }
  }

  const handleDownloadWheelPolylines = () => {
    downloadJsonFile(polylines, 'wheel-polylines.json')
  }

  if (!open) return null

  const activePolyline = polylines.find((p) => p.id === activeId) ?? null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="relative flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
          </div>

          {/* Toggle edit/view mode placed in header */}
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400">Режим</div>
            <button
              type="button"
              onClick={() => {
                setIsEditMode((v) => {
                  const next = !v
                  // stopping any ongoing drawing when switching to view
                  if (!next) {
                    setIsDrawing(false)
                    setPreviewPoint(null)
                  }
                  return next
                })
              }}
              className={[
                'relative inline-flex h-6 w-12 items-center rounded-full border px-0.5 transition',
                isEditMode ? 'border-cyan-400 bg-cyan-500/30' : 'border-slate-600 bg-slate-800',
              ].join(' ')}
            >
              <span className={['inline-block h-4 w-4 rounded-full bg-slate-100 shadow transition-transform', isEditMode ? 'translate-x-6' : 'translate-x-0'].join(' ')} />
            </button>

            <button type="button" onClick={onClose} className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-slate-500 hover:bg-slate-800">Закрыть</button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-950 p-4">
          <div className="mx-auto max-w-full">
            <div ref={imgContainerRef} className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-900" onClick={handleContainerClick} onMouseMove={handleMouseMove}>
              {/* Image */}
              <img src={imageUrl} alt={title} className="block h-auto max-h-[65vh] w-full object-contain" />

              {/* SVG overlay positioned to match image via absolute inset-0 and preserveAspectRatio none.
                  We use viewBox 0 0 100 100 and percent coordinates. */}
              <svg ref={svgRef} className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {polylines.map((poly) => {
                  if (!poly.points || poly.points.length === 0) return null
                  const stroke = getPolylineStrokeColor(poly.color)
                  const pointsAttr = poly.points.map((pt) => `${pt.x},${pt.y}`).join(' ')
                  const dashArray = poly.dashStyle === 'dashed' ? '2,2' : poly.dashStyle === 'dotted' ? '1,1' : undefined
                  return (
                    <g key={poly.id}>
                      {poly.points.length >= 2 && (
                        <polyline
                          points={pointsAttr}
                          fill="none"
                          stroke={stroke}
                          strokeWidth={poly.strokeWidth}
                          strokeDasharray={dashArray}
                          strokeOpacity={0.95}
                        />
                      )}
                      {/* render points as small circles */}
                      {poly.points.map((pt, idx) => (
                        <circle key={`${poly.id}-pt-${idx}`} cx={pt.x} cy={pt.y} r={0.9} fill={stroke} opacity={0.95} />
                      ))}
                    </g>
                  )
                })}
                {/* preview point while drawing */}
                {isEditMode && isDrawing && previewPoint && <circle cx={previewPoint.x} cy={previewPoint.y} r={0.9} fill="#22d3ee" opacity={0.95} />}
              </svg>
            </div>

            {/* Drawing controls placed under the image as requested */}
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button onClick={startLine} disabled={!isEditMode || isDrawing} className={['rounded-md px-3 py-1 text-sm font-medium', (!isEditMode || isDrawing) ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed' : 'bg-emerald-600/80 text-emerald-50 border border-emerald-500/50'].join(' ')}>
                    Начать линию
                  </button>
                  <button onClick={finishLine} disabled={!isEditMode || !isDrawing} className={['rounded-md px-3 py-1 text-sm font-medium', (!isEditMode || !isDrawing) ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed' : 'bg-cyan-600/80 text-cyan-50 border border-cyan-500/60'].join(' ')}>
                    Завершить
                  </button>
                  <button onClick={clearAll} className="rounded-md px-3 py-1 text-sm font-medium bg-slate-800 text-red-300 border border-red-500/60">
                    Очистить все
                  </button>
                </div>

                <div className="text-sm text-slate-400">Режим: <span className={isEditMode ? 'font-semibold text-emerald-300' : 'font-semibold text-slate-200'}>{isEditMode ? 'Редактирование' : 'Просмотр'}</span></div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400">Выбранная линия</label>
                  <select className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" value={activeId ?? ''} onChange={(e) => setActiveId(e.target.value || null)}>
                    <option value="">—</option>
                    {polylines.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400">Название</label>
                  <input className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" value={activePolyline?.label ?? ''} onChange={(e) => updateActive({ label: e.target.value })} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <label className="block text-[11px] text-slate-400">Цвет</label>
                  <select className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" value={activePolyline?.color ?? 'cyan'} onChange={(e) => updateActive({ color: e.target.value as PolylineColor })}>
                    <option value="cyan">Cyan</option>
                    <option value="emerald">Emerald</option>
                    <option value="amber">Amber</option>
                  </select>

                  <label className="block text-[11px] text-slate-400">Толщина</label>
                  <select className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" value={String(activePolyline?.strokeWidth ?? 0.7)} onChange={(e) => updateActive({ strokeWidth: Number(e.target.value) || 0.7 })}>
                    <option value="0.05">0.05</option>
                    <option value="0.3">0.3</option>
                    <option value="0.5">0.5</option>
                    <option value="0.7">0.7</option>
                    <option value="1.0">1.0</option>
                  </select>

                  <label className="block text-[11px] text-slate-400">Тип</label>
                  <select className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" value={activePolyline?.dashStyle ?? 'solid'} onChange={(e) => updateActive({ dashStyle: e.target.value as PolylineDashStyle })}>
                    <option value="solid">Сплошная</option>
                    <option value="dashed">Штриховая</option>
                    <option value="dotted">Пунктирная</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!activeId) return
                    deleteLine(activeId)
                  }}
                  className="rounded-md px-3 py-1 text-sm font-medium bg-red-700 text-white border border-red-500/60"
                >
                  Удалить линию
                </button>

                <button
                  onClick={() => {
                    try {
                      window.localStorage.setItem(WHEEL_POLYLINES_STORAGE_KEY, JSON.stringify(polylines))
                    } catch {}
                  }}
                  className="rounded-md px-3 py-1 text-sm font-medium bg-cyan-700 text-white border border-cyan-500/60"
                >
                  Сохранить
                </button>

                {/* Copy / Download wheel polylines JSON */}
                <button onClick={handleCopyWheelPolylines} className="rounded-md px-3 py-1 text-sm font-medium bg-slate-800 text-cyan-200 border border-cyan-500/60">
                  Скопировать JSON
                </button>
                <button onClick={handleDownloadWheelPolylines} className="rounded-md px-3 py-1 text-sm font-medium bg-slate-800 text-cyan-200 border border-cyan-500/60">
                  Скачать (.json)
                </button>

                <div className="ml-auto text-[12px] text-slate-400">Линий: <span className="font-semibold text-slate-100">{polylines.length}</span></div>
              </div>

              {/* List of lines with preview counts */}
              <div className="mt-3 max-h-36 overflow-auto rounded border border-slate-800 bg-slate-950/50 p-2">
                {polylines.length === 0 && <div className="text-sm text-slate-400">Пока нет линий.</div>}
                {polylines.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                      <div style={{ width: 10, height: 10, backgroundColor: getPolylineStrokeColor(p.color), borderRadius: 3 }} />
                      <div>
                        <div className="text-sm font-medium text-slate-100">{p.label}</div>
                        <div className="text-[12px] text-slate-400">Точек: {p.points.length}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActiveId(p.id)} className="text-[12px] text-cyan-200 hover:underline">Выбрать</button>
                      <button onClick={() => deleteLine(p.id)} className="text-[12px] text-red-400">Удалить</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-800 px-4 py-3">
          <p className="text-[11px] text-slate-400">Линии сохраняются локально в браузере.</p>
          <div>
            <button type="button" onClick={() => { try { window.open(imageUrl, '_blank', 'noopener,noreferrer') } catch {} }} className="rounded-md border border-cyan-500/60 bg-cyan-600/80 px-3 py-1.5 text-xs font-semibold text-cyan-50 shadow-sm hover:bg-cyan-500">Открыть в новом окне</button>
            <button type="button" onClick={onClose} className="ml-2 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500 hover:bg-slate-800">Закрыть</button>
          </div>
        </footer>
      </div>
    </div>
  )
}

/**
 * Home page component with blueprint, editable segments and polylines.
 */
export default function Home(): JSX.Element {
  const [segments, setSegments] = useState<Segment[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem(SEGMENTS_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as Segment[]
          if (Array.isArray(parsed)) return parsed
        }
      }
    } catch {}
    return DEFAULT_SEGMENTS
  })

  const [polylines, setPolylines] = useState<Polyline[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem(POLYLINES_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as Array<Partial<Polyline>>
          if (Array.isArray(parsed)) {
            return parsed.map((raw) => ({
              id: String(raw.id),
              label: typeof raw.label === 'string' ? raw.label : 'Линия',
              description: typeof raw.description === 'string' ? raw.description : '',
              color: (raw.color as PolylineColor) ?? 'cyan',
              strokeWidth: typeof raw.strokeWidth === 'number' && Number.isFinite(raw.strokeWidth) ? raw.strokeWidth : 0.7,
              dashStyle: raw.dashStyle === 'dashed' || raw.dashStyle === 'dotted' ? (raw.dashStyle as PolylineDashStyle) : 'solid',
              points: Array.isArray(raw.points) ? (raw.points as PolylinePoint[]) : [],
            }))
          }
        }
      }
    } catch {}
    // fallback to default polylines defined above
    return DEFAULT_HOME_POLYLINES
  })

  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(segments[0]?.id ?? null)
  const [zoom, setZoom] = useState<number>(1)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isTp2ModalOpen, setIsTp2ModalOpen] = useState(false)
  const [isWheelModalOpen, setIsWheelModalOpen] = useState(false)
  const [isDrawingPolyline, setIsDrawingPolyline] = useState(false)
  const [activePolylineId, setActivePolylineId] = useState<string | null>(null)
  const [pendingDeletePolylineId, setPendingDeletePolylineId] = useState<string | null>(null)

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(SEGMENTS_STORAGE_KEY, JSON.stringify(segments))
    } catch {}
  }, [segments])

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(POLYLINES_STORAGE_KEY, JSON.stringify(polylines))
    } catch {}
  }, [polylines])

  const handleAddSegment = (): void => {
    const newId = `seg-${Date.now().toString(36)}`
    const newSegment: Segment = { id: newId, code: `SEG-${segments.length + 1}`, title: '', details: '', top: 10, left: 10, width: 10, height: 8, color: 'amber' }
    setSegments((prev) => [...prev, newSegment])
    setSelectedSegmentId(newId)
  }

  const handleUpdateSegment = (id: string, patch: Partial<Segment>): void => {
    setSegments((prev) => prev.map((segment) => (segment.id === id ? { ...segment, ...patch } : segment)))
  }

  const handleSegmentPositionChange = (id: string, patch: Pick<Segment, 'top' | 'left'>): void => {
    handleUpdateSegment(id, patch)
    setSelectedSegmentId(id)
  }

  const handleDeleteSegment = (id: string): void => {
    setSegments((prev) => prev.filter((s) => s.id !== id))
    setSelectedSegmentId((current) => (current !== id ? current : segments.filter((s) => s.id !== id)[0]?.id ?? null))
    setHoveredSegmentId((current) => (current === id ? null : current))
  }

  const handleImportSegments = (next: Segment[]): void => {
    setSegments(next)
    setSelectedSegmentId(next[0]?.id ?? null)
    setHoveredSegmentId(null)
  }

  const handleResetToDefault = (): void => {
    setSegments(DEFAULT_SEGMENTS)
    setSelectedSegmentId(DEFAULT_SEGMENTS[0]?.id ?? null)
    setHoveredSegmentId(null)
    setZoom(1)
  }

  const handleStartPolyline = (): void => {
    const newId = `poly-${Date.now().toString(36)}`
    const newPolyline: Polyline = { id: newId, label: `Линия ${polylines.length + 1}`, description: '', color: 'cyan', strokeWidth: 0.7, dashStyle: 'solid', points: [] }
    setPolylines((prev) => [...prev, newPolyline])
    setActivePolylineId(newId)
    setIsDrawingPolyline(true)
  }

  const handleAddPolylinePointFromCanvas = (point: PolylinePoint): void => {
    if (!isDrawingPolyline || !activePolylineId) return
    setPolylines((prev) => prev.map((poly) => (poly.id === activePolylineId ? { ...poly, points: [...poly.points, point] } : poly)))
  }

  const handleUpdatePolyline = (id: string, patch: Partial<Polyline>): void => {
    setPolylines((prev) => prev.map((poly) => (poly.id === id ? { ...poly, ...patch } : poly)))
  }

  const handleFinishPolyline = (): void => {
    setIsDrawingPolyline(false)
  }

  const handleClearPolylines = (): void => {
    setIsDrawingPolyline(false)
    setActivePolylineId(null)
    setPolylines([])
  }

  const handleDeletePolyline = (id: string): void => {
    setPolylines((prev) => prev.filter((p) => p.id !== id))
    setActivePolylineId((curr) => (curr !== id ? curr : polylines.filter((p) => p.id !== id)[0]?.id ?? null))
    setIsDrawingPolyline((curr) => (activePolylineId === id ? false : curr))
  }

  const handleToggleEditMode = (): void => {
    setIsEditMode((prev) => {
      const next = !prev
      if (next && !selectedSegmentId && segments.length > 0) setSelectedSegmentId(segments[0].id)
      if (!next) {
        setHoveredSegmentId(null)
        setIsDrawingPolyline(false)
      }
      return next
    })
  }

  const activeSegmentId = isEditMode ? selectedSegmentId : hoveredSegmentId

  /**
   * Export functions for home polylines.
   */
  const handleCopyHomePolylines = async () => {
    const ok = await copyJsonToClipboard(polylines)
    if (!ok) downloadJsonFile(polylines, 'polylines.json')
  }

  const handleDownloadHomePolylines = () => {
    downloadJsonFile(polylines, 'polylines.json')
  }

  return (
    <BlueprintBackground>
      <section className="flex w-full flex-1 flex-col space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Режим</span>
            <div className="mt-0.5 text-sm font-medium text-slate-100">{isEditMode ? 'Редактирование блоков и линий' : 'Просмотр схемы'}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Просмотр</span>
              <button type="button" className={['relative inline-flex h-6 w-11 items-center rounded-full border px-0.5 transition', isEditMode ? 'border-cyan-400 bg-cyan-500/30' : 'border-slate-600 bg-slate-800'].join(' ')} onClick={handleToggleEditMode}>
                <span className={['inline-block h-4 w-4 rounded-full bg-slate-100 shadow transition-transform', isEditMode ? 'translate-x-5' : 'translate-x-0'].join(' ')} />
              </button>
              <span className="text-slate-100">Редактирование</span>
            </div>
            <span className="text-[11px] text-slate-400">Масштаб: <span className="font-semibold text-slate-100">{Math.round(zoom * 100)}%</span></span>
            {isEditMode && <span className="text-[11px] text-slate-400">Ломаная: <span className={isDrawingPolyline ? 'font-semibold text-emerald-300' : 'font-semibold text-slate-200'}>{isDrawingPolyline ? 'рисование' : 'выкл.'}</span></span>}
          </div>
        </div>

        {isEditMode ? (
          <div className="grid h-full min-h-[480px] gap-4 md:grid-cols-[minmax(0,374px)_minmax(0,1fr)]">
            <BlueprintSidebarEdit
              segments={segments}
              selectedSegmentId={selectedSegmentId}
              onSelectSegment={(id) => setSelectedSegmentId(id)}
              onUpdateSegment={handleUpdateSegment}
              onAddSegment={handleAddSegment}
              onDeleteSegment={handleDeleteSegment}
              onImportSegments={handleImportSegments}
              onResetToDefault={handleResetToDefault}
              polylines={polylines}
              activePolylineId={activePolylineId}
              isDrawingPolyline={isDrawingPolyline}
              onStartPolyline={handleStartPolyline}
              onFinishPolyline={handleFinishPolyline}
              onClearPolylines={handleClearPolylines}
              onUpdatePolyline={handleUpdatePolyline}
              onSelectPolyline={(id) => setActivePolylineId(id)}
              onDeletePolyline={(id) => setPendingDeletePolylineId(id)}
            />

            <div className="relative">
              <div className="mb-2 flex items-center gap-2">
                <button onClick={handleCopyHomePolylines} className="rounded-md border border-cyan-500/40 bg-slate-900 px-2 py-1 text-sm text-cyan-100">Скопировать линии (JSON)</button>
                <button onClick={handleDownloadHomePolylines} className="rounded-md border border-cyan-500/40 bg-slate-900 px-2 py-1 text-sm text-cyan-100">Скачать линии (.json)</button>
              </div>
              <BlueprintImageWithSegments
                segments={segments}
                activeSegmentId={activeSegmentId}
                isEditMode={isEditMode}
                zoom={zoom}
                polylines={polylines}
                isDrawingPolyline={isDrawingPolyline}
                activePolylineId={activePolylineId}
                onZoomChange={setZoom}
                onSelectSegment={(id) => {
                  if (isEditMode) setSelectedSegmentId(id)
                }}
                onSegmentPositionChange={handleSegmentPositionChange}
                onAddPolylinePointFromCanvas={handleAddPolylinePointFromCanvas}
              />
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[480px]">
            <div className="mb-2 flex items-center gap-2">
              <button onClick={handleCopyHomePolylines} className="rounded-md border border-cyan-500/40 bg-slate-900 px-2 py-1 text-sm text-cyan-100">Скопировать линии (JSON)</button>
              <button onClick={handleDownloadHomePolylines} className="rounded-md border border-cyan-500/40 bg-slate-900 px-2 py-1 text-sm text-cyan-100">Скачать линии (.json)</button>
            </div>
            <BlueprintImageWithSegments
              segments={segments}
              activeSegmentId={activeSegmentId}
              isEditMode={false}
              zoom={zoom}
              polylines={polylines}
              isDrawingPolyline={false}
              activePolylineId={activePolylineId}
              onZoomChange={setZoom}
              onHoverSegmentChange={(id) => setHoveredSegmentId(id)}
              onSegmentClick={(segment) => {
                const codeUpper = segment.code.toUpperCase()
                const titleLower = segment.title.toLowerCase()
                if (segment.id === 'tp2' || codeUpper === 'TP-2') {
                  setIsTp2ModalOpen(true)
                  return
                }
                if (codeUpper === 'КЦ' || titleLower.includes('колесный цех')) {
                  setIsWheelModalOpen(true)
                }
              }}
            />
          </div>
        )}
      </section>

      <BlueprintDetailModal open={isTp2ModalOpen} title="Участок TP-2 — детальный план" description="Детальный план участка TP-2 с размерами и обозначениями." imageUrl={TP2_IMAGE_URL} onClose={() => setIsTp2ModalOpen(false)} />
      <WheelDetailModal open={isWheelModalOpen} title="Колесный цех — детальный план" description="Детальный план колесного цеха с основными помещениями." imageUrl={WHEEL_SHOP_IMAGE_URL} onClose={() => setIsWheelModalOpen(false)} />

      <ConfirmDialog
        open={Boolean(pendingDeletePolylineId)}
        title="Удалить линию?"
        description={
          pendingDeletePolylineId
            ? `Вы действительно хотите удалить линию \"${polylines.find((p) => p.id === pendingDeletePolylineId)?.label ?? 'без имени'}\"?`
            : undefined
        }
        onCancel={() => setPendingDeletePolylineId(null)}
        onConfirm={() => {
          if (pendingDeletePolylineId) handleDeletePolyline(pendingDeletePolylineId)
          setPendingDeletePolylineId(null)
        }}
      />
    </BlueprintBackground>
  )
}
