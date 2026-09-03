import { ReactNode } from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 max-w-5xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
