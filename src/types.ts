export interface MuscleGroup {
  id: string
  name: string
  color: string
  svg_region_ids: string[]
}

export interface Exercise {
  id: string
  user_id: string
  name: string
  description: string | null
  muscle_group_id: string | null
  muscle_group?: MuscleGroup
  image_url: string | null
  video_url: string | null
  video_source: 'upload' | 'youtube'
  equipment: string | null
  created_at: string
}

export interface Program {
  id: string
  user_id: string
  name: string
  notes: string | null
}

export interface ProgramExercise {
  id: string
  program_id: string
  exercise_id: string
  exercise?: Exercise
  sets: number
  reps: number
  weight: number | null
  rest_seconds: number
  order_index: number
}

export interface CalendarEntry {
  id: string
  user_id: string
  date: string // YYYY-MM-DD
  program_id: string | null
  program?: Program
}

export interface WorkoutLog {
  id: string
  user_id: string
  calendar_entry_id: string | null
  date: string
  status: 'done' | 'skipped' | 'in_progress'
  completed_at: string | null
}
