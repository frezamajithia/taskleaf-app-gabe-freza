from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

    # App
    APP_NAME: str = "TaskLeaf API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False  # Disable debug for production

    # Database
    DATABASE_URL: str  # Loaded from Railway env variable

    # JWT
    SECRET_KEY: str          # Loaded from Railway
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    # CORS
    # Leave empty so Railway ALLOWED_ORIGINS overrides it
    ALLOWED_ORIGINS: str = ""

    # External APIs
    OPENWEATHER_API_KEY: str = ""
    OPENWEATHER_BASE_URL: str = "https://api.openweathermap.org/data/2.5"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""

    @property
    def cors_origins(self) -> List[str]:
        """Convert comma-separated string to list"""
        if not self.ALLOWED_ORIGINS:
            return []
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
