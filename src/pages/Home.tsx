import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { CalendarEntry, ProgramExercise } from '../types'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function Home() {
  const [entry, setEntry] = useState<CalendarEntry | null>(null)
  const [items, setItems] = useState<ProgramExercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: entryData } = await supabase
        .from('calendar_entries')
        .select('*, program:programs(*)')
        .eq('date', todayStr())
        .maybeSingle()

      setEntry(entryData as unknown as CalendarEntry)

      if (entryData?.program_id) {
        const { data: exData } = await supabase
          .from('program_exercises')
          .select('*, exercise:exercises(*)')
          .eq('program_id', entryData.program_id)
          .order('order_index')
        setItems((exData as unknown as ProgramExercise[]) ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Сегодня</h1>
      <p className="text-muted mb-6">
        {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {loading ? (
        <p className="text-muted">Загрузка…</p>
      ) : !entry || !entry.program_id ? (
        <div className="bg-surface border border-line rounded-sm p-6 text-center">
          <p className="mb-4 text-muted">На сегодня программа не назначена.</p>
          <Link to="/calendar" className="text-sm bg-ink text-white px-4 py-2 rounded-sm">
            Назначить в календаре
          </Link>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-sm p-5">
          <h2 className="font-medium mb-4">{entry.program?.name}</h2>
          <ul className="grid gap-2 mb-5">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm border-b border-line pb-2">
                <span>{item.exercise?.name}</span>
                <span className="text-muted">
                  {item.sets}×{item.reps}{item.weight ? ` · ${item.weight} кг` : ''}
                </span>
              </li>
            ))}
          </ul>
          <button className="bg-accent text-ink px-5 py-2 rounded-sm font-medium hover:opacity-90">
            Начать тренировку
          </button>
        </div>
      )}
    </div>
  )
}
