import { supabase } from './supabaseClient'
import { ProgramExercise } from '../types'

/** Упражнение в плане дня + к какой части (программе) оно относится */
export type PlanItem = ProgramExercise & {
  sectionIndex: number
  sectionName: string
}

export interface PlanSection {
  name: string
  items: PlanItem[]
}

export interface DayPlan {
  entryId: string
  /** название тренировки-шаблона или единственной программы */
  title: string
  /** true, если на день назначена тренировка из нескольких программ */
  isComposite: boolean
  /** части тренировки по порядку (пустые программы пропускаются) */
  sections: PlanSection[]
  /** все упражнения подряд, в порядке прохождения */
  items: PlanItem[]
}

/**
 * Собирает план тренировки на указанный день из календаря.
 * Поддерживает оба варианта: тренировку-шаблон (несколько программ подряд)
 * и отдельную программу. Возвращает null, если на день ничего не назначено.
 */
export async function fetchDayPlan(date: string): Promise<DayPlan | null> {
  const { data: entry } = await supabase
    .from('calendar_entries')
    .select('*')
    .eq('date', date)
    .maybeSingle()

  if (!entry || (!entry.workout_template_id && !entry.program_id)) return null

  let title = ''
  let isComposite = false
  let programs: { id: string; name: string }[] = []

  if (entry.workout_template_id) {
    isComposite = true
    const { data: tpl } = await supabase
      .from('workout_templates')
      .select('name')
      .eq('id', entry.workout_template_id)
      .maybeSingle()
    title = tpl?.name ?? 'Тренировка'

    const { data: links } = await supabase
      .from('workout_template_programs')
      .select('order_index, program:programs(id, name)')
      .eq('template_id', entry.workout_template_id)
      .order('order_index')

    programs = ((links ?? []) as any[]).map((l) => l.program).filter(Boolean)
  } else {
    const { data: prog } = await supabase
      .from('programs')
      .select('id, name')
      .eq('id', entry.program_id)
      .maybeSingle()
    if (prog) {
      programs = [prog]
      title = prog.name
    }
  }

  const programIds = Array.from(new Set(programs.map((p) => p.id)))
  const byProgram = new Map<string, ProgramExercise[]>()

  if (programIds.length > 0) {
    const { data: rows } = await supabase
      .from('program_exercises')
      .select('*, exercise:exercises(*)')
      .in('program_id', programIds)
      .order('order_index')

    ;((rows ?? []) as unknown as ProgramExercise[]).forEach((row) => {
      const list = byProgram.get(row.program_id) ?? []
      list.push(row)
      byProgram.set(row.program_id, list)
    })
  }

  // Программа может встретиться в тренировке несколько раз — каждое вхождение
  // становится отдельной частью. Пустые программы пропускаем.
  const nonEmpty = programs
    .map((p) => ({ name: p.name, rows: byProgram.get(p.id) ?? [] }))
    .filter((s) => s.rows.length > 0)

  const sections: PlanSection[] = nonEmpty.map((s, i) => ({
    name: s.name,
    items: s.rows.map((r) => ({ ...r, sectionIndex: i, sectionName: s.name })),
  }))

  return {
    entryId: entry.id,
    title,
    isComposite,
    sections,
    items: sections.flatMap((s) => s.items),
  }
}
