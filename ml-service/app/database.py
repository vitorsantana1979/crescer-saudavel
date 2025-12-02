"""Configuração de conexão com banco de dados SQL Server"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
import pandas as pd
from typing import Optional
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Engine do SQLAlchemy
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para models (se necessário)
Base = declarative_base()


def get_db() -> Session:
    """
    Dependency para obter sessão do banco
    
    Uso:
        @app.get("/endpoint")
        def endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def execute_query(query: str, params: Optional[dict] = None) -> pd.DataFrame:
    """
    Executa query SQL e retorna DataFrame do pandas
    
    Args:
        query: Query SQL
        params: Parâmetros para query parametrizada
        
    Returns:
        DataFrame com resultados
    """
    try:
        with engine.connect() as conn:
            if params:
                result = pd.read_sql(text(query), conn, params=params)
            else:
                result = pd.read_sql(text(query), conn)
        return result
    except Exception as e:
        logger.error(f"Erro ao executar query: {e}")
        raise


def test_connection() -> bool:
    """Testa conexão com o banco de dados"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Conexão com banco de dados estabelecida com sucesso")
        return True
    except Exception as e:
        logger.error(f"Erro ao conectar ao banco de dados: {e}")
        return False

