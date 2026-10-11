import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { localDateStr } from '../lib/dates'

interface EntryRow {
  id: string
  date: string
  program_id: string | null
  workout_template_id: string | null
}

interface ProgramOption {
  id: string
  name: string
}

interface TemplateOption {
  id: string
  name: string
  programNames: string[]
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date())
  const [entries, setEntries] = useState<Record<string, EntryRow>>({})
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const today = localDateStr()

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const startOffset = (firstDay.getDay() + 6) % 7 // понедельник = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (string | null)[] = Array(startOffset).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${pad(month + 1)}-${pad(d)}`)
    }
    return cells
  }, [year, month])

  // Назначения на дни выбранного месяца
  useEffect(() => {
    async function load() {
      const lastDay = new Date(year, month + 1, 0).getDate()
      const from = `${year}-${pad(month + 1)}-01`
      const to = `${year}-${pad(month + 1)}-${pad(lastDay)}`
      const { data } = await supabase
        .from('calendar_entries')
        .select('*')
        .gte('date', from)
        .lte('date', to)
      const map: Record<string, EntryRow> = {}
      ;((data ?? []) as EntryRow[]).forEach((e) => {
        map[e.date] = e
      })
      setEntries(map)
    }
    load()
  }, [year, month])

  // Списки программ и тренировок для выбора
  useEffect(() => {
    supabase
      .from('programs')
      .select('id, name')
      .order('name')
      .then(({ data }) => setPrograms((data ?? []) as ProgramOption[]))

    supabase
      .from('workout_templates')
      .select('id, name, items:workout_template_programs(order_index, program:programs(name))')
      .order('name')
      .then(({ data }) => {
        setTemplates(
          ((data ?? []) as any[]).map((t) => ({
            id: t.id,
            name: t.name,
            programNames: ((t.items ?? []) as any[])
              .slice()
              .sort((a, b) => a.order_index - b.order_index)
              .map((i) => i.program?.name)
              .filter(Boolean) as string[],
          }))
        )
      })
  }, [])

  function valueFor(entry?: EntryRow) {
    if (entry?.workout_template_id) return `t:${entry.workout_template_id}`
    if (entry?.program_id) return `p:${entry.program_id}`
    return ''
  }

  // value: "" — очистить день, "t:<id>" — тренировка, "p:<id>" — отдельная программа
  async function assign(date: string, value: string) {
    setError(null)
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) return

    const program_id = value.startsWith('p:') ? value.slice(2) : null
    const workout_template_id = value.startsWith('t:') ? value.slice(2) : null

    const { data, error } = await supabase
      .from('calendar_entries')
      .upsert({ user_id: userId, date, program_id, workout_template_id }, { onConflict: 'user_id,date' })
      .select('*')
      .single()

    if (error || !data) {
      setError(`Не удалось сохранить: ${error?.message ?? 'неизвестная ошибка'}`)
      return
    }
    setEntries((prev) => ({ ...prev, [date]: data as EntryRow }))
  }

  const selectedEntry = selectedDate ? entries[selectedDate] : undefined
  const selectedTemplate = selectedEntry?.workout_template_id
    ? templates.find((t) => t.id === selectedEntry.workout_template_id)
    : undefined

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="px-3 py-1 border border-line rounded-sm">←</button>
        <h1 className="text-xl font-semibold">
          {cursor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
        </h1>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="px-3 py-1 border border-line rounded-sm">→</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-muted mb-1">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
          <div key={d} className="text-center">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          const entry = date ? entries[date] : undefined
          const hasWorkout = !!(entry?.program_id || entry?.workout_template_id)
          const isToday = date === today
          return (
            <button
              key={i}
              disabled={!date}
              onClick={() => date && setSelectedDate(date)}
              className={`aspect-square rounded-sm border text-sm flex flex-col items-center justify-center gap-0.5 ${
                date ? 'border-line bg-surface hover:border-ink' : 'border-transparent'
              } ${isToday ? 'ring-2 ring-accent' : ''} ${selectedDate === date ? 'border-ink' : ''}`}
            >
              {date && <span>{parseInt(date.slice(-2))}</span>}
              {hasWorkout && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div className="mt-6 bg-surface border border-line rounded-sm p-4">
          <h3 className="font-medium mb-3">
            {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('ru-RU', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h3>
          <label className="block text-sm mb-1">Тренировка на этот день</label>
          <select
            value={valueFor(selectedEntry)}
            onChange={(e) => assign(selectedDate, e.target.value)}
            className="border border-line rounded-sm px-3 py-2 bg-base w-full"
          >
            <option value="">— без тренировки —</option>
            {templates.length > 0 && (
              <optgroup label="Тренировки (из нескольких программ)">
                {templates.map((t) => (
                  <option key={t.id} value={`t:${t.id}`}>{t.name}</option>
                ))}
              </optgroup>
            )}
            {programs.length > 0 && (
              <optgroup label="Отдельные программы">
                {programs.map((p) => (
                  <option key={p.id} value={`p:${p.id}`}>{p.name}</option>
                ))}
              </optgroup>
            )}
          </select>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2 mt-3">
              {error}
            </p>
          )}

          {selectedTemplate && (
            <p className="text-sm text-muted mt-3">
              Порядок:{' '}
              {selectedTemplate.programNames.length > 0
                ? selectedTemplate.programNames.join(' → ')
                : 'в тренировке пока нет программ'}
              {' · '}
              <Link to={`/templates/${selectedTemplate.id}`} className="text-ink underline">
                Изменить
              </Link>
            </p>
          )}

          {templates.length === 0 && (
            <p className="text-xs text-muted mt-3">
              Хотите собрать тренировку из нескольких программ (разминка + силовая + растяжка)?{' '}
              <Link to="/templates/new" className="text-ink underline">Создать тренировку</Link>
            </p>
          )}
          {programs.length === 0 && (
            <p className="text-xs text-muted mt-2">
              Программ пока нет.{' '}
              <Link to="/programs/new" className="text-ink underline">Создать программу</Link>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
