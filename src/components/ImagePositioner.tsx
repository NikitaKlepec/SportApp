import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

const FRAME_ASPECT = 16 / 9 // рамка редактирования — под пропорции карточки в списке
const OUTPUT_WIDTH = 1200
const OUTPUT_HEIGHT = Math.round(OUTPUT_WIDTH / FRAME_ASPECT)

export interface ImagePositionerHandle {
  /** Возвращает обрезанное/спозиционированное изображение как File, готовый к загрузке */
  getCroppedFile: () => Promise<File | null>
}

interface Props {
  file: File
}

/**
 * Показывает картинку внутри фиксированной рамки. Саму картинку можно
 * перетаскивать (меняется положение) и тянуть за маркер в правом нижнем
 * углу (меняется масштаб/размер), при этом рамка всегда остаётся
 * полностью заполненной — как в редакторе обложки в соцсетях.
 */
const ImagePositioner = forwardRef<ImagePositionerHandle, Props>(({ file }, ref) => {
  const frameRef = useRef<HTMLDivElement>(null)
  const imgElRef = useRef<HTMLImageElement | null>(null)
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 })
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const dragRef = useRef<{ mode: 'move' | 'resize'; startX: number; startY: number; origPos: { x: number; y: number }; origScale: number } | null>(null)

  function minScaleFor(w: number, h: number, fw: number, fh: number) {
    if (w === 0 || h === 0 || fw === 0 || fh === 0) return 1
    return Math.max(fw / w, fh / h)
  }

  function clamp(nextPos: { x: number; y: number }, nextScale: number, fw: number, fh: number, w: number, h: number) {
    // Минимум — просто чтобы картинка не схлопнулась в точку; полное
    // покрытие рамки больше не навязываем, можно уменьшать сколько угодно.
    const s = Math.min(Math.max(nextScale, 0.05), 8)
    const dispW = w * s
    const dispH = h * s
    // При уменьшении картинки меньше рамки не прижимаем её к краям —
    // даём свободно расположить где угодно, включая просвет фона рамки.
    const minX = dispW < fw ? -Infinity : fw - dispW
    const maxX = dispW < fw ? Infinity : 0
    const minY = dispH < fh ? -Infinity : fh - dispH
    const maxY = dispH < fh ? Infinity : 0
    const x = Math.min(maxX, Math.max(nextPos.x, minX))
    const y = Math.min(maxY, Math.max(nextPos.y, minY))
    return { pos: { x, y }, scale: s }
  }

  // Загружаем файл, узнаём натуральный размер
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgUrl(url)
    const img = new Image()
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Измеряем рамку
  useEffect(() => {
    function measure() {
      if (!frameRef.current) return
      const rect = frameRef.current.getBoundingClientRect()
      setFrameSize({ w: rect.width, h: rect.height })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Начальное позиционирование: по центру, покрывая всю рамку
  useEffect(() => {
    if (!natural.w || !frameSize.w) return
    const initialScale = minScaleFor(natural.w, natural.h, frameSize.w, frameSize.h)
    const x = (frameSize.w - natural.w * initialScale) / 2
    const y = (frameSize.h - natural.h * initialScale) / 2
    setScale(initialScale)
    setPos({ x, y })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural.w, natural.h, frameSize.w, frameSize.h])

  function onPointerDownMove(e: React.PointerEvent) {
    e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragRef.current = { mode: 'move', startX: e.clientX, startY: e.clientY, origPos: pos, origScale: scale }
  }

  function onPointerDownResize(e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragRef.current = { mode: 'resize', startX: e.clientX, startY: e.clientY, origPos: pos, origScale: scale }
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d || !natural.w) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY

    if (d.mode === 'move') {
      const { pos: p, scale: s } = clamp({ x: d.origPos.x + dx, y: d.origPos.y + dy }, d.origScale, frameSize.w, frameSize.h, natural.w, natural.h)
      setPos(p)
      setScale(s)
    } else {
      // масштаб по перетаскиванию правого нижнего угла: расстояние от левого верхнего края картинки до курсора
      const cornerX = d.origPos.x + natural.w * d.origScale
      const targetWidth = cornerX - d.origPos.x + dx
      const newScale = Math.max(0.05, targetWidth / natural.w)
      const { pos: p, scale: s } = clamp(d.origPos, newScale, frameSize.w, frameSize.h, natural.w, natural.h)
      setPos(p)
      setScale(s)
    }
  }

  function onPointerUp() {
    dragRef.current = null
  }

  useImperativeHandle(ref, () => ({
    getCroppedFile: async () => {
      if (!imgElRef.current || !natural.w) return null
      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT_WIDTH
      canvas.height = OUTPUT_HEIGHT
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      const sx = -pos.x / scale
      const sy = -pos.y / scale
      const sWidth = frameSize.w / scale
      const sHeight = frameSize.h / scale

      ctx.drawImage(imgElRef.current, sx, sy, sWidth, sHeight, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT)

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : null),
          'image/jpeg',
          0.9
        )
      })
    },
  }))

  return (
    <div>
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden rounded-sm border border-line bg-base select-none touch-none"
        style={{ aspectRatio: `${FRAME_ASPECT}` }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {imgUrl && (
          <img
            ref={imgElRef}
            src={imgUrl}
            alt=""
            draggable={false}
            onPointerDown={onPointerDownMove}
            className="absolute cursor-move"
            style={{
              left: pos.x,
              top: pos.y,
              width: natural.w * scale,
              height: natural.h * scale,
              maxWidth: 'none',
            }}
          />
        )}
        {/* маркер изменения размера — в правом нижнем углу картинки */}
        {imgUrl && (
          <div
            onPointerDown={onPointerDownResize}
            className="absolute w-4 h-4 bg-accent border-2 border-ink rounded-full cursor-nwse-resize"
            style={{
              left: pos.x + natural.w * scale - 8,
              top: pos.y + natural.h * scale - 8,
            }}
          />
        )}
      </div>
      <p className="text-xs text-muted mt-1">
        Перетащите фото, чтобы задать положение, потяните за точку в углу, чтобы изменить размер.
      </p>
    </div>
  )
})

ImagePositioner.displayName = 'ImagePositioner'
export default ImagePositioner
