import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Settings as SettingsIcon, Server, Shield, Check, Save, HardDrive, Cpu } from "lucide-react"
import { api } from "../lib/api"

export function SettingsPage() {
  const [defaultSport, setDefaultSport] = useState("Cricket")
  const [defaultDifficulty, setDefaultDifficulty] = useState("Medium")
  const [defaultTimeScope, setDefaultTimeScope] = useState("Mixed")
  const [duplicateThreshold, setDuplicateThreshold] = useState("0.88")
  const [savedStatus, setSavedStatus] = useState(false)

  // Load existing application settings from backend
  const { data: appSettings, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<Record<string, string>>('/settings')
  })

  // Load health and AI connection info
  const { data: healthData } = useQuery({
    queryKey: ['health-status'],
    queryFn: () => api<{ service: string; ai: { status: string; mode: string; message: string } }>('/health')
  })

  useEffect(() => {
    if (appSettings) {
      if (appSettings.default_sport) setDefaultSport(appSettings.default_sport)
      if (appSettings.default_difficulty) setDefaultDifficulty(appSettings.default_difficulty)
      if (appSettings.default_time_scope) setDefaultTimeScope(appSettings.default_time_scope)
      if (appSettings.duplicate_threshold) setDuplicateThreshold(appSettings.duplicate_threshold)
    }
  }, [appSettings])

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api('/settings/default_sport', { method: 'PUT', body: JSON.stringify({ value: defaultSport }) })
      await api('/settings/default_difficulty', { method: 'PUT', body: JSON.stringify({ value: defaultDifficulty }) })
      await api('/settings/default_time_scope', { method: 'PUT', body: JSON.stringify({ value: defaultTimeScope }) })
      await api('/settings/duplicate_threshold', { method: 'PUT', body: JSON.stringify({ value: duplicateThreshold }) })
    },
    onSuccess: () => {
      setSavedStatus(true)
      setTimeout(() => setSavedStatus(false), 3000)
      refetch()
    }
  })

  const aiStatus = healthData?.ai?.status
  const dotColor = aiStatus === 'connected' ? 'bg-emerald-400' : aiStatus === 'limited' ? 'bg-amber-400' : 'bg-red-500'

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">System Settings & Configuration</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage generation parameters, connection diagnostics, and vector threshold configurations.
        </p>
      </div>

      {/* Diagnostics Card */}
      <div className="glass rounded-[2rem] p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Server className="h-5 w-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">System & AI Gateway Status</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>OpenRouter AI Link</span>
              <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
            </div>
            <div className="mt-2 text-lg font-bold text-white capitalize">{aiStatus || 'Checking...'}</div>
            <div className="mt-1 text-[11px] text-slate-400">{healthData?.ai?.message}</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Vector Database</span>
              <HardDrive className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-2 text-lg font-bold text-white">ChromaDB</div>
            <div className="mt-1 text-[11px] text-slate-400">Persistent Disk Storage</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Relational Storage</span>
              <Cpu className="h-4 w-4 text-purple-400" />
            </div>
            <div className="mt-2 text-lg font-bold text-white">SQLite / SQLAlchemy</div>
            <div className="mt-1 text-[11px] text-slate-400">Automatic Migrations</div>
          </div>
        </div>
      </div>

      {/* Preferences Form */}
      <div className="glass rounded-[2rem] p-6 md:p-8 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Generation Defaults</h3>
            <p className="text-xs text-slate-400">Default options preset across generate and arena screens</p>
          </div>
          <SettingsIcon className="h-5 w-5 text-cyan-400" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Default Sport Category
            <select
              value={defaultSport}
              onChange={e => setDefaultSport(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              {['Cricket', 'Football', 'Tennis', 'Badminton', 'Basketball', 'Hockey', 'Formula 1', 'Boxing', 'Athletics'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Default Difficulty Tier
            <select
              value={defaultDifficulty}
              onChange={e => setDefaultDifficulty(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              <option value="Easy">Easy (Casual)</option>
              <option value="Medium">Medium (Regular)</option>
              <option value="Hard">Hard (Expert)</option>
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Default Time Scope
            <select
              value={defaultTimeScope}
              onChange={e => setDefaultTimeScope(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              <option value="Latest">Latest (Live Web)</option>
              <option value="Historical">Historical (Records)</option>
              <option value="Mixed">Mixed (Balanced)</option>
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Semantic Duplicate Threshold (0.50 - 0.99)
            <input
              type="number"
              step="0.01"
              min="0.5"
              max="0.99"
              value={duplicateThreshold}
              onChange={e => setDuplicateThreshold(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            />
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span>OpenRouter secrets are protected server-side and never exposed to the client.</span>
          </div>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-300 transition disabled:opacity-50 text-sm shadow-md shadow-cyan-500/20"
          >
            {savedStatus ? (
              <>
                <Check className="h-4 w-4 text-slate-950" /> Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
