#!/bin/bash

# Script para criar ou atualizar senha de usuário

EMAIL=${1:-"medico@hospital.com"}
SENHA=${2:-"123456"}
NOME=${3:-"Dr. Médico Teste"}

echo "🔐 Atualizando/criando usuário: $EMAIL"
echo ""

# Primeiro, tenta criar o usuário
echo "📝 Tentando criar usuário..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"senha\": \"$SENHA\",
    \"nome\": \"$NOME\",
    \"tipoConselhoId\": 1,
    \"numeroRegistro\": \"12345-SP\"
  }")

# Verifica se o usuário já existe
if echo "$CREATE_RESPONSE" | grep -q "já cadastrado"; then
    echo "⚠️  Usuário já existe. Resetando senha..."
    RESET_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/reset-password \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$EMAIL\",
        \"novaSenha\": \"$SENHA\"
      }")
    
    echo "$RESET_RESPONSE" | jq .
    
    if echo "$RESET_RESPONSE" | jq -e '.message' > /dev/null 2>&1; then
        echo ""
        echo "✅ Senha atualizada com sucesso!"
        echo "📧 Email: $EMAIL"
        echo "🔑 Nova senha: $SENHA"
    else
        echo ""
        echo "❌ Erro ao atualizar senha"
        echo "$RESET_RESPONSE"
    fi
else
    echo "$CREATE_RESPONSE" | jq .
    if echo "$CREATE_RESPONSE" | jq -e '.token' > /dev/null 2>&1; then
        echo ""
        echo "✅ Usuário criado com sucesso!"
        echo "📧 Email: $EMAIL"
        echo "🔑 Senha: $SENHA"
    else
        echo ""
        echo "❌ Erro ao criar usuário"
    fi
fi

