import { useState } from "react"
import { Route, Routes } from "react-router-dom"
import { Sidebar } from "./components/Sidebar"
import { Header } from "./components/Header"
import { GeneratePage } from "./pages/GeneratePage"
import { HistoryPage } from "./pages/HistoryPage"
import { KnowledgePage } from "./pages/KnowledgePage"
import { AnalyticsPage } from "./pages/AnalyticsPage"
import { SettingsPage } from "./pages/SettingsPage"

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="min-h-screen lg:flex bg-[#050b14] text-slate-100 font-sans selection:bg-cyan-400 selection:text-slate-950">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="min-w-0 flex-1 flex flex-col">
        <Header />
        <main className="flex-1 pb-16">
          <Routes>
            <Route path="/" element={<GeneratePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/saved" element={<HistoryPage saved />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

