import { useQuery } from "@tanstack/react-query"
import { Flame, Trophy, AlertTriangle, Target, CheckCircle2, TrendingUp, Sparkles, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { api } from "../lib/api"

export function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api<any>('/analytics')
  })

  const answered = data?.questions_answered ?? 0
  const accuracy = data?.accuracy ?? 0
  const streak = data?.current_streak ?? 0
  const bestSport = data?.best_sport ?? '—'
  const weakestSport = data?.weakest_sport ?? '—'
  const sportBreakdown = data?.sport_breakdown ?? []
  const diffBreakdown = data?.difficulty_breakdown ?? {}

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Performance Analytics & Insights</h1>
        <p className="mt-1 text-sm text-slate-400">
          Track your accuracy, answer streaks, sport proficiencies, and fact-checking metrics.
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Answered */}
        <div className="glass rounded-[2rem] p-6 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Answered</span>
            <Target className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="mt-3 text-4xl font-black text-white">{answered}</div>
          <div className="mt-1 text-xs text-slate-500">Total trivia attempts</div>
        </div>

        {/* Accuracy */}
        <div className="glass rounded-[2rem] p-6 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Accuracy</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-3 text-4xl font-black text-emerald-300">{accuracy}%</div>
          <div className="mt-1 text-xs text-slate-500">Graded question win rate</div>
        </div>

        {/* Current Streak */}
        <div className="glass rounded-[2rem] p-6 border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400">Active Streak</span>
            <Flame className="h-5 w-5 text-orange-400 fill-current animate-pulse" />
          </div>
          <div className="mt-3 text-4xl font-black text-orange-200">{streak} 🔥</div>
          <div className="mt-1 text-xs text-orange-400/80">Consecutive correct answers</div>
        </div>

        {/* Best Sport */}
        <div className="glass rounded-[2rem] p-6 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Best Sport</span>
            <Trophy className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="mt-3 text-2xl font-black text-white truncate">{bestSport}</div>
          <div className="mt-1 text-xs text-slate-500">Highest accuracy rate</div>
        </div>

        {/* Weakest Sport */}
        <div className="glass rounded-[2rem] p-6 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Focus Area</span>
            <AlertTriangle className="h-5 w-5 text-rose-400" />
          </div>
          <div className="mt-3 text-2xl font-black text-rose-300 truncate">{weakestSport}</div>
          <div className="mt-1 text-xs text-slate-500">Needs more practice</div>
        </div>
      </div>

      {/* Sport Proficiency & Difficulty Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sport Breakdown Table */}
        <div className="glass rounded-[2rem] p-6 border border-slate-800 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Sport Proficiencies</h3>
              <p className="text-xs text-slate-400">Breakdown of accuracy and volume by sport category</p>
            </div>
            <TrendingUp className="h-5 w-5 text-cyan-400" />
          </div>

          <div className="mt-4 space-y-4">
            {sportBreakdown.length > 0 ? (
              sportBreakdown.map((s: any) => (
                <div key={s.sport} className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-white">{s.sport}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-mono">
                        {s.correct}/{s.total} Correct
                      </span>
                      <span className="font-mono text-sm font-bold text-cyan-300">
                        {s.accuracy}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        s.accuracy >= 75 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                        s.accuracy >= 50 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' :
                        'bg-gradient-to-r from-orange-500 to-rose-500'
                      }`}
                      style={{ width: `${s.accuracy}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-500 text-sm">
                No quiz responses recorded yet. Answer questions in the Quiz Player or Generate Studio to build analytics.
              </div>
            )}
          </div>
        </div>

        {/* Difficulty Breakdown & Quick Practice Card */}
        <div className="space-y-6">
          {/* Difficulty stats */}
          <div className="glass rounded-[2rem] p-6 border border-slate-800">
            <h3 className="text-lg font-bold text-white">Difficulty Breakdown</h3>
            <p className="text-xs text-slate-400">Success rate across tiers</p>

            <div className="mt-4 space-y-3">
              {[
                { label: 'Easy', color: 'from-emerald-400 to-teal-400', key: 'Easy' },
                { label: 'Medium', color: 'from-blue-400 to-cyan-400', key: 'Medium' },
                { label: 'Hard', color: 'from-fuchsia-400 to-rose-400', key: 'Hard' }
              ].map(tier => {
                const acc = diffBreakdown[tier.key] ?? 0
                return (
                  <div key={tier.label} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-300">{tier.label}</span>
                      <span className="font-mono text-cyan-300">{acc}%</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${tier.color}`}
                        style={{ width: `${acc}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick Generate Banner */}
          <div className="glass rounded-[2rem] p-6 border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-4 w-4" /> Ready for new content?
            </div>
            <h4 className="mt-2 text-lg font-black text-white">Generate Sports Trivia</h4>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              Create AI-grounded trivia questions across sports, leagues, and tournaments with full verification.
            </p>
            <Link
              to="/"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-300 shadow-md shadow-cyan-500/20"
            >
              Open Studio <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

