import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Exercise, MuscleGroup } from '../types'
import ExerciseCard from '../components/ExerciseCard'

export default function Exercises() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: mg }, { data: ex }] = await Promise.all([
        supabase.from('muscle_groups').select('*').order('name'),
        supabase
          .from('exercises')
          .select('*, muscle_group:muscle_groups(*)')
          .order('name'),
      ])
      setMuscleGroups(mg ?? [])
      setExercises((ex as unknown as Exercise[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-muted">Загрузка…</p>

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

      {muscleGroups.map((group) => {
        const groupExercises = exercises.filter((e) => e.muscle_group_id === group.id)
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

      {exercises.length === 0 && (
        <p className="text-muted">Пока нет упражнений. Добавьте первое.</p>
      )}
    </div>
  )
}
