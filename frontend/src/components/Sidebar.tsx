import { BarChart3, Bookmark, BrainCircuit, ChevronLeft, History, Settings, Sparkles, Database } from "lucide-react"
import { NavLink } from "react-router-dom"

const items = [
  ['/', 'Generate', Sparkles],
  ['/history', 'History', History],
  ['/saved', 'Saved', Bookmark],
  ['/knowledge', 'Knowledge Sources', Database],
  ['/analytics', 'Analytics', BarChart3],
  ['/settings', 'Settings', Settings]
] as const
export function Sidebar({collapsed,setCollapsed}:{collapsed:boolean,setCollapsed:(v:boolean)=>void}){
 return <aside className={`glass sticky top-0 hidden h-screen shrink-0 flex-col border-y-0 border-l-0 lg:flex ${collapsed?'w-20':'w-64'} transition-all`}>
  <div className="flex items-center gap-3 p-5"><div className="rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 p-2.5"><BrainCircuit className="h-6 w-6"/></div>{!collapsed&&<div><div className="font-black">SportSpark AI</div><div className="text-xs text-slate-400">Sports content agent</div></div>}</div>
  <nav className="space-y-1 p-3">{items.map(([to,label,Icon])=><NavLink key={to} to={to} className={({isActive})=>`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${isActive?'bg-blue-500/15 text-cyan-300':'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Icon className="h-5 w-5"/>{!collapsed&&label}</NavLink>)}</nav>
  <button aria-label="Collapse navigation" onClick={()=>setCollapsed(!collapsed)} className="m-3 mt-auto flex items-center justify-center rounded-xl border border-slate-700 p-3 text-slate-400 hover:text-white"><ChevronLeft className={`h-5 w-5 ${collapsed?'rotate-180':''}`}/></button>
 </aside>
}
