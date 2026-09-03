import { Link } from 'react-router-dom'
import { Exercise } from '../types'

export default function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const color = exercise.muscle_group?.color ?? '#DCDFD9'

  return (
    <Link
      to={`/exercises/${exercise.id}`}
      className="flex bg-surface border border-line rounded-sm overflow-hidden hover:shadow-sm transition-shadow"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="w-24 h-24 shrink-0 bg-base">
        {exercise.image_url ? (
          <img src={exercise.image_url} alt={exercise.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-xs">
            нет фото
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col justify-center">
        <h3 className="font-medium">{exercise.name}</h3>
        <span className="text-xs text-muted">{exercise.muscle_group?.name ?? 'Без группы'}</span>
        {exercise.equipment && (
          <span className="text-xs text-muted">{exercise.equipment}</span>
        )}
      </div>
    </Link>
  )
}
