import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

interface ProgramOption {
  id: string
  name: string
  count: number
}

interface LinkRow {
  id: string
  program_id: string
  order_index: number
  name: string
}

function toLinkRow(l: any): LinkRow {
  return {
    id: l.id,
    program_id: l.program_id,
    order_index: l.order_index,
    name: l.program?.name ?? '—',
  }
}

export default function WorkoutTemplateForm() {
  const { id } = useParams() // id тренировки, если редактируем существующую
  const navigate = useNavigate()

  const [templateId, setTemplateId] = useState<string | null>(id ?? null)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [nameError, setNameError] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [links, setLinks] = useState<LinkRow[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState('')

  // Список всех программ (с количеством упражнений) для выпадающего списка
  useEffect(() => {
    async function loadPrograms() {
      const [{ data: progs }, { data: pe }] = await Promise.all([
        supabase.from('programs').select('id, name').order('name'),
        supabase.from('program_exercises').select('program_id'),
      ])
      const counts: Record<string, number> = {}
      ;((pe ?? []) as { program_id: string }[]).forEach((r) => {
        counts[r.program_id] = (counts[r.program_id] ?? 0) + 1
      })
      setPrograms(
        ((progs ?? []) as { id: string; name: string }[]).map((p) => ({
          id: p.id,
          name: p.name,
          count: counts[p.id] ?? 0,
        }))
      )
    }
    loadPrograms()
  }, [])

  useEffect(() => {
    if (!templateId) return
    async function load(tid: string) {
      const { data: t } = await supabase.from('workout_templates').select('*').eq('id', tid).maybeSingle()
      if (t) {
        setName(t.name)
        setNotes(t.notes ?? '')
      }
      await loadLinks(tid)
    }
    load(templateId)
  }, [templateId])

  async function loadLinks(tid: string) {
    const { data } = await supabase
      .from('workout_template_programs')
      .select('id, program_id, order_index, program:programs(name)')
      .eq('template_id', tid)
      .order('order_index')
    setLinks(((data ?? []) as any[]).map(toLinkRow))
  }

  // Создание новой тренировки — только по явному нажатию кнопки
  async function handleCreate() {
    if (!name.trim()) {
      setNameError(true)
      return
    }
    setNameError(false)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) return

    const { data, error } = await supabase
      .from('workout_templates')
      .insert({ user_id: userId, name: name.trim(), notes })
      .select()
      .single()

    if (error || !data) {
      setError(`Не удалось создать тренировку: ${error?.message ?? 'неизвестная ошибка'}`)
      return
    }
    setTemplateId(data.id)
    navigate(`/templates/${data.id}`, { replace: true })
  }

  // Сохранение названия/заметок уже существующей тренировки
  async function handleSaveEdit() {
    if (!templateId) return
    if (!name.trim()) {
      setNameError(true)
      return
    }
    setNameError(false)
    setError(null)

    const { error } = await supabase
      .from('workout_templates')
      .update({ name: name.trim(), notes })
      .eq('id', templateId)

    if (error) {
      setError(`Не удалось сохранить: ${error.message}`)
      return
    }
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  function handleCancel() {
    navigate('/templates')
  }

  async function addProgram() {
    if (!selectedProgramId || !templateId) return
    setError(null)
    // следующий порядковый номер = максимальный + 1 (после удалений в нумерации могут быть пропуски)
    const nextIndex = links.length > 0 ? Math.max(...links.map((l) => l.order_index)) + 1 : 0

    const { data, error } = await supabase
      .from('workout_template_programs')
      .insert({ template_id: templateId, program_id: selectedProgramId, order_index: nextIndex })
      .select('id, program_id, order_index, program:programs(name)')
      .single()

    if (error || !data) {
      setError(`Не удалось добавить программу: ${error?.message ?? 'неизвестная ошибка'}`)
      return
    }
    setLinks((prev) => [...prev, toLinkRow(data)])
    setSelectedProgramId('')
  }

  async function removeLink(linkId: string) {
    const { error } = await supabase.from('workout_template_programs').delete().eq('id', linkId)
    if (error) {
      setError(`Не удалось убрать программу: ${error.message}`)
      return
    }
    setLinks((prev) => prev.filter((l) => l.id !== linkId))
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= links.length) return
    const next = [...links]
    ;[next[index], next[target]] = [next[target], next[index]]
    const reindexed = next.map((l, i) => ({ ...l, order_index: i }))
    setLinks(reindexed)
    await Promise.all(
      reindexed.map((l) =>
        supabase.from('workout_template_programs').update({ order_index: l.order_index }).eq('id', l.id)
      )
    )
  }

  const countFor = (programId: string) => programs.find((p) => p.id === programId)?.count ?? 0

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">
        {templateId ? 'Редактировать тренировку' : 'Новая тренировка'}
      </h1>

      <div className="grid gap-4 mb-8 bg-surface border border-line rounded-sm p-4">
        <div>
          <label className="block text-sm mb-1">Название тренировки</label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (nameError) setNameError(false)
            }}
            placeholder="напр. День груди"
            className={`w-full border rounded-sm px-3 py-2 bg-base ${nameError ? 'border-red-500' : 'border-line'}`}
          />
          {nameError && <p className="text-red-600 text-xs mt-1">Введите название тренировки</p>}
        </div>
        <div>
          <label className="block text-sm mb-1">Заметки (необязательно)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-line rounded-sm px-3 py-2 bg-base"
          />
        </div>
        <div className="flex items-center gap-3">
          {templateId ? (
            <button
              type="button"
              onClick={handleSaveEdit}
              className="bg-ink text-white px-4 py-2 rounded-sm text-sm hover:opacity-90"
            >
              Сохранить
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              className="bg-ink text-white px-4 py-2 rounded-sm text-sm hover:opacity-90"
            >
              Создать тренировку
            </button>
          )}
          <button type="button" onClick={handleCancel} className="text-sm text-muted hover:text-ink px-2">
            Отмена
          </button>
          {justSaved && <span className="text-xs text-green-600">Сохранено</span>}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {!templateId && (
        <p className="text-muted text-sm">
          Сначала создайте тренировку — после этого появится возможность добавлять в неё программы.
        </p>
      )}

      {templateId && (
        <>
          <h2 className="font-medium mb-1">Программы в тренировке</h2>
          <p className="text-xs text-muted mb-3">
            Программы проходятся строго по порядку сверху вниз. Одну и ту же программу можно
            добавить несколько раз.
          </p>

          {links.length > 0 && (
            <div className="grid gap-2 mb-3">
              {links.map((l, idx) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-3 bg-surface border border-line rounded-sm p-3"
                >
                  <div className="min-w-0">
                    <span className="text-xs text-muted mr-2">{idx + 1}.</span>
                    <span className="font-medium">{l.name}</span>
                    <span className={`text-xs ml-2 ${countFor(l.program_id) === 0 ? 'text-red-600' : 'text-muted'}`}>
                      {countFor(l.program_id) === 0 ? 'в программе нет упражнений' : `${countFor(l.program_id)} упр.`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm shrink-0">
                    <button onClick={() => move(idx, -1)} className="text-muted hover:text-ink" title="Выше">↑</button>
                    <button onClick={() => move(idx, 1)} className="text-muted hover:text-ink" title="Ниже">↓</button>
                    <button onClick={() => removeLink(l.id)} className="text-red-600 hover:underline">Убрать</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {links.length > 0 && (
            <p className="text-xs text-muted mb-5">
              Порядок прохождения: {links.map((l) => l.name).join(' → ')}
            </p>
          )}

          <div className="bg-base border border-dashed border-line rounded-sm p-4">
            <h3 className="text-sm font-medium mb-3">Добавить программу</h3>
            {programs.length === 0 ? (
              <p className="text-sm text-muted">
                Пока нет ни одной программы.{' '}
                <Link to="/programs/new" className="text-ink underline">Создать программу</Link>
              </p>
            ) : (
              <>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="border border-line rounded-sm px-3 py-2 bg-surface w-full mb-3"
                >
                  <option value="">— выбрать программу —</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.count} упр.)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addProgram}
                  disabled={!selectedProgramId}
                  className="bg-ink text-white px-4 py-2 rounded-sm text-sm hover:opacity-90 disabled:opacity-50"
                >
                  Добавить в тренировку
                </button>
              </>
            )}
          </div>

          <button onClick={() => navigate('/templates')} className="mt-6 text-sm text-muted hover:text-ink">
            ← Готово, вернуться к списку тренировок
          </button>
        </>
      )}
    </div>
  )
}
