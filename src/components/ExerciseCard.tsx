import { Link } from 'react-router-dom'
import { Exercise } from '../types'

export default function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const color = exercise.muscleGroups[0]?.color ?? '#DCDFD9'
  const groupNames = exercise.muscleGroups.map((g) => g.name).join(', ')

  return (
    <Link
      to={`/exercises/${exercise.id}`}
      className="flex bg-surface border border-line rounded-sm overflow-hidden hover:shadow-sm transition-shadow"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="p-3 flex flex-col justify-center min-w-0 gap-0.5" style={{ flexBasis: '30%', flexGrow: 0, flexShrink: 0 }}>
        <h3 className="font-medium truncate text-sm">{exercise.name}</h3>
        <span className="text-xs text-muted truncate">{groupNames || 'Без группы'}</span>
        {exercise.equipment && (
          <span className="text-xs text-muted truncate">{exercise.equipment}</span>
        )}
        {(exercise.categories.length > 0 || exercise.tags.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {exercise.categories.map((c) => (
              <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/40 text-ink">
                {c.name}
              </span>
            ))}
            {exercise.tags.map((t) => (
              <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-base border border-line text-muted">
                #{t.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="h-32 bg-base" style={{ flexBasis: '70%', flexGrow: 0, flexShrink: 0 }}>
        {exercise.image_url ? (
          <img src={exercise.image_url} alt={exercise.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-xs text-center px-1">
            нет фото
          </div>
        )}
      </div>
    </Link>
  )
}
