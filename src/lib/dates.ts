/**
 * Дата в формате YYYY-MM-DD по ЛОКАЛЬНОМУ времени пользователя.
 * (toISOString() возвращает UTC — из-за этого ночью «сегодня» оказывалось
 * вчерашним днём.)
 */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
