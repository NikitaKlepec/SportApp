import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ProgramExercise } from '../types'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

type Phase = 'loading' | 'exercise' | 'resting' | 'empty' | 'done'

export default function Workout() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('loading')
  const [items, setItems] = useState<ProgramExercise[]>([])
  const [index, setIndex] = useState(0)
  const [logId, setLogId] = useState<string | null>(null)

  // Фактически введённые значения для текущего упражнения
  const [actualSets, setActualSets] = useState(0)
  const [actualReps, setActualReps] = useState(0)
  const [actualWeight, setActualWeight] = useState<string>('')

  const [secondsLeft, setSecondsLeft] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const current = items[index]

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (!uid) return

      const { data: entry } = await supabase
        .from('calendar_entries')
        .select('*')
        .eq('date', todayStr())
        .maybeSingle()

      if (!entry?.program_id) {
        setPhase('empty')
        return
      }

      const { data: exData } = await supabase
        .from('program_exercises')
        .select('*, exercise:exercises(*)')
        .eq('program_id', entry.program_id)
        .order('order_index')

      const list = (exData as unknown as ProgramExercise[]) ?? []
      if (list.length === 0) {
        setPhase('empty')
        return
      }
      setItems(list)

      // находим или создаём лог тренировки на сегодня
      const { data: existingLog } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('date', todayStr())
        .maybeSingle()

      let currentLogId = existingLog?.id
      if (!currentLogId) {
        const { data: newLog } = await supabase
          .from('workout_logs')
          .insert({ user_id: uid, calendar_entry_id: entry.id, date: todayStr(), status: 'in_progress' })
          .select()
          .single()
        currentLogId = newLog?.id
      }
      setLogId(currentLogId ?? null)

      prefillFor(list[0])
      setPhase('exercise')
    }
    init()
  }, [])

  function prefillFor(item: ProgramExercise) {
    setActualSets(item.sets)
    setActualReps(item.reps)
    setActualWeight(item.weight ? String(item.weight) : '')
  }

  useEffect(() => {
    if (phase !== 'resting') return
    if (secondsLeft <= 0) {
      goToNext()
      return
    }
    timerRef.current = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, secondsLeft])

  async function saveCurrentEntry() {
    if (!logId || !current) return
    await supabase.from('workout_log_entries').insert({
      log_id: logId,
      exercise_id: current.exercise_id,
      actual_sets: actualSets,
      actual_reps: actualReps,
      actual_weight: actualWeight ? Number(actualWeight) : null,
      order_index: index,
    })
  }

  async function handleDoneExercise() {
    await saveCurrentEntry()
    const isLast = index >= items.length - 1
    if (isLast) {
      await finishWorkout()
      return
    }
    if (current.rest_seconds > 0) {
      setSecondsLeft(current.rest_seconds)
      setPhase('resting')
    } else {
      goToNext()
    }
  }

  function goToNext() {
    const nextIndex = index + 1
    if (nextIndex >= items.length) {
      finishWorkout()
      return
    }
    setIndex(nextIndex)
    prefillFor(items[nextIndex])
    setPhase('exercise')
  }

  async function finishWorkout() {
    if (logId) {
      await supabase
        .from('workout_logs')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', logId)
    }
    setPhase('done')
  }

  async function handleSkip() {
    if (!confirm('Прервать тренировку? Прогресс по уже выполненным упражнениям сохранится.')) return
    if (logId) {
      await supabase.from('workout_logs').update({ status: 'skipped' }).eq('id', logId)
    }
    navigate('/')
  }

  if (phase === 'loading') return <p className="text-muted">Загрузка…</p>

  if (phase === 'empty') {
    return (
      <div className="max-w-md">
        <p className="text-muted mb-4">На сегодня не назначена программа с упражнениями.</p>
        <button onClick={() => navigate('/calendar')} className="bg-ink text-white px-4 py-2 rounded-sm text-sm">
          Перейти в календарь
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="max-w-md text-center py-12">
        <div className="text-4xl mb-4">✓</div>
        <h1 className="text-2xl font-semibold mb-2">Тренировка завершена</h1>
        <p className="text-muted mb-6">Отличная работа. Данные сохранены в истории.</p>
        <button onClick={() => navigate('/')} className="bg-accent text-ink px-5 py-2 rounded-sm font-medium">
          На главную
        </button>
      </div>
    )
  }

  if (phase === 'resting') {
    const next = items[index + 1]
    return (
      <div className="max-w-md text-center py-12">
        <p className="text-muted mb-2">Отдых</p>
        <div className="text-6xl font-display font-semibold mb-6">{secondsLeft}</div>
        {next && <p className="text-sm text-muted mb-6">Дальше: {next.exercise?.name}</p>}
        <button
          onClick={() => { if (timerRef.current) clearInterval(timerRef.current); goToNext() }}
          className="text-sm border border-line px-4 py-2 rounded-sm hover:bg-surface"
        >
          Пропустить отдых
        </button>
      </div>
    )
  }

  // phase === 'exercise'
  return (
    <div className="max-w-md">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted">Упражнение {index + 1} из {items.length}</span>
        <button onClick={handleSkip} className="text-xs text-muted hover:text-red-600">Прервать тренировку</button>
      </div>
      <h1 className="text-2xl font-semibold mb-4">{current.exercise?.name}</h1>

      {current.exercise?.image_url && (
        <img src={current.exercise.image_url} alt={current.exercise.name} className="w-full rounded-sm border border-line mb-4" />
      )}

      <p className="text-sm text-muted mb-4">
        План: {current.sets}×{current.reps}{current.weight ? ` · ${current.weight} кг` : ''}
      </p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <label className="text-xs text-muted">
          Подходы
          <input
            type="number"
            min={0}
            value={actualSets}
            onChange={(e) => setActualSets(Number(e.target.value))}
            className="w-full border border-line rounded-sm px-3 py-2 bg-surface mt-1"
          />
        </label>
        <label className="text-xs text-muted">
          Повторения
          <input
            type="number"
            min={0}
            value={actualReps}
            onChange={(e) => setActualReps(Number(e.target.value))}
            className="w-full border border-line rounded-sm px-3 py-2 bg-surface mt-1"
          />
        </label>
        <label className="text-xs text-muted">
          Вес, кг
          <input
            type="number"
            min={0}
            value={actualWeight}
            onChange={(e) => setActualWeight(e.target.value)}
            className="w-full border border-line rounded-sm px-3 py-2 bg-surface mt-1"
          />
        </label>
      </div>

      <button
        onClick={handleDoneExercise}
        className="w-full bg-accent text-ink py-3 rounded-sm font-medium hover:opacity-90"
      >
        {index >= items.length - 1 ? 'Завершить тренировку' : 'Готово, дальше отдых'}
      </button>
    </div>
  )
}
