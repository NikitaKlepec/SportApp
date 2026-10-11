import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDayPlan, DayPlan } from '../lib/dayPlan'
import { localDateStr } from '../lib/dates'

export default function Home() {
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDayPlan(localDateStr())
      .then(setPlan)
      .finally(() => setLoading(false))
  }, [])

  const multi = (plan?.sections.length ?? 0) > 1

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Сегодня</h1>
      <p className="text-muted mb-6">
        {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {loading ? (
        <p className="text-muted">Загрузка…</p>
      ) : !plan ? (
        <div className="bg-surface border border-line rounded-sm p-6 text-center">
          <p className="mb-4 text-muted">На сегодня тренировка не назначена.</p>
          <Link to="/calendar" className="text-sm bg-ink text-white px-4 py-2 rounded-sm">
            Назначить в календаре
          </Link>
        </div>
      ) : plan.items.length === 0 ? (
        <div className="bg-surface border border-line rounded-sm p-6 text-center">
          <p className="mb-1 font-medium">{plan.title}</p>
          <p className="mb-4 text-muted text-sm">В этой тренировке пока нет упражнений.</p>
          <Link
            to={plan.isComposite ? '/templates' : '/programs'}
            className="text-sm bg-ink text-white px-4 py-2 rounded-sm"
          >
            {plan.isComposite ? 'Открыть тренировки' : 'Открыть программы'}
          </Link>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-sm p-5">
          <h2 className="font-medium mb-1">{plan.title}</h2>
          <p className="text-xs text-muted mb-4">
            {multi ? `частей: ${plan.sections.length} · ` : ''}всего упражнений: {plan.items.length}
          </p>

          <div className="grid gap-5 mb-5">
            {plan.sections.map((section, si) => (
              <div key={si}>
                {multi && (
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted mb-2">
                    {si + 1}. {section.name}
                  </h3>
                )}
                <ul className="grid gap-2">
                  {section.items.map((item) => (
                    <li key={`${si}-${item.id}`} className="flex justify-between gap-3 text-sm border-b border-line pb-2">
                      <span>{item.exercise?.name}</span>
                      <span className="text-muted shrink-0">
                        {item.sets}×{item.reps}
                        {item.weight ? ` · ${item.weight} кг` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Link
            to="/workout"
            className="inline-block bg-accent text-ink px-5 py-2 rounded-sm font-medium hover:opacity-90"
          >
            Начать тренировку
          </Link>
        </div>
      )}
    </div>
  )
}
