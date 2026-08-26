import { handleFallbackApi } from "./fallback"

const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${base}${path}`, {
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      ...init
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message =
        (typeof payload?.detail === "string" ? payload.detail : payload?.detail?.message) ||
        payload?.error?.message ||
        payload?.message ||
        "Request failed"
      throw new Error(message)
    }
    return (payload.data !== undefined ? payload.data : payload) as T
  } catch (err: any) {
    // If backend is offline, asleep, or network failed, fallback gracefully to client engine
    if (err?.name === "TypeError" || err?.message?.includes("fetch") || err?.message?.includes("NetworkError")) {
      return handleFallbackApi(path, init) as T
    }
    throw err
  }
}

