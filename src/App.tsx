import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import CalendarPage from './pages/Calendar'
import Exercises from './pages/Exercises'
import ExerciseDetail from './pages/ExerciseDetail'
import ExerciseForm from './pages/ExerciseForm'
import Programs from './pages/Programs'
import ProgramForm from './pages/ProgramForm'
import Workout from './pages/Workout'

function Protected({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted">Загрузка…</div>
  if (!session) return <Navigate to="/login" replace />
  return children
}

function Routed() {
  const { session } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <Protected>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/exercises" element={<Exercises />} />
                <Route path="/exercises/new" element={<ExerciseForm />} />
                <Route path="/exercises/:id" element={<ExerciseDetail />} />
                <Route path="/exercises/:id/edit" element={<ExerciseForm />} />
                <Route path="/programs" element={<Programs />} />
                <Route path="/programs/new" element={<ProgramForm />} />
                <Route path="/programs/:id" element={<ProgramForm />} />
                <Route path="/workout" element={<Workout />} />
              </Routes>
            </Layout>
          </Protected>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routed />
    </AuthProvider>
  )
}
