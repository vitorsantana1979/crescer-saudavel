"""Configurações do serviço de ML"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Configurações da aplicação"""
    
    # Banco de dados
    DATABASE_SERVER: str = "sql.vsantana.com.br"
    DATABASE_PORT: int = 1279
    DATABASE_NAME: str = "crescer"
    DATABASE_USER: str = "crescer"
    DATABASE_PASSWORD: str = "QSSmFTgRS7B3rsdl"
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
        env_file = ".env"
        case_sensitive = True
    
    @property
    def database_url(self) -> str:
        """Constrói URL de conexão com SQL Server"""
        return (
            f"mssql+pymssql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}"
            f"@{self.DATABASE_SERVER}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
        )


# Instância global de configurações
settings = Settings()

