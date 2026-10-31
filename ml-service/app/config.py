"""Configurações do serviço de ML"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Configurações da aplicação"""
    
    # Banco de dados
    DATABASE_SERVER: str = ""
    DATABASE_PORT: int = 1433
    DATABASE_NAME: str = "crescer"
    DATABASE_USER: str = "crescer"
    DATABASE_PASSWORD: str = ""
    DATABASE_DRIVER: str = "pymssql"
    DATABASE_TRUST_CERTIFICATE: bool = True
    
    # ML Models
    MODEL_PATH: str = "./models"
    MODEL_RETRAIN_THRESHOLD_DAYS: int = 30
    MIN_SAMPLES_FOR_TRAINING: int = 50
    
    # API
    API_TITLE: str = "Crescer Saudável ML Service"
    API_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    
    # OpenAI (para LLM - Fase 2)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4"
    OPENAI_MAX_TOKENS: int = 2000
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]
    
    class Config:
        # Segredos vêm do ambiente ou de um .env não versionado: ml-service/.env ou o
        # .env da raiz do repositório (veja .env.example). O último arquivo tem prioridade.
        env_file = ("../.env", ".env")
        case_sensitive = True
    
    @property
    def database_url(self) -> str:
        """Constrói URL de conexão com SQL Server"""
        if not self.DATABASE_SERVER:
            raise RuntimeError(
                "DATABASE_SERVER não configurado. Defina a variável de ambiente no formato "
                "host,porta (ou ml-service/.env) — veja .env.example na raiz do repositório."
            )
        if not self.DATABASE_PASSWORD:
            raise RuntimeError(
                "DATABASE_PASSWORD não configurada. Defina a variável de ambiente "
                "(ou ml-service/.env) — veja .env.example na raiz do repositório."
            )
        # DATABASE_SERVER segue o formato do .env.example ("host,porta"); "host:porta" e
        # só "host" (com DATABASE_PORT) também valem.
        host, _, port = self.DATABASE_SERVER.replace(":", ",").partition(",")
        return (
            f"mssql+pymssql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}"
            f"@{host}:{port or self.DATABASE_PORT}/{self.DATABASE_NAME}"
        )


# Instância global de configurações
settings = Settings()

