import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Sparkles, Shuffle, Download, SlidersHorizontal, RefreshCw, BookmarkCheck } from "lucide-react"
import { useState } from "react"
import { api } from "../lib/api"
import type { Batch } from "../types"
import { QuestionCard } from "../components/QuestionCard"

const schema = z.object({
  sport: z.string().min(1),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  time_scope: z.enum(['Latest', 'Historical', 'Mixed']),
  batch_size: z.coerce.number().int().refine(value => value === 4 || value === 5),
  recent_period: z.enum(['24 hours', '7 days', '30 days', 'current season']),
  team: z.string().optional(),
  player: z.string().optional(),
  league: z.string().optional(),
  tournament: z.string().optional(),
  country: z.string().optional(),
  season_or_year: z.string().optional()
})

type Form = z.infer<typeof schema>

const sports = [
  'Cricket', 'Football', 'Tennis', 'Badminton', 'Basketball',
  'Hockey', 'Formula 1', 'Boxing', 'Athletics', 'Baseball',
  'Volleyball', 'Golf', 'Table Tennis', 'MMA'
]

const types = [
  ['mcq', 'MCQ'],
  ['true_false', 'True/False'],
  ['poll', 'Opinion Poll'],
  ['fill_blank', 'Fill in Blank'],
  ['guess_number', 'Guess Number']
]

