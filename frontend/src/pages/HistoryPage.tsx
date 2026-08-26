import { useQuery } from "@tanstack/react-query"
import { useState, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { Search, Trash2, Download, Filter, RefreshCw, Bookmark, Sparkles } from "lucide-react"
import { api } from "../lib/api"
import type { Question } from "../types"
import { QuestionCard } from "../components/QuestionCard"

const sports = [
  'All Sports', 'Cricket', 'Football', 'Tennis', 'Badminton',
  'Basketball', 'Hockey', 'Formula 1', 'Boxing', 'Athletics',
  'Baseball', 'Volleyball', 'Golf', 'Table Tennis', 'MMA'
]

export function HistoryPage({ saved = false }: { saved?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') || ''

  const [search, setSearch] = useState(initialSearch)
  const [sport, setSport] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [contentType, setContentType] = useState('')
  const [timeScope, setTimeScope] = useState('')
  const [sort, setSort] = useState('newest')
  const [creatorMode, setCreatorMode] = useState(true)
  const [clearing, setClearing] = useState(false)

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (sport && sport !== 'All Sports') params.set('sport', sport)
    if (difficulty) params.set('difficulty', difficulty)
    if (contentType) params.set('content_type', contentType)
    if (timeScope) params.set('time_scope', timeScope)
    if (saved) params.set('saved_only', 'true')
    params.set('sort', sort)
    params.set('limit', '100')
    return `/history?${params.toString()}`
  }, [search, sport, difficulty, contentType, timeScope, saved, sort])

  const { data: questions = [], refetch, isFetching } = useQuery({
    queryKey: ['history', queryUrl],
    queryFn: () => api<Question[]>(queryUrl)
  })

  async function handleClearHistory() {
    if (!confirm("Are you sure you want to clear all history and generated questions? This cannot be undone.")) return
    setClearing(true)
    try {
      await api('/history', { method: 'DELETE' })
      refetch()
    } finally {
      setClearing(false)
    }
  }

  function handleExport(format: 'json' | 'csv') {
    const ids = questions.map(q => q.id).join(",")
    window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/export?format=${format}&ids=${ids}`, '_blank')
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-white">
              {saved ? 'Saved Questions' : 'Question History & Archive'}
            </h1>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-mono text-cyan-300">
              {questions.length} {questions.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {saved
              ? 'Your bookmarked trivia items, ready for quizzes and social sharing.'
              : 'All previously generated and verified questions stored locally.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {questions.length > 0 && (
            <>
              <button
                onClick={() => handleExport('json')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500"
              >
                <Download className="h-3.5 w-3.5" /> Export JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </>
          )}

          {!saved && questions.length > 0 && (
            <button
              onClick={handleClearHistory}
              disabled={clearing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear All History
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                if (searchParams.has('search')) {
                  searchParams.delete('search')
                  setSearchParams(searchParams)
                }
              }}
              placeholder="Search prompt or keywords..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400"
            />
          </div>

          {/* Sport Filter */}
          <select
            value={sport}
            onChange={e => setSport(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-xs font-medium text-white outline-none focus:border-cyan-400"
          >
            <option value="">All Sports</option>
            {sports.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Difficulty Filter */}
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-xs font-medium text-white outline-none focus:border-cyan-400"
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          {/* Content Type Filter */}
          <select
            value={contentType}
            onChange={e => setContentType(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-xs font-medium text-white outline-none focus:border-cyan-400"
          >
            <option value="">All Types</option>
            <option value="mcq">MCQ</option>
            <option value="true_false">True / False</option>
            <option value="poll">Poll</option>
            <option value="fill_blank">Fill in Blank</option>
            <option value="guess_number">Guess Number</option>
          </select>

          {/* Sort Order */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-xs font-medium text-white outline-none focus:border-cyan-400"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="difficulty">Sort: Difficulty</option>
            <option value="confidence">Sort: Confidence Score</option>
          </select>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-cyan-400" />
            <span>Active filters: {sport || difficulty || contentType || search ? "Applied" : "None"}</span>
            {(sport || difficulty || contentType || search) && (
              <button
                onClick={() => { setSearch(''); setSport(''); setDifficulty(''); setContentType(''); }}
                className="text-cyan-400 hover:underline ml-2"
              >
                Reset All
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={creatorMode}
              onChange={e => setCreatorMode(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-0"
            />
            Show Answers in Cards
          </label>
        </div>
      </div>

      {/* Grid of Questions */}
      {questions.length > 0 ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {questions.map(q => (
            <QuestionCard
              key={q.id}
              q={q}
              creatorMode={creatorMode}
              onSaved={() => refetch()}
              onDeleted={() => refetch()}
              onRegenerated={() => refetch()}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-[2rem] border border-slate-800 py-20 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-600">
            {saved ? <Bookmark className="h-8 w-8" /> : <Sparkles className="h-8 w-8" />}
          </div>
          <h3 className="mt-4 text-lg font-bold text-white">No questions found</h3>
          <p className="mt-1 text-sm text-slate-400 max-w-sm mx-auto">
            {saved
              ? "You haven't saved any questions yet. Bookmark questions from the Generate studio to see them here."
              : "Try adjusting your search query or generate a new batch from the studio."}
          </p>
        </div>
      )}
    </div>
  )
}

