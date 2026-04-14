from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    supabase_db_url: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379"

    # AI
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # Server
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: list[str] = ["http://localhost:3000"]

    # Sentry
    sentry_dsn: str = ""

    # Sentiment
    sentiment_frame_interval_ms: int = 5000
    sentiment_confidence_threshold: float = 0.6

    # Adaptive Learning OS (learning_os engine)
    app_name: str = "LearnOS"
    local_db_path: str = "data/learning_os_v2.db"
    rag_embedding_dimensions: int = 512  # 192 for hash fallback, 512 for text-embedding-3-small
    default_learner_id: str = "demo-learner"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
