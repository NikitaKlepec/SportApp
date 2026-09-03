import { FormEvent, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-surface border border-line rounded-md p-8 w-full max-w-sm"
      >
        <h1 className="text-2xl font-semibold mb-1">Домашние тренировки</h1>
        <p className="text-muted text-sm mb-6">Вход в личный кабинет</p>

        <label className="block text-sm mb-1" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-line rounded-sm px-3 py-2 mb-4 bg-base focus:outline-none focus:ring-2 focus:ring-accent"
        />

        <label className="block text-sm mb-1" htmlFor="password">Пароль</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-line rounded-sm px-3 py-2 mb-4 bg-base focus:outline-none focus:ring-2 focus:ring-accent"
        />

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink text-white rounded-sm py-2 font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Вход…' : 'Войти'}
        </button>

        <p className="text-xs text-muted mt-4">
          Аккаунт создаётся один раз вручную в Supabase (Authentication → Users → Add user).
        </p>
      </form>
    </div>
  )
}
