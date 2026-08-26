const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"

export async function api<T>(path:string, init?:RequestInit):Promise<T>{
  const response = await fetch(`${base}${path}`, { headers:{"Content-Type":"application/json", ...(init?.headers || {})}, ...init })
  const payload = await response.json().catch(() => ({}))
  if(!response.ok) {
    const message = (typeof payload?.detail === "string" ? payload.detail : payload?.detail?.message) || payload?.error?.message || payload?.message || "Request failed"
    throw new Error(message)
  }
  return payload.data as T
}
