import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { CalendarEntry, Program } from '../types'

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date())
  const [entries, setEntries] = useState<Record<string, CalendarEntry>>({})
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = cursor.getFullYear()
  const month = cursor.getMonth()

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

  useEffect(() => {
    async function load() {
      const from = `${year}-${pad(month + 1)}-01`
      const to = `${year}-${pad(month + 1)}-31`
      const { data } = await supabase
        .from('calendar_entries')
        .select('*, program:programs(*)')
        .gte('date', from)
        .lte('date', to)
      const map: Record<string, CalendarEntry> = {}
      ;(data as unknown as CalendarEntry[] ?? []).forEach((e) => { map[e.date] = e })
      setEntries(map)
    }
    load()

    supabase.from('programs').select('*').order('name').then(({ data }) => setPrograms(data ?? []))
  }, [year, month])

  async function assignProgram(date: string, programId: string) {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) return

    await supabase
      .from('calendar_entries')
      .upsert({ user_id: userId, date, program_id: programId || null }, { onConflict: 'user_id,date' })

    setEntries((prev) => ({
      ...prev,
      [date]: { ...(prev[date] ?? { id: '', user_id: userId, date }), program_id: programId },
    }))
  }

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
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((d) => <div key={d} className="text-center">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          const entry = date ? entries[date] : undefined
          const isToday = date === new Date().toISOString().slice(0, 10)
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
              {entry?.program_id && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div className="mt-6 bg-surface border border-line rounded-sm p-4">
          <h3 className="font-medium mb-3">
            {new Date(selectedDate).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <label className="block text-sm mb-1">Программа на этот день</label>
          <select
            value={entries[selectedDate]?.program_id ?? ''}
            onChange={(e) => assignProgram(selectedDate, e.target.value)}
            className="border border-line rounded-sm px-3 py-2 bg-base w-full"
          >
            <option value="">— без программы —</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {programs.length === 0 && (
            <p className="text-xs text-muted mt-2">
              Программ пока нет.{' '}
              <Link to="/programs/new" className="text-ink underline">Создать первую программу</Link>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
