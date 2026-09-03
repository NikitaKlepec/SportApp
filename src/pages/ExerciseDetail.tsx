import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
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
    supabase
      .from('exercises')
      .select('*, muscle_group:muscle_groups(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => setExercise(data as unknown as Exercise))
  }, [id])

  if (!exercise) return <p className="text-muted">Загрузка…</p>

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{exercise.name}</h1>
        <Link
          to={`/exercises/${exercise.id}/edit`}
          className="text-sm border border-line px-3 py-1.5 rounded-sm hover:bg-surface"
        >
          Редактировать
        </Link>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-6 mb-6">
        <div>
          {exercise.image_url && (
            <img
              src={exercise.image_url}
              alt={exercise.name}
              className="w-full rounded-sm border border-line mb-4"
            />
          )}
          {exercise.video_url && (
            <div className="aspect-video">
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
          )}
        </div>

        <div className="flex flex-col items-center">
          <MuscleDiagram
            className="w-24 h-48"
            activeRegionIds={exercise.muscle_group?.svg_region_ids ?? []}
            activeColor={exercise.muscle_group?.color ?? '#DCDFD9'}
          />
          <span className="text-xs text-muted mt-2">{exercise.muscle_group?.name}</span>
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
