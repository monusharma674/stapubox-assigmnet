import { handleFallbackApi } from "./fallback"

const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${base}${path}`, {
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      ...init
    })
    if (!response.ok) {
      if (response.status >= 500 || response.status === 404 || response.status === 502 || response.status === 503) {
        console.warn(`[SportSpark AI] Backend returned ${response.status} for ${path}. Using client engine.`);
        return handleFallbackApi(path, init) as T;
      }
      const payload = await response.json().catch(() => ({}))
      const message =
        (typeof payload?.detail === "string" ? payload.detail : payload?.detail?.message) ||
        payload?.error?.message ||
        payload?.message ||
        "Request failed"
      throw new Error(message)
    }
    const payload = await response.json().catch(() => ({}))
    return (payload.data !== undefined ? payload.data : payload) as T
  } catch (err: any) {
    console.warn(`[SportSpark AI] Network request to ${path} failed (${err?.message}). Switching to client engine.`);
    return handleFallbackApi(path, init) as T
  }
}

