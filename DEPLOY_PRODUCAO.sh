#!/bin/bash

# Script de Deploy Produção - Crescer Saudável
# Executar no servidor de produção

echo "🚀 Iniciando deploy em produção..."

# 1. Parar containers
echo "⏸️  Parando containers..."
docker-compose down

# 2. Atualizar código do GitHub
echo "📥 Puxando código do GitHub..."
git pull origin main

# 3. Rebuild das imagens (incluindo ML Service)
echo "🔨 Rebuilding containers..."
docker-compose build --no-cache

# 4. Subir containers
echo "▶️  Iniciando containers..."
docker-compose up -d

# 5. Aguardar inicialização
echo "⏳ Aguardando serviços iniciarem..."
sleep 15

# 6. Verificar status
echo ""
echo "📊 Status dos containers:"
docker-compose ps

echo ""
echo "🔍 Verificando saúde dos serviços..."

# Verificar Backend
if curl -s http://localhost:5280/api/health | grep -q "ok"; then
    echo "✅ Backend: OK"
else
    echo "❌ Backend: FALHOU"
fi

# Verificar ML Service
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo "✅ ML Service: OK"
else
    echo "❌ ML Service: FALHOU"
fi

# Verificar Frontend
if curl -s http://localhost:5193 > /dev/null 2>&1; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: FALHOU"
fi

echo ""
echo "📋 Logs recentes do backend:"
docker-compose logs backend --tail=10

echo ""
echo "📋 Logs recentes do ml-service:"
docker-compose logs ml-service --tail=10

echo ""
echo "✅ Deploy concluído!"
echo "🌐 Acesse: https://cs.quasarai.co"

