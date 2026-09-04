/**
 * Схематическая фигура человека спереди и сзади.
 * Каждая мышечная зона подсвечивается, если её id есть в activeRegionIds
 * (значение приходит из muscle_groups.svg_region_ids). Неактивные зоны
 * остаются нейтрально-серыми и сливаются с общим силуэтом тела.
 *
 * Доступные id зон:
 *  Спереди: shoulders, chest, abs, biceps, forearms, quads, calves
 *  Сзади:   traps, back, triceps, glutes, hamstrings
 *  Общие (видны в обоих видах): forearms, calves
 */
interface MuscleDiagramProps {
  activeRegionIds: string[]
  activeColor: string
  className?: string
}

const BASE = '#E4E6E0'   // тело/силуэт
const STROKE = '#C6C9C1' // контур
const NEUTRAL = '#D3D6CD' // невыбранная мышечная зона (чуть темнее тела)

export default function MuscleDiagram({ activeRegionIds, activeColor, className }: MuscleDiagramProps) {
  const isActive = (key: string) => activeRegionIds.includes(key)
  const fill = (key: string) => (isActive(key) ? activeColor : NEUTRAL)

  // Один силуэт (голова, шея, торс-основа, руки-основа, ноги-основа),
  // мышечные зоны рисуются поверх него отдельными фигурами.
  function Silhouette() {
    return (
      <>
        <circle cx="70" cy="24" r="18" fill={BASE} stroke={STROKE} strokeWidth="1" />
        <rect x="58" y="40" width="24" height="14" fill={BASE} stroke={STROKE} strokeWidth="1" />
        <path
          d="M18 62 Q70 46 122 62 L130 128 Q70 148 10 128 Z"
          fill={BASE}
          stroke={STROKE}
          strokeWidth="1"
        />
        <path d="M38 126 L102 126 L110 178 L30 178 Z" fill={BASE} stroke={STROKE} strokeWidth="1" />
        <rect x="10" y="60" width="18" height="80" rx="9" fill={BASE} stroke={STROKE} strokeWidth="1" />
        <rect x="112" y="60" width="18" height="80" rx="9" fill={BASE} stroke={STROKE} strokeWidth="1" />
        <rect x="34" y="178" width="30" height="95" rx="12" fill={BASE} stroke={STROKE} strokeWidth="1" />
        <rect x="76" y="178" width="30" height="95" rx="12" fill={BASE} stroke={STROKE} strokeWidth="1" />
        <rect x="36" y="270" width="24" height="75" rx="11" fill={BASE} stroke={STROKE} strokeWidth="1" />
        <rect x="80" y="270" width="24" height="75" rx="11" fill={BASE} stroke={STROKE} strokeWidth="1" />
        <ellipse cx="47" cy="352" rx="14" ry="7" fill={BASE} stroke={STROKE} strokeWidth="1" />
        <ellipse cx="93" cy="352" rx="14" ry="7" fill={BASE} stroke={STROKE} strokeWidth="1" />
      </>
    )
  }

  return (
    <svg viewBox="0 0 320 370" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* ===================== СПЕРЕДИ ===================== */}
      <g>
        <Silhouette />

        {/* Плечи (дельты) */}
        <ellipse cx="24" cy="66" rx="15" ry="19" fill={fill('shoulders')} />
        <ellipse cx="116" cy="66" rx="15" ry="19" fill={fill('shoulders')} />

        {/* Грудь */}
        <path d="M42 68 Q70 58 98 68 L94 104 Q70 116 46 104 Z" fill={fill('chest')} />

        {/* Пресс */}
        <rect x="58" y="106" width="24" height="42" rx="6" fill={fill('abs')} />

        {/* Бицепсы */}
        <rect x="9" y="80" width="17" height="42" rx="8" fill={fill('biceps')} />
        <rect x="114" y="80" width="17" height="42" rx="8" fill={fill('biceps')} />

        {/* Предплечья (передняя проекция) */}
        <rect x="9" y="124" width="16" height="38" rx="8" fill={fill('forearms')} />
        <rect x="115" y="124" width="16" height="38" rx="8" fill={fill('forearms')} />

        {/* Квадрицепсы */}
        <rect x="36" y="182" width="26" height="82" rx="12" fill={fill('quads')} />
        <rect x="78" y="182" width="26" height="82" rx="12" fill={fill('quads')} />

        {/* Икры (передняя проекция) */}
        <rect x="38" y="274" width="20" height="66" rx="9" fill={fill('calves')} />
        <rect x="82" y="274" width="20" height="66" rx="9" fill={fill('calves')} />
      </g>

      {/* ===================== СЗАДИ ===================== */}
      <g transform="translate(180 0)">
        <Silhouette />

        {/* Трапеции */}
        <path d="M46 60 Q70 50 94 60 L88 82 Q70 90 52 82 Z" fill={fill('traps')} />

        {/* Спина (широчайшие) */}
        <path d="M40 84 Q70 76 100 84 L96 122 Q70 132 44 122 Z" fill={fill('back')} />

        {/* Трицепсы */}
        <rect x="9" y="80" width="17" height="42" rx="8" fill={fill('triceps')} />
        <rect x="114" y="80" width="17" height="42" rx="8" fill={fill('triceps')} />

        {/* Предплечья (задняя проекция — та же группа, что и спереди) */}
        <rect x="9" y="124" width="16" height="38" rx="8" fill={fill('forearms')} />
        <rect x="115" y="124" width="16" height="38" rx="8" fill={fill('forearms')} />

        {/* Ягодицы */}
        <path d="M38 126 Q70 118 102 126 L98 162 Q70 172 42 162 Z" fill={fill('glutes')} />

        {/* Задняя поверхность бедра */}
        <rect x="36" y="182" width="26" height="82" rx="12" fill={fill('hamstrings')} />
        <rect x="78" y="182" width="26" height="82" rx="12" fill={fill('hamstrings')} />

        {/* Икры (задняя проекция — та же группа) */}
        <rect x="38" y="274" width="20" height="66" rx="9" fill={fill('calves')} />
        <rect x="82" y="274" width="20" height="66" rx="9" fill={fill('calves')} />
      </g>
    </svg>
  )
}
