import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { fetchExercises } from '../lib/exercises'
import { Exercise, MuscleGroup } from '../types'
import ExerciseCard from '../components/ExerciseCard'

export default function Exercises() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [mgRes, ex] = await Promise.all([
        supabase.from('muscle_groups').select('*').order('name'),
        fetchExercises(),
      ])
      setMuscleGroups(mgRes.data ?? [])
      setExercises(ex)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-muted">Загрузка…</p>

  const withoutGroup = exercises.filter((e) => e.muscleGroups.length === 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Упражнения</h1>
        <Link
          to="/exercises/new"
          className="bg-ink text-white text-sm px-4 py-2 rounded-sm hover:opacity-90"
        >
          + Добавить упражнение
        </Link>
      </div>

      {/* Упражнение с несколькими группами мышц появится в разделе каждой из них — */}
      {/* это ожидаемо: так его проще найти вне зависимости от того, что тренируете. */}
      {muscleGroups.map((group) => {
        const groupExercises = exercises.filter((e) => e.muscleGroups.some((g) => g.id === group.id))
        if (groupExercises.length === 0) return null
        return (
          <section key={group.id} className="mb-8">
            <h2 className="text-sm font-medium text-muted mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: group.color }} />
              {group.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groupExercises.map((ex) => (
                <ExerciseCard key={ex.id} exercise={ex} />
              ))}
            </div>
          </section>
        )
      })}

      {withoutGroup.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted mb-3">Без группы мышц</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {withoutGroup.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} />
            ))}
          </div>
        </section>
      )}

      {exercises.length === 0 && (
        <p className="text-muted">Пока нет упражнений. Добавьте первое.</p>
      )}
    </div>
  )
}
