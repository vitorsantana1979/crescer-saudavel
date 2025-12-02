"""Aplicação principal FastAPI para serviço de ML"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from datetime import datetime

from app.config import settings
from app.database import test_connection
from app.schemas import HealthCheck

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Criar aplicação FastAPI
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="Serviço de Machine Learning para análise preditiva e sugestões de dietoterapia",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== LIFECYCLE EVENTS ====================

@app.on_event("startup")
async def startup_event():
    """Executado ao iniciar a aplicação"""
    logger.info(f"Iniciando {settings.API_TITLE} v{settings.API_VERSION}")
    
    # Testar conexão com banco de dados
    if not test_connection():
        logger.error("ERRO: Não foi possível conectar ao banco de dados!")
    else:
        logger.info("Conexão com banco de dados estabelecida")
    
    logger.info("Serviço de ML iniciado com sucesso")


@app.on_event("shutdown")
async def shutdown_event():
    """Executado ao desligar a aplicação"""
    logger.info("Encerrando serviço de ML...")


# ==================== ROOT ENDPOINTS ====================

@app.get("/")
async def root():
    """Endpoint raiz"""
    return {
        "service": settings.API_TITLE,
        "version": settings.API_VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Verifica saúde do serviço"""
    db_connected = test_connection()
    
    # TODO: Verificar se modelos estão carregados
    models_loaded = True  # Placeholder
    
    status = "healthy" if (db_connected and models_loaded) else "unhealthy"
    
    return HealthCheck(
        status=status,
        database_connected=db_connected,
        models_loaded=models_loaded,
        version=settings.API_VERSION,
        timestamp=datetime.now()
    )


# ==================== EXCEPTION HANDLERS ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handler para exceções HTTP"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "timestamp": datetime.now().isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handler para exceções gerais"""
    logger.error(f"Erro não tratado: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Erro interno do servidor",
            "message": str(exc),
            "timestamp": datetime.now().isoformat()
        }
    )


# ==================== INCLUIR ROUTERS ====================

# Importar e incluir routers (serão criados nos próximos passos)
try:
    from app.routers import predictions, analytics, food_analytics
    
    app.include_router(
        predictions.router,
        prefix=f"{settings.API_PREFIX}/predictions",
        tags=["Predictions"]
    )
    
    app.include_router(
        analytics.router,
        prefix=f"{settings.API_PREFIX}/analytics",
        tags=["Analytics"]
    )
    
    app.include_router(
        food_analytics.router,
        prefix=f"{settings.API_PREFIX}/analytics",
        tags=["Food Analytics"]
    )
    
    logger.info("Routers carregados com sucesso")
except ImportError as e:
    logger.warning(f"Alguns routers não puderam ser carregados: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

