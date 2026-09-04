import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Program } from '../types'

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: progData } = await supabase.from('programs').select('*').order('name')
      setPrograms(progData ?? [])

      if (progData && progData.length > 0) {
        const { data: peData } = await supabase
          .from('program_exercises')
          .select('program_id')
          .in('program_id', progData.map((p) => p.id))
        const map: Record<string, number> = {}
        ;(peData ?? []).forEach((row: { program_id: string }) => {
          map[row.program_id] = (map[row.program_id] ?? 0) + 1
        })
        setCounts(map)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function deleteProgram(id: string) {
    if (!confirm('Удалить программу? Это также уберёт её из календаря.')) return
    await supabase.from('programs').delete().eq('id', id)
    setPrograms((prev) => prev.filter((p) => p.id !== id))
  }

  if (loading) return <p className="text-muted">Загрузка…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Программы</h1>
        <Link to="/programs/new" className="bg-ink text-white text-sm px-4 py-2 rounded-sm hover:opacity-90">
          + Новая программа
        </Link>
      </div>

      {programs.length === 0 ? (
        <p className="text-muted">
          Пока нет ни одной программы. Программа — это набор упражнений с подходами и
          повторениями, который потом можно назначить на день в календаре.
        </p>
      ) : (
        <div className="grid gap-3">
          {programs.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-surface border border-line rounded-sm p-4"
            >
              <div>
                <h3 className="font-medium">{p.name}</h3>
                <span className="text-xs text-muted">
                  {counts[p.id] ?? 0} упражнени{counts[p.id] === 1 ? 'е' : 'й'}
                </span>
                {p.notes && <p className="text-xs text-muted mt-1">{p.notes}</p>}
              </div>
              <div className="flex gap-3 text-sm">
                <Link to={`/programs/${p.id}`} className="text-ink hover:underline">
                  Изменить
                </Link>
                <button onClick={() => deleteProgram(p.id)} className="text-red-600 hover:underline">
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
