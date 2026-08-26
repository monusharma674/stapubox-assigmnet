import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Database, Search, Plus, ExternalLink, Sparkles, CheckCircle2, AlertCircle } from "lucide-react"
import { api } from "../lib/api"

export function KnowledgePage() {
  const [query, setQuery] = useState("World Cup")
  const [showIngest, setShowIngest] = useState(false)
  const [ingestStatus, setIngestStatus] = useState<string | null>(null)

  // Ingest form state
  const [sport, setSport] = useState("Cricket")
  const [factText, setFactText] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [sourceTitle, setSourceTitle] = useState("")
  const [era, setEra] = useState("Historical")

  const { data: searchResults = [], refetch, isFetching } = useQuery({
    queryKey: ['knowledge-search', query],
    queryFn: () => api<any[]>(`/knowledge/search?q=${encodeURIComponent(query)}`),
    enabled: !!query.trim()
  })

  const ingestMutation = useMutation({
    mutationFn: () =>
      api<{ ingested: number }>('/knowledge/ingest', {
        method: 'POST',
        body: JSON.stringify([
          {
            sport,
            fact_text: factText,
            source_url: sourceUrl,
            source_title: sourceTitle || "Sports Encyclopedia",
            era
          }
        ])
      }),
    onSuccess: data => {
      setIngestStatus(`Successfully ingested ${data.ingested} factual record into ChromaDB knowledge base.`)
      setFactText("")
      setSourceUrl("")
      setSourceTitle("")
      setTimeout(() => setIngestStatus(null), 4000)
      refetch()
    }
  })

  function handleIngestSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!factText.trim() || !sourceUrl.trim()) return
    ingestMutation.mutate()
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-8">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-cyan-400/20 bg-gradient-to-br from-blue-600/20 via-teal-500/10 to-indigo-600/15 p-6 md:p-10 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-400/10 border border-cyan-400/30 px-3.5 py-1 text-xs font-bold text-cyan-300">
              <Database className="h-3.5 w-3.5" /> Persistent ChromaDB Vector Store
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Knowledge Base & Grounding Hub
            </h1>
            <p className="mt-3 text-slate-300 text-sm md:text-base leading-relaxed">
              Explore trusted historical sports facts retrieved by AI during quiz generation, or ingest verified encyclopedic records.
            </p>
          </div>

          <button
            onClick={() => setShowIngest(!showIngest)}
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-cyan-300 transition shadow-lg shadow-cyan-500/20"
          >
            <Plus className="h-4 w-4" />
            {showIngest ? "Close Ingestion Form" : "Ingest New Fact"}
          </button>
        </div>
      </section>

      {/* Ingestion Box */}
      {showIngest && (
        <form
          onSubmit={handleIngestSubmit}
          className="glass rounded-[2rem] p-6 md:p-8 border border-cyan-500/30 space-y-5 animate-in fade-in"
        >
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Ingest Verified Sports Knowledge</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <label className="text-xs text-slate-400 font-semibold uppercase">
              Sport
              <select
                value={sport}
                onChange={e => setSport(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
              >
                {['Cricket', 'Football', 'Tennis', 'Badminton', 'Basketball', 'Hockey', 'Formula 1', 'Athletics'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-400 font-semibold uppercase">
              Era / Time Scope
              <select
                value={era}
                onChange={e => setEra(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
              >
                <option value="Historical">Historical</option>
                <option value="Evergreen">Evergreen</option>
                <option value="Latest">Latest</option>
              </select>
            </label>

            <label className="text-xs text-slate-400 font-semibold uppercase">
              Source Publication Title
              <input
                value={sourceTitle}
                onChange={e => setSourceTitle(e.target.value)}
                placeholder="e.g. ESPN Cricinfo, Olympic Records"
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
              />
            </label>
          </div>

          <label className="block text-xs text-slate-400 font-semibold uppercase">
            Source URL (HTTP or HTTPS)
            <input
              required
              type="url"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="https://example.com/sports-fact"
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
            />
          </label>

          <label className="block text-xs text-slate-400 font-semibold uppercase">
            Factual Statement / Record Text
            <textarea
              required
              rows={3}
              value={factText}
              onChange={e => setFactText(e.target.value)}
              placeholder="e.g. In 1983, India won their first ICC Cricket World Cup by defeating West Indies at Lord's."
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white"
            />
          </label>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={ingestMutation.isPending}
              className="rounded-xl bg-cyan-400 px-6 py-2.5 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 text-sm"
            >
              {ingestMutation.isPending ? "Embedding & Storing in ChromaDB..." : "Store Fact"}
            </button>
          </div>

          {ingestMutation.error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{ingestMutation.error.message}</span>
            </div>
          )}
        </form>
      )}

      {ingestStatus && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-sm text-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{ingestStatus}</span>
        </div>
      )}

      {/* Semantic Search Box */}
      <div className="glass rounded-[2rem] p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Semantic Knowledge Search</h3>
            <p className="text-xs text-slate-400">Search embeddings in the Chroma collection</p>
          </div>
          <span className="text-xs font-mono text-cyan-300">
            {searchResults.length} {searchResults.length === 1 ? 'record' : 'records'} found
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search sports records, players, champions, or tournaments..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {searchResults.length > 0 ? (
          searchResults.map((row: any, idx: number) => (
            <div
              key={idx}
              className="glass rounded-2xl p-5 border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {row.metadata?.sport && (
                      <span className="rounded-full bg-cyan-400/15 border border-cyan-400/30 px-2.5 py-0.5 text-xs font-bold text-cyan-300">
                        {row.metadata.sport}
                      </span>
                    )}
                    {row.metadata?.era && (
                      <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300">
                        {row.metadata.era}
                      </span>
                    )}
                    {row.distance !== undefined && row.distance !== null && (
                      <span className="text-[11px] font-mono text-slate-500">
                        Relevance: {Math.max(0, Math.round((1 - row.distance) * 100))}%
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {row.document}
                  </p>
                </div>

                {row.metadata?.source_url && (
                  <a
                    href={row.metadata.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 p-2 text-xs text-blue-400 hover:border-slate-500 shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="glass rounded-[2rem] border border-slate-800 py-16 text-center text-slate-500">
            No knowledge records match "{query}". Ingest new facts above to seed the ChromaDB vector store.
          </div>
        )}
      </div>
    </div>
  )
}