export function GeneratePage() {
  const [selectedTypes, setSelectedTypes] = useState(['mcq', 'true_false', 'poll', 'fill_blank', 'guess_number'])
  const [creatorMode, setCreatorMode] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [batch, setBatch] = useState<Batch | null>(null)
  const [regeneratingBatch, setRegeneratingBatch] = useState(false)

  const { register, handleSubmit, setValue, reset, getValues } = useForm<z.input<typeof schema>, any, Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      sport: 'Cricket',
      difficulty: 'Medium',
      time_scope: 'Mixed',
      batch_size: 4,
      recent_period: '7 days',
      team: '',
      player: '',
      league: '',
      tournament: '',
      country: '',
      season_or_year: ''
    }
  })

  const mutation = useMutation({
    mutationFn: (data: Form) =>
      api<Batch>('/generate', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          content_types: selectedTypes,
          avoid_previously_answered: true,
          mix_question_types: true,
          surprise_me: false
        })
      }),
    onSuccess: setBatch
  })

  function handleSurpriseMe() {
    const randomSport = sports[Math.floor(Math.random() * sports.length)]
    const randomDiff = (['Easy', 'Medium', 'Hard'] as const)[Math.floor(Math.random() * 3)]
    const randomScope = (['Latest', 'Historical', 'Mixed'] as const)[Math.floor(Math.random() * 3)]
    const randomPeriod = (['24 hours', '7 days', '30 days', 'current season'] as const)[Math.floor(Math.random() * 4)]

    setValue('sport', randomSport)
    setValue('difficulty', randomDiff)
    setValue('time_scope', randomScope)
    setValue('recent_period', randomPeriod)

    // Randomize active types (at least 2 types)
    const shuffled = [...types.map(t => t[0])].sort(() => 0.5 - Math.random())
    const count = Math.max(2, Math.floor(Math.random() * shuffled.length) + 1)
    const pickTypes = shuffled.slice(0, count)
    setSelectedTypes(pickTypes)

    mutation.mutate({
      sport: randomSport,
      difficulty: randomDiff,
      time_scope: randomScope,
      batch_size: 4,
      recent_period: randomPeriod,
      team: '',
      player: '',
      league: '',
      tournament: '',
      country: '',
      season_or_year: ''
    })
  }

  async function handleRegenerateBatch() {
    if (!batch) return
    setRegeneratingBatch(true)
    try {
      const nextBatch = await api<Batch>(`/batches/${batch.id}/regenerate`, { method: 'POST' })
      setBatch(nextBatch)
    } finally {
      setRegeneratingBatch(false)
    }
  }

  async function handleSaveAll() {
    if (!batch) return
    for (const q of batch.questions) {
      if (!q.saved) {
        await api(`/questions/${q.id}/save`, { method: 'POST' })
      }
    }
    setBatch({
      ...batch,
      questions: batch.questions.map(q => ({ ...q, saved: true }))
    })
  }

  function handleExport(format: 'json' | 'csv') {
    if (!batch) return
    const ids = batch.questions.map(q => q.id).join(",")
    window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/export?format=${format}&ids=${ids}`, '_blank')
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-8">
      {/* Hero banner */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-cyan-400/20 bg-gradient-to-br from-blue-600/20 via-cyan-500/10 to-purple-600/15 p-6 md:p-10 shadow-2xl">
        <div className="max-w-3xl relative z-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-400/10 border border-cyan-400/30 px-3.5 py-1 text-xs font-bold text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" /> AI Sports Studio & Fact Grounding
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-5xl text-white leading-tight">
            Turn verified sports records into addictive quiz content.
          </h1>
          <p className="mt-4 max-w-2xl text-sm md:text-base text-slate-300 leading-relaxed">
            Generate factual MCQs, True/False statements, audience polls, fill-in-the-blanks, and numeric estimation games grounded in live sources and ChromaDB records.
          </p>
        </div>
      </section>

      {/* Generation Form */}
      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="glass rounded-[2rem] p-6 shadow-xl border border-slate-800">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Sport
            <select {...register('sport')} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400">
              {sports.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Difficulty
            <select {...register('difficulty')} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400">
              <option value="Easy">Easy (Casual Fans)</option>
              <option value="Medium">Medium (Regulars)</option>
              <option value="Hard">Hard (Die-hard)</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Time Scope
            <select {...register('time_scope')} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400">
              <option value="Latest">Latest (Live Web)</option>
              <option value="Historical">Historical (Records)</option>
              <option value="Mixed">Mixed (Balanced)</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Recent Period
            <select {...register('recent_period')} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400">
              <option value="24 hours">Past 24 Hours</option>
              <option value="7 days">Past 7 Days</option>
              <option value="30 days">Past 30 Days</option>
              <option value="current season">Current Season</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Batch Size
            <select {...register('batch_size')} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400">
              <option value={4}>4 Questions</option>
              <option value={5}>5 Questions</option>
            </select>
          </label>
        </div>

        {/* Content type chips */}
        <div className="mt-5 border-t border-slate-800/80 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Question Types</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedTypes(types.map(t => t[0]))}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                Select All
              </button>
              <span className="text-slate-600">·</span>
              <button
                type="button"
                onClick={() => setSelectedTypes(['mcq'])}
                className="text-[11px] text-slate-400 hover:underline"
              >
                MCQ Only
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {types.map(([id, label]) => {
              const active = selectedTypes.includes(id)
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => setSelectedTypes(x => x.includes(id) ? (x.length > 1 ? x.filter(v => v !== id) : x) : [...x, id])}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'border-cyan-400 bg-cyan-400/20 text-cyan-200 shadow-md shadow-cyan-500/10'
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Advanced Filters Drawer */}
        <div className="mt-4 border-t border-slate-800/80 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {showAdvanced ? "Hide Context Filters" : "Target Specific Team, Player, League or Season"}
          </button>

          {showAdvanced && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 rounded-2xl bg-slate-950/60 p-4 border border-slate-800">
              <label className="text-xs text-slate-400">
                Team / Club
                <input {...register('team')} placeholder="e.g. Real Madrid, Mumbai Indians" className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400" />
              </label>
              <label className="text-xs text-slate-400">
                Player / Athlete
                <input {...register('player')} placeholder="e.g. Virat Kohli, LeBron James" className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400" />
              </label>
              <label className="text-xs text-slate-400">
                League / Tournament
                <input {...register('league')} placeholder="e.g. Premier League, IPL, Wimbledon" className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400" />
              </label>
              <label className="text-xs text-slate-400">
                Country
                <input {...register('country')} placeholder="e.g. India, Spain, USA" className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400" />
              </label>
              <label className="text-xs text-slate-400">
                Season / Year
                <input {...register('season_or_year')} placeholder="e.g. 2024, 2011 World Cup" className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400" />
              </label>
            </div>
          )}
        </div>

        {/* Action button bar */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-800/80 pt-4">
          <button
            type="submit"
            disabled={mutation.isPending || !selectedTypes.length}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 font-bold text-slate-950 transition hover:opacity-90 disabled:opacity-50 shadow-lg shadow-cyan-500/20"
          >
            <Sparkles className="h-4 w-4" />
            {mutation.isPending ? 'Searching sources → Verifying facts → Grounding batch...' : 'Generate Batch'}
          </button>

          <button
            type="button"
            onClick={handleSurpriseMe}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            <Shuffle className="h-4 w-4 text-cyan-300" />
            Surprise Me
          </button>

          <label className="ml-auto flex items-center gap-2 text-xs md:text-sm font-medium text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={creatorMode}
              onChange={e => setCreatorMode(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-0"
            />
            Creator Mode (Answers & Explanations Visible)
          </label>
        </div>

        {mutation.error && (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            <div className="font-bold">Generation Notice:</div>
            <div className="mt-1">{mutation.error.message}</div>
          </div>
        )}
      </form>

      {/* Results Section */}
      {batch && (
        <section className="space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white">Generated Batch #{batch.id}</h2>
                <span className="rounded-full bg-cyan-400/15 border border-cyan-400/30 px-2.5 py-0.5 text-xs font-mono text-cyan-300">
                  {batch.questions.length} Items
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Retrieval: <span className="text-white font-medium">{batch.retrieval_method}</span> · Model: <span className="text-white font-medium">{batch.model_used}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSaveAll}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500"
              >
                <BookmarkCheck className="h-3.5 w-3.5 text-cyan-400" /> Save All
              </button>
              <button
                onClick={() => handleExport('json')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500"
              >
                <Download className="h-3.5 w-3.5" /> Export JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
              <button
                onClick={handleRegenerateBatch}
                disabled={regeneratingBatch}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${regeneratingBatch ? 'animate-spin' : ''}`} /> Regenerate Batch
              </button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {batch.questions.map(q => (
              <QuestionCard
                key={q.id}
                q={q}
                creatorMode={creatorMode}
                onSaved={isSaved => {
                  setBatch(curr => curr ? {
                    ...curr,
                    questions: curr.questions.map(item => item.id === q.id ? { ...item, saved: isSaved } : item)
                  } : curr)
                }}
                onRegenerated={next => {
                  setBatch(curr => curr ? {
                    ...curr,
                    questions: curr.questions.map(item => item.id === q.id ? next : item)
                  } : curr)
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

