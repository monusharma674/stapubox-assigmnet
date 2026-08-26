from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    openrouter_api_key: str = ""
    openrouter_model: str = "openrouter/auto"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    database_url: str = "sqlite:///./sportspark.db"
    chroma_persist_directory: str = "./chroma"
    app_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173"
    semantic_duplicate_threshold: float = 0.88
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

@lru_cache
def get_settings() -> Settings:
    return Settings()
