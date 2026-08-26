import { Bookmark, Check, Copy, ExternalLink, Info, Instagram, RotateCcw, Trash2, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { api } from "../lib/api"
import type { Question } from "../types"

const theme = {
  mcq: 'from-blue-500/20 to-cyan-400/10 border-cyan-400/30',
  true_false: 'from-purple-500/20 to-fuchsia-500/10 border-fuchsia-400/30',
  poll: 'from-orange-500/20 to-rose-500/10 border-orange-400/30',
  fill_blank: 'from-teal-500/20 to-emerald-500/10 border-emerald-400/30',
  guess_number: 'from-yellow-500/20 to-lime-500/10 border-yellow-400/30'
}

export function QuestionCard({
  q,
  creatorMode,
  onSaved,
  onRegenerated,
  onDeleted
}: {
  q: Question
  creatorMode: boolean
  onSaved?: (v: boolean) => void
  onRegenerated?: (q: Question) => void
  onDeleted?: (id: number) => void
}) {
  const [result, setResult] = useState<any>(null)
  const [selected, setSelected] = useState('')
  const [number, setNumber] = useState('')
  const [saved, setSaved] = useState(q.saved)
  const [regenerating, setRegenerating] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function answer(value: string) {
    if (result) return
    setSelected(value)
    try {
      const res = await api<any>(`/questions/${q.id}/answer`, {
        method: 'POST',
        body: JSON.stringify({ answer: value })
      })
      setResult(res)
    } catch (err: any) {
      console.error(err)
    }
  }

  async function save() {
    const r = await api<{ saved: boolean }>(`/questions/${q.id}/save`, { method: 'POST' })
    setSaved(r.saved)
    onSaved?.(r.saved)
  }

  async function regenerate() {
    setRegenerating(true)
    try {
      const next = await api<Question>(`/questions/${q.id}/regenerate`, { method: 'POST' })
      onRegenerated?.(next)
    } finally {
      setRegenerating(false)
    }
  }

  async function remove() {
    if (confirm("Delete this question from history?")) {
      await api(`/questions/${q.id}`, { method: 'DELETE' })
      onDeleted?.(q.id)
    }
  }

  function copyText(text: string, type: string) {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  function getInstagramCaption() {
    let optionsText = ""
    if (q.options && q.options.length > 0) {
      optionsText = q.options.map(x => `${x.label}. ${x.text}`).join("\n")
    } else if (q.type === 'true_false') {
      optionsText = "A. True\nB. False"
    } else if (q.type === 'guess_number') {
      optionsText = "🔢 What is your best estimate?"
    }
    return `⚡ SPORTS TRIVIA CHALLENGE ⚡\n\n${q.prompt}\n\n${optionsText}\n\n👇 Drop your answer in the comments!\n\n#SportsQuiz #SportSparkAI #${q.sport.replace(/\s+/g, '')} #Trivia`
  }

  const options = q.type === 'true_false' && (!q.options || q.options.length === 0)
    ? [{ label: 'True', text: 'True' }, { label: 'False', text: 'False' }]
    : q.options || []

  if (regenerating) {
    return (
      <div className="animate-pulse rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex justify-between">
          <div className="h-5 w-28 rounded bg-slate-700"></div>
          <div className="h-5 w-16 rounded bg-slate-700"></div>
        </div>
        <div className="mt-5 h-7 w-4/5 rounded bg-slate-700"></div>
        <div className="mt-6 space-y-3">
          {[1, 2, 3, 4].map(x => (
            <div key={x} className="h-12 rounded-xl bg-slate-800"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-3xl border bg-gradient-to-br ${theme[q.type] || 'from-slate-800/40 to-slate-900/40 border-slate-700'} p-6 shadow-xl shadow-black/20 backdrop-blur-md`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold uppercase tracking-wider text-cyan-200">
          {q.type.replace('_', ' ')}
        </span>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-slate-300">{q.sport}</span>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-slate-300">{q.era}</span>
        <span className={`rounded-full px-2.5 py-1 font-medium ${
          q.difficulty === 'Easy' ? 'bg-emerald-500/20 text-emerald-300' :
          q.difficulty === 'Medium' ? 'bg-amber-500/20 text-amber-300' :
          'bg-rose-500/20 text-rose-300'
        }`}>
          {q.difficulty}
        </span>
        <span className="ml-auto text-slate-400 font-mono text-[11px]">
          Quality {Math.round(q.quality_score * 100)}%
        </span>
      </div>

      <h3 className="mt-4 text-lg font-bold leading-relaxed text-white">{q.prompt}</h3>

      {q.opinion_based && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 px-3 py-1 text-xs font-semibold text-orange-300">
          <Info className="h-3.5 w-3.5" /> Opinion Poll — No Correct Answer
        </div>
      )}

      {/* Answer selection area */}
      {q.type === 'guess_number' ? (
        <div className="mt-5 space-y-3">
          <div className="flex gap-2">
            <input
              value={number}
              onChange={e => setNumber(e.target.value)}
              disabled={!!result}
              type="number"
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-yellow-400"
              placeholder="Enter your numeric guess..."
            />
            <button
              onClick={() => answer(number)}
              disabled={!number || !!result}
              className="rounded-xl bg-yellow-400 px-5 py-2.5 font-bold text-slate-950 transition hover:bg-yellow-300 disabled:opacity-50"
            >
              Submit Guess
            </button>
          </div>
          {result && (
            <div className={`rounded-xl border p-3.5 text-sm ${result.is_correct ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200' : 'border-red-500/40 bg-red-500/15 text-red-200'}`}>
              <div className="font-bold">{result.is_correct ? "🎯 Within accepted range!" : "❌ Off target!"}</div>
              <div className="mt-1 text-xs text-slate-300">Exact Target: <span className="font-mono font-bold text-white">{result.correct_answer}</span></div>
            </div>
          )}
        </div>
      ) : q.opinion_based && result ? (
        <div className="mt-5 space-y-3">
          {options.map(o => {
            const percentage = result?.percentages?.[o.label] ?? 0
            const isUserPick = selected === o.label
            return (
              <div key={o.label} className="relative overflow-hidden rounded-xl border border-orange-500/30 bg-slate-950/50 p-3.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500/30 to-rose-500/30 -z-0"
                />
                <div className="relative z-10 flex items-center justify-between font-medium">
                  <span className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded bg-white/10 text-xs font-bold">{o.label}</span>
                    <span className={isUserPick ? "font-bold text-orange-200" : "text-slate-200"}>{o.text}</span>
                    {isUserPick && <span className="text-[10px] uppercase font-bold text-orange-400 bg-orange-950/80 px-1.5 py-0.5 rounded">Your Vote</span>}
                  </span>
                  <span className="font-mono text-sm font-bold text-white">{percentage}%</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mt-5 grid gap-2.5">
          {options.map(o => {
            const isSelected = selected === o.label
            const isCorrect = result && !q.opinion_based && (o.label === result.correct_answer || (q.type === 'true_false' && o.label.toLowerCase() === String(result.correct_answer).toLowerCase()))
            const isWrong = result && isSelected && !result.is_correct && !q.opinion_based
            const showCreatorCorrect = creatorMode && !result && !q.opinion_based && (o.label === q.correct_answer || (q.type === 'true_false' && o.label.toLowerCase() === String(q.correct_answer).toLowerCase()))

            let btnStyle = 'border-slate-700 bg-slate-950/40 hover:border-slate-500 text-slate-200'
            if (isCorrect || showCreatorCorrect) {
              btnStyle = 'border-emerald-400 bg-emerald-500/20 text-emerald-100 font-semibold'
            } else if (isWrong) {
              btnStyle = 'border-red-400 bg-red-500/20 text-red-100'
            }

            return (
              <button
                disabled={!!result}
                key={o.label}
                onClick={() => answer(o.label)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${btnStyle}`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-bold">
                  {o.label}
                </span>
                <span className="flex-1 leading-snug">{o.text}</span>
                {isCorrect && <Check className="h-5 w-5 text-emerald-300 shrink-0" />}
                {isWrong && <X className="h-5 w-5 text-red-300 shrink-0" />}
                {showCreatorCorrect && <span className="text-[10px] text-emerald-300 font-mono uppercase bg-emerald-950/80 px-1.5 py-0.5 rounded">Answer</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Explanation drawer */}
      {(result || creatorMode) && (
        <div className="mt-4 rounded-2xl bg-black/40 border border-white/5 p-4 text-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>{q.opinion_based ? 'Audience Sentiment' : 'Fact-Checked Explanation'}</span>
            {!q.opinion_based && (
              <span className="font-mono text-cyan-300">
                Correct: {result?.correct_answer || q.correct_answer || "—"}
              </span>
            )}
          </div>
          <div className="mt-2 text-slate-300 leading-relaxed">
            {q.opinion_based
              ? "Aggregated responses from live community votes."
              : result?.explanation || q.explanation || "Verified through sports record databases and news feeds."}
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
        <button
          onClick={save}
          title={saved ? "Saved" : "Save question"}
          className={`flex items-center gap-1.5 rounded-lg border border-slate-700 p-2 text-xs transition hover:border-slate-500 ${saved ? 'text-cyan-300 bg-cyan-400/10' : 'text-slate-300'}`}
        >
          <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
          <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
        </button>

        <button
          title="Copy Question Prompt"
          onClick={() => copyText(q.prompt, 'prompt')}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 p-2 text-xs text-slate-300 transition hover:border-slate-500"
        >
          {copied === 'prompt' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          <span className="hidden sm:inline">{copied === 'prompt' ? "Copied!" : "Copy"}</span>
        </button>

        <button
          title="View Grounding Sources"
          onClick={() => setShowSources(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 p-2 text-xs text-slate-300 transition hover:border-slate-500"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline">Sources ({q.sources?.length || 0})</span>
        </button>

        <button
          title="Copy Social / Instagram Caption"
          onClick={() => copyText(getInstagramCaption(), 'insta')}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 p-2 text-xs text-slate-300 transition hover:border-slate-500"
        >
          {copied === 'insta' ? <Check className="h-4 w-4 text-fuchsia-400" /> : <Instagram className="h-4 w-4" />}
          <span className="hidden sm:inline">{copied === 'insta' ? "Caption Copied!" : "Instagram"}</span>
        </button>

        <button
          title="Regenerate this question"
          onClick={regenerate}
          className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {onDeleted && (
          <button
            title="Delete question"
            onClick={remove}
            className="rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:border-red-500 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        <span className="ml-auto text-xs text-slate-400 font-mono">
          {Math.round(q.confidence_score * 100)}% confidence
        </span>
      </div>

      {/* Grounding Sources Modal */}
      <AnimatePresence>
        {showSources && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6 text-left shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h4 className="text-lg font-bold text-white">Grounding Sources & Verification</h4>
                  <p className="text-xs text-slate-400">Supporting evidence and claims for this question</p>
                </div>
                <button
                  onClick={() => setShowSources(false)}
                  className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {q.sources && q.sources.length > 0 ? (
                  q.sources.map((s, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-semibold text-cyan-300 text-sm">{s.title || "Sports Reference"}</div>
                        {s.url && (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                          >
                            Visit Source <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-300 leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/5">
                        "{s.statement}"
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500 font-mono">
                        {s.publication_date && <span>Published: {s.publication_date}</span>}
                        {s.retrieved_date && <span>Retrieved: {s.retrieved_date}</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400">
                    No explicit external web links attached. Grounded via sports knowledge baseline.
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSources(false)}
                  className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

