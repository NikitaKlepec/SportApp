import { supabase } from './supabaseClient'
import { Exercise } from '../types'

// Общий select-фрагмент со всеми связями многие-ко-многим
const EXERCISE_SELECT = `
  *,
  exercise_muscle_groups ( muscle_group:muscle_groups(*) ),
  exercise_categories ( category:categories(*) ),
  exercise_tags ( tag:tags(*) )
`

// Supabase возвращает связи как вложенные массивы обёрток
// ({ muscle_group: {...} }) — приводим к плоскому Exercise.
function mapRow(row: any): Exercise {
  return {
    ...row,
    muscleGroups: (row.exercise_muscle_groups ?? []).map((r: any) => r.muscle_group).filter(Boolean),
    categories: (row.exercise_categories ?? []).map((r: any) => r.category).filter(Boolean),
    tags: (row.exercise_tags ?? []).map((r: any) => r.tag).filter(Boolean),
  }
}

export async function fetchExercises(): Promise<Exercise[]> {
  const { data } = await supabase.from('exercises').select(EXERCISE_SELECT).order('name')
  return (data ?? []).map(mapRow)
}

export async function fetchExercise(id: string): Promise<Exercise | null> {
  const { data } = await supabase.from('exercises').select(EXERCISE_SELECT).eq('id', id).single()
  return data ? mapRow(data) : null
}

// Полностью пересобирает связи упражнения с группами мышц/категориями/тегами
// (проще, чем считать точный diff — сначала удаляем все старые строки, потом
// вставляем заново то, что выбрано сейчас).
export async function syncExerciseRelations(
  exerciseId: string,
  muscleGroupIds: string[],
  categoryIds: string[],
  tagIds: string[]
) {
  await Promise.all([
    supabase.from('exercise_muscle_groups').delete().eq('exercise_id', exerciseId),
    supabase.from('exercise_categories').delete().eq('exercise_id', exerciseId),
    supabase.from('exercise_tags').delete().eq('exercise_id', exerciseId),
  ])

  await Promise.all([
    muscleGroupIds.length > 0
      ? supabase.from('exercise_muscle_groups').insert(
          muscleGroupIds.map((muscle_group_id) => ({ exercise_id: exerciseId, muscle_group_id }))
        )
      : Promise.resolve(),
    categoryIds.length > 0
      ? supabase.from('exercise_categories').insert(
          categoryIds.map((category_id) => ({ exercise_id: exerciseId, category_id }))
        )
      : Promise.resolve(),
    tagIds.length > 0
      ? supabase.from('exercise_tags').insert(
          tagIds.map((tag_id) => ({ exercise_id: exerciseId, tag_id }))
        )
      : Promise.resolve(),
  ])
}
