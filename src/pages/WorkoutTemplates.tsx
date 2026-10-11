import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

interface TemplateRow {
  id: string
  name: string
  notes: string | null
  programNames: string[]
}

export default function WorkoutTemplates() {
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('id, name, notes, items:workout_template_programs(order_index, program:programs(name))')
        .order('name')

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const rows: TemplateRow[] = ((data ?? []) as any[]).map((t) => ({
        id: t.id,
        name: t.name,
        notes: t.notes,
        programNames: ((t.items ?? []) as any[])
          .slice()
          .sort((a, b) => a.order_index - b.order_index)
          .map((i) => i.program?.name)
          .filter(Boolean) as string[],
      }))
      setTemplates(rows)
      setLoading(false)
    }
    load()
  }, [])

  async function deleteTemplate(id: string) {
    if (!confirm('Удалить тренировку? Из календаря она пропадёт, сами программы останутся.')) return
    const { error } = await supabase.from('workout_templates').delete().eq('id', id)
    if (error) {
      setError(`Не удалось удалить: ${error.message}`)
      return
    }
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  if (loading) return <p className="text-muted">Загрузка…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold">Тренировки</h1>
        <Link to="/templates/new" className="bg-ink text-white text-sm px-4 py-2 rounded-sm hover:opacity-90">
          + Новая тренировка
        </Link>
      </div>
      <p className="text-sm text-muted mb-6">
        Тренировка — это несколько программ подряд, например: Разминка → Силовая → Растяжка.
        Собранную тренировку назначаете на день в календаре одним выбором.
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {templates.length === 0 && !error ? (
        <p className="text-muted">Пока нет ни одной тренировки.</p>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 bg-surface border border-line rounded-sm p-4"
            >
              <div className="min-w-0">
                <h3 className="font-medium">{t.name}</h3>
                <p className="text-xs text-muted break-words">
                  {t.programNames.length > 0 ? t.programNames.join(' → ') : 'Программы ещё не добавлены'}
                </p>
                {t.notes && <p className="text-xs text-muted mt-1 break-words">{t.notes}</p>}
              </div>
              <div className="flex gap-3 text-sm shrink-0">
                <Link to={`/templates/${t.id}`} className="text-ink hover:underline">
                  Изменить
                </Link>
                <button onClick={() => deleteTemplate(t.id)} className="text-red-600 hover:underline">
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
