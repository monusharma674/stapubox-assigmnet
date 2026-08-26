import { Moon, Search, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { api } from "../lib/api"

export function Header() {
  const [dark, setDark] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState<{ status: string; message: string }>({ status: 'limited', message: 'Checking AI' })
  const navigate = useNavigate()

  useEffect(() => {
    api<{ ai: { status: string; message: string } }>('/health')
      .then(x => setStatus(x.ai))
      .catch(() => setStatus({ status: 'error', message: 'Backend unavailable' }))
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchTerm.trim()) {
      navigate(`/history?search=${encodeURIComponent(searchTerm.trim())}`)
      setSearchTerm('')
    }
  }

  const color = status.status === 'connected' ? 'bg-emerald-400' : status.status === 'limited' ? 'bg-amber-400' : 'bg-red-500'

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-slate-800/70 bg-[#071225]/80 px-4 backdrop-blur-xl md:px-6">
      <form onSubmit={handleSearch} className="relative max-w-xl flex-1">
        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
        <input
          aria-label="Search questions"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2 pl-10 pr-3 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition"
          placeholder="Search sports trivia, teams, players... (Press Enter)"
        />
      </form>

      <div className="hidden rounded-full border border-slate-700 bg-slate-900/50 px-3.5 py-1.5 text-xs text-slate-300 sm:flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
        <span>Gateway <strong className="text-cyan-300">Live</strong></span>
      </div>

      <Link
        to="/settings"
        title={status.message}
        className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/50 px-3.5 py-1.5 text-xs hover:border-slate-500 transition"
      >
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="hidden md:block font-medium text-slate-300">AI Status</span>
      </Link>

      <button
        aria-label="Toggle theme"
        onClick={() => {
          setDark(!dark)
          document.documentElement.classList.toggle('light')
        }}
        className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:border-slate-500 hover:text-white transition"
      >
        {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>

      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-black text-slate-950 shadow-md shadow-cyan-500/20">
        SS
      </div>
    </header>
  )
}

