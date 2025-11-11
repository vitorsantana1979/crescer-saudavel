#!/bin/bash

# Script para criar um usuário de teste

echo "Criando usuário de teste..."

curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@crescersaudavel.com",
    "senha": "123456",
    "nome": "Dr. Admin",
    "tipoConselhoId": 1,
    "numeroRegistro": "12345-SP"
  }'

echo ""
echo "Usuário criado com sucesso!"
echo "Email: admin@crescersaudavel.com"
echo "Senha: 123456"


