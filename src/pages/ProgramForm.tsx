import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Exercise, ProgramExercise } from '../types'

export default function ProgramForm() {
  const { id } = useParams() // id программы, если редактируем существующую
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [programId, setProgramId] = useState<string | null>(id ?? null)

  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [items, setItems] = useState<ProgramExercise[]>([])

  // Поля формы добавления нового упражнения в программу
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(12)
  const [weight, setWeight] = useState<string>('')
  const [restSeconds, setRestSeconds] = useState(60)

  useEffect(() => {
    supabase.from('exercises').select('*, muscle_group:muscle_groups(*)').order('name').then(({ data }) => {
      setAllExercises((data as unknown as Exercise[]) ?? [])
    })
  }, [])

  useEffect(() => {
    if (!programId) return
    supabase.from('programs').select('*').eq('id', programId).single().then(({ data }) => {
      if (data) {
        setName(data.name)
        setNotes(data.notes ?? '')
      }
    })
    loadItems(programId)
  }, [programId])

  async function loadItems(pid: string) {
    const { data } = await supabase
      .from('program_exercises')
      .select('*, exercise:exercises(*)')
      .eq('program_id', pid)
      .order('order_index')
    setItems((data as unknown as ProgramExercise[]) ?? [])
  }

  // Название программы сохраняем сразу (программа должна существовать в БД,
  // чтобы можно было привязывать к ней упражнения)
  async function ensureProgramSaved(): Promise<string | null> {
    if (!name.trim()) {
      alert('Введите название программы')
      return null
    }
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) return null

    if (programId) {
      await supabase.from('programs').update({ name, notes }).eq('id', programId)
      return programId
    } else {
      const { data, error } = await supabase
        .from('programs')
        .insert({ user_id: userId, name, notes })
        .select()
        .single()
      if (error || !data) return null
      setProgramId(data.id)
      return data.id
    }
  }

  async function handleSaveName(e: FormEvent) {
    e.preventDefault()
    const pid = await ensureProgramSaved()
    if (pid) navigate(`/programs/${pid}`, { replace: true })
  }

  async function addExercise() {
    if (!selectedExerciseId) return
    const pid = await ensureProgramSaved()
    if (!pid) return

    const { data } = await supabase
      .from('program_exercises')
      .insert({
        program_id: pid,
        exercise_id: selectedExerciseId,
        sets,
        reps,
        weight: weight ? Number(weight) : null,
        rest_seconds: restSeconds,
        order_index: items.length,
      })
      .select('*, exercise:exercises(*)')
      .single()

    if (data) setItems((prev) => [...prev, data as unknown as ProgramExercise])
    setSelectedExerciseId('')
    setWeight('')
  }

  async function removeItem(itemId: string) {
    await supabase.from('program_exercises').delete().eq('id', itemId)
    setItems((prev) => prev.filter((i) => i.id !== itemId))
  }

  async function move(index: number, direction: -1 | 1) {
    const newItems = [...items]
    const target = index + direction
    if (target < 0 || target >= newItems.length) return
    ;[newItems[index], newItems[target]] = [newItems[target], newItems[index]]
    setItems(newItems)
    // сохраняем новый порядок
    await Promise.all(
      newItems.map((item, idx) =>
        supabase.from('program_exercises').update({ order_index: idx }).eq('id', item.id)
      )
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">
        {programId ? 'Редактировать программу' : 'Новая программа'}
      </h1>

      <form onSubmit={handleSaveName} className="grid gap-4 mb-8 bg-surface border border-line rounded-sm p-4">
        <div>
          <label className="block text-sm mb-1">Название программы</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSaveName}
            placeholder="напр. Ноги и пресс"
            className="w-full border border-line rounded-sm px-3 py-2 bg-base"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Заметки (необязательно)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveName}
            className="w-full border border-line rounded-sm px-3 py-2 bg-base"
          />
        </div>
      </form>

      {!programId ? (
        <p className="text-muted text-sm">Сначала введите название и уберите курсор из поля — программа сохранится, и появится возможность добавить упражнения.</p>
      ) : (
        <>
          <h2 className="font-medium mb-3">Упражнения в программе</h2>

          {items.length > 0 && (
            <div className="grid gap-2 mb-5">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-surface border border-line rounded-sm p-3"
                >
                  <div>
                    <span className="font-medium">{item.exercise?.name}</span>
                    <span className="text-xs text-muted ml-2">
                      {item.sets}×{item.reps}
                      {item.weight ? ` · ${item.weight} кг` : ''} · отдых {item.rest_seconds} сек
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => move(idx, -1)} className="text-muted hover:text-ink" title="Выше">↑</button>
                    <button onClick={() => move(idx, 1)} className="text-muted hover:text-ink" title="Ниже">↓</button>
                    <button onClick={() => removeItem(item.id)} className="text-red-600 hover:underline">Убрать</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-base border border-dashed border-line rounded-sm p-4">
            <h3 className="text-sm font-medium mb-3">Добавить упражнение</h3>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="border border-line rounded-sm px-3 py-2 bg-surface sm:col-span-2"
              >
                <option value="">— выбрать упражнение —</option>
                {allExercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>

              <label className="text-xs text-muted">
                Подходы
                <input
                  type="number"
                  min={1}
                  value={sets}
                  onChange={(e) => setSets(Number(e.target.value))}
                  className="w-full border border-line rounded-sm px-3 py-2 bg-surface mt-1"
                />
              </label>
              <label className="text-xs text-muted">
                Повторения
                <input
                  type="number"
                  min={1}
                  value={reps}
                  onChange={(e) => setReps(Number(e.target.value))}
                  className="w-full border border-line rounded-sm px-3 py-2 bg-surface mt-1"
                />
              </label>
              <label className="text-xs text-muted">
                Вес, кг (необязательно)
                <input
                  type="number"
                  min={0}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full border border-line rounded-sm px-3 py-2 bg-surface mt-1"
                />
              </label>
              <label className="text-xs text-muted">
                Отдых, сек
                <input
                  type="number"
                  min={0}
                  value={restSeconds}
                  onChange={(e) => setRestSeconds(Number(e.target.value))}
                  className="w-full border border-line rounded-sm px-3 py-2 bg-surface mt-1"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={addExercise}
              disabled={!selectedExerciseId}
              className="bg-ink text-white px-4 py-2 rounded-sm text-sm hover:opacity-90 disabled:opacity-50"
            >
              Добавить в программу
            </button>
          </div>

          <button
            onClick={() => navigate('/programs')}
            className="mt-6 text-sm text-muted hover:text-ink"
          >
            ← Готово, вернуться к списку программ
          </button>
        </>
      )}
    </div>
  )
}
