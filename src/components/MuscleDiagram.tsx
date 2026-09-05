import Model, { IExerciseData } from 'react-body-highlighter'

/**
 * Показывает анатомическую фигуру человека спереди и сзади с подсветкой
 * выбранной группы мышц. Сами SVG-фигуры взяты из открытой библиотеки
 * react-body-highlighter (MIT), а не нарисованы вручную — это даёт
 * нормальную анатомическую детализацию вместо самодельных капсул.
 *
 * activeRegionIds должен содержать "слаги" из списка, поддерживаемого
 * библиотекой (см. muscle_groups.svg_region_ids в базе):
 *   chest, biceps, triceps, forearm, front-deltoids, back-deltoids,
 *   abs, obliques, trapezius, upper-back, lower-back,
 *   quadriceps, hamstring, adductor, abductors, calves, gluteal
 */
interface MuscleDiagramProps {
  activeRegionIds: string[]
  activeColor: string
  className?: string
}

export default function MuscleDiagram({ activeRegionIds, activeColor, className }: MuscleDiagramProps) {
  const data: IExerciseData[] =
    activeRegionIds.length > 0
      ? [{ name: 'Выбранная группа', muscles: activeRegionIds as any }]
      : []

  return (
    <div className={className} style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
      <Model
        data={data}
        type="anterior"
        bodyColor="#D9DBD5"
        highlightedColors={[activeColor]}
        style={{ width: '48%', maxWidth: 130 }}
      />
      <Model
        data={data}
        type="posterior"
        bodyColor="#D9DBD5"
        highlightedColors={[activeColor]}
        style={{ width: '48%', maxWidth: 130 }}
      />
    </div>
  )
}
