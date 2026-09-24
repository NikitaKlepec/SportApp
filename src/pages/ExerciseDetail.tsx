import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchExercise } from '../lib/exercises'
import { Exercise } from '../types'
import MuscleDiagram from '../components/MuscleDiagram'

function toEmbedUrl(url: string) {
  const match = url.match(/(?:youtu\.be\/|v=)([\w-]+)/)
  return match ? `https://www.youtube.com/embed/${match[1]}` : url
}

export default function ExerciseDetail() {
  const { id } = useParams()
  const [exercise, setExercise] = useState<Exercise | null>(null)

  useEffect(() => {
    if (id) fetchExercise(id).then(setExercise)
  }, [id])

  if (!exercise) return <p className="text-muted">Загрузка…</p>

  const activeGroups = exercise.muscleGroups.map((g) => ({
    svgRegionIds: g.svg_region_ids,
    color: g.color,
  }))

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">{exercise.name}</h1>
        <Link
          to={`/exercises/${exercise.id}/edit`}
          className="text-sm border border-line px-3 py-1.5 rounded-sm hover:bg-surface"
        >
          Редактировать
        </Link>
      </div>

      {(exercise.categories.length > 0 || exercise.tags.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {exercise.categories.map((c) => (
            <span key={c.id} className="text-xs px-2 py-1 rounded-full bg-accent/40 text-ink">
              {c.name}
            </span>
          ))}
          {exercise.tags.map((t) => (
            <span key={t.id} className="text-xs px-2 py-1 rounded-full bg-base border border-line text-muted">
              #{t.name}
            </span>
          ))}
        </div>
      )}

      <div className="mb-6">
        {exercise.video_url ? (
          <div className="aspect-video mb-4">
            {exercise.video_source === 'youtube' ? (
              <iframe
                src={toEmbedUrl(exercise.video_url)}
                className="w-full h-full rounded-sm border border-line"
                allowFullScreen
              />
            ) : (
              <video src={exercise.video_url} controls className="w-full h-full rounded-sm border border-line" />
            )}
          </div>
        ) : (
          exercise.image_url && (
            <img
              src={exercise.image_url}
              alt={exercise.name}
              className="w-full rounded-sm border border-line mb-4"
            />
          )
        )}

        <div className="flex flex-col items-center bg-surface border border-line rounded-sm py-3">
          <MuscleDiagram className="w-full max-w-xs" activeGroups={activeGroups} />
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mt-2 px-3">
            {exercise.muscleGroups.map((g) => (
              <span key={g.id} className="text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
                {g.name}
              </span>
            ))}
            {exercise.muscleGroups.length === 0 && (
              <span className="text-xs text-muted">Группа мышц не указана</span>
            )}
          </div>
        </div>
      </div>

      {exercise.equipment && (
        <p className="text-sm text-muted mb-2">Инвентарь: {exercise.equipment}</p>
      )}

      {exercise.description && (
        <p className="whitespace-pre-wrap leading-relaxed">{exercise.description}</p>
      )}
    </div>
  )
}
