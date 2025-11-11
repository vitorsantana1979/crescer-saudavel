#!/bin/bash

# Script para resetar senha de usuário

EMAIL=${1:-"medico@hospital.com"}
NOVA_SENHA=${2:-"123456"}

echo "🔄 Resetando senha para: $EMAIL"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"novaSenha\": \"$NOVA_SENHA\"
  }")

echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.message' > /dev/null 2>&1; then
    echo ""
    echo "✅ Senha resetada com sucesso!"
    echo "📧 Email: $EMAIL"
    echo "🔑 Nova senha: $NOVA_SENHA"
else
    echo ""
    echo "❌ Erro ao resetar senha"
fi

