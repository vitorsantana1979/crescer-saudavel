#!/bin/bash

# Script para iniciar o ML Service garantindo que a porta 8000 está livre

echo "🔍 Verificando porta 8000..."

# Matar qualquer processo Code Helper na porta 8000
CODE_HELPER=$(lsof -ti:8000 | xargs ps -p | grep "Code Helper" | awk '{print $1}' | tail -1)
if [ ! -z "$CODE_HELPER" ]; then
    echo "🔴 Matando Code Helper na porta 8000 (PID: $CODE_HELPER)..."
    kill -9 $CODE_HELPER
    sleep 2
fi

# Verificar se ainda há algo na porta 8000
if lsof -ti:8000 > /dev/null 2>&1; then
    echo "⚠️  Porta 8000 ainda ocupada. Matando todos os processos..."
    lsof -ti:8000 | xargs kill -9
    sleep 2
fi

echo "✅ Porta 8000 livre!"
echo "🚀 Iniciando ML Service..."

# Ir para o diretório correto
cd "$(dirname "$0")"

# Iniciar ML Service
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

