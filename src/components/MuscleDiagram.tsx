import Model, { IExerciseData } from 'react-body-highlighter'

/**
 * Показывает анатомическую фигуру человека спереди и сзади (на базе
 * открытой библиотеки react-body-highlighter, MIT). В отличие от простого
 * варианта с одним общим цветом, здесь КАЖДАЯ выбранная группа мышц
 * подсвечивается своим собственным цветом одновременно — для этого поверх
 * базового силуэта рисуется по одному прозрачному слою на каждую активную
 * группу (bodyColor="transparent"), так слои не перекрывают друг друга.
 */
interface ActiveGroup {
  svgRegionIds: string[]
  color: string
}

interface MuscleDiagramProps {
  activeGroups: ActiveGroup[]
  className?: string
}

function View({ type, activeGroups }: { type: 'anterior' | 'posterior'; activeGroups: ActiveGroup[] }) {
  return (
    <div style={{ position: 'relative', width: '48%', maxWidth: 130 }}>
      {/* базовый серый силуэт */}
      <Model data={[]} type={type} bodyColor="#D9DBD5" highlightedColors={[]} style={{ width: '100%' }} />

      {/* по слою на каждую активную группу, каждый — своим цветом, остальное прозрачно */}
      {activeGroups.map((g, i) => {
        if (g.svgRegionIds.length === 0) return null
        const data: IExerciseData[] = [{ name: `group-${i}`, muscles: g.svgRegionIds as any }]
        return (
          <div key={i} style={{ position: 'absolute', inset: 0 }}>
            <Model
              data={data}
              type={type}
              bodyColor="transparent"
              highlightedColors={[g.color]}
              style={{ width: '100%' }}
            />
          </div>
        )
      })}
    </div>
  )
}

export default function MuscleDiagram({ activeGroups, className }: MuscleDiagramProps) {
  return (
    <div className={className} style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
      <View type="anterior" activeGroups={activeGroups} />
      <View type="posterior" activeGroups={activeGroups} />
    </div>
  )
}
