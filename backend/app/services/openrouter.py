import json
from datetime import datetime, timezone
import httpx
from app.core.config import get_settings

class OpenRouterError(RuntimeError):
    pass

class OpenRouterClient:
    def __init__(self):
        self.settings = get_settings()

    async def status(self):
        if not self.settings.openrouter_api_key:
            return {"status": "error", "mode": "configuration", "message": "OPENROUTER_API_KEY is missing"}
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                response = await client.get(f"{self.settings.openrouter_base_url}/models", headers={"Authorization": f"Bearer {self.settings.openrouter_api_key}"})
            if response.status_code == 200:
                return {"status": "connected", "mode": "live", "message": "OpenRouter connected"}
            if response.status_code in {401, 403}:
                return {"status": "error", "mode": "configuration", "message": "OpenRouter key rejected"}
            return {"status": "limited", "mode": "fallback", "message": f"OpenRouter returned {response.status_code}"}
        except Exception:
            return {"status": "limited", "mode": "fallback", "message": "OpenRouter temporarily unreachable"}

    async def generate(self, system_prompt: str, user_prompt: str, schema: dict, use_web: bool):
        if not self.settings.openrouter_api_key:
            raise OpenRouterError("Missing OpenRouter API key")
        body = {
            "model": self.settings.openrouter_model,
            "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            "response_format": {"type": "json_schema", "json_schema": {"name": "sportspark_batch", "strict": True, "schema": schema}},
            "temperature": 0.6
        }
        headers = {"Authorization": f"Bearer {self.settings.openrouter_api_key}", "Content-Type": "application/json", "HTTP-Referer": self.settings.app_url, "X-Title": "SportSpark AI"}
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(f"{self.settings.openrouter_base_url}/chat/completions", json=body, headers=headers)
        if response.status_code == 402:
            raise OpenRouterError("Insufficient OpenRouter credits")
        if response.status_code == 429:
            raise OpenRouterError("OpenRouter rate limit reached")
        if response.status_code >= 400:
            raise OpenRouterError(f"OpenRouter request failed with status {response.status_code}")
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        if isinstance(content, list):
            content = "".join(x.get("text", "") for x in content if isinstance(x, dict))
        try:
            return json.loads(content)
        except Exception as exc:
            raise OpenRouterError("Invalid structured output") from exc

def today_iso():
    return datetime.now(timezone.utc).date().isoformat()
