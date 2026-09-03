/**
 * Упрощённая схематическая фигура человека (спереди).
 * Каждая зона — отдельный <path>/<rect> с id, соответствующим
 * muscle_groups.svg_region_ids из БД. Активная зона подсвечивается
 * переданным цветом, остальные — нейтральным серым.
 */
interface MuscleDiagramProps {
  activeRegionIds: string[]
  activeColor: string
  className?: string
}

export default function MuscleDiagram({ activeRegionIds, activeColor, className }: MuscleDiagramProps) {
  const isActive = (id: string) => activeRegionIds.includes(id)
  const fill = (id: string) => (isActive(id) ? activeColor : '#DCDFD9')

  return (
    <svg
      viewBox="0 0 200 400"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Голова */}
      <circle cx="100" cy="30" r="22" fill="#DCDFD9" />

      {/* Плечи */}
      <path id="shoulders" d="M55 60 L145 60 L155 90 L45 90 Z" fill={fill('shoulders')} />

      {/* Грудь */}
      <rect id="chest" x="70" y="90" width="60" height="45" rx="6" fill={fill('chest')} />

      {/* Пресс */}
      <rect id="abs" x="78" y="138" width="44" height="55" rx="4" fill={fill('abs')} />

      {/* Спина — показываем как контур по бокам торса (условно, вид сзади не рисуем отдельно) */}
      <rect id="back" x="55" y="90" width="15" height="103" rx="4" fill={fill('back')} />
      <rect id="back" x="130" y="90" width="15" height="103" rx="4" fill={fill('back')} />

      {/* Руки */}
      <rect id="arms_left" x="20" y="90" width="20" height="90" rx="8" fill={fill('arms_left')} />
      <rect id="arms_right" x="160" y="90" width="20" height="90" rx="8" fill={fill('arms_right')} />

      {/* Ноги */}
      <rect id="legs_front" x="75" y="196" width="20" height="120" rx="6" fill={fill('legs_front')} />
      <rect id="legs_back" x="105" y="196" width="20" height="120" rx="6" fill={fill('legs_back')} />

      {/* Стопы */}
      <rect x="72" y="318" width="26" height="12" rx="4" fill="#DCDFD9" />
      <rect x="102" y="318" width="26" height="12" rx="4" fill="#DCDFD9" />
    </svg>
  )
}
