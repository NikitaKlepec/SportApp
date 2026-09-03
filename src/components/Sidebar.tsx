import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const navItems = [
  { to: '/', label: 'Главная', end: true },
  { to: '/calendar', label: 'Календарь' },
  { to: '/exercises', label: 'Упражнения' },
]

export default function Sidebar() {
  return (
    <>
      {/* Десктоп: колонка слева */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 border-r border-line bg-surface min-h-screen p-4">
        <div className="font-display font-semibold text-lg mb-8 px-2">Тренировки</div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent text-ink' : 'text-muted hover:bg-base'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-auto text-sm text-muted hover:text-ink text-left px-3 py-2"
        >
          Выйти
        </button>
      </aside>

      {/* Мобильная версия: нижняя панель */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-line flex justify-around py-2 z-10">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-sm text-xs font-medium ${
                isActive ? 'bg-accent text-ink' : 'text-muted'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
