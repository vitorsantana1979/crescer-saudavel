# 🤖 INSTRUÇÕES PARA IA DO SERVIDOR - Crescer Saudável

## 📋 CONTEXTO

O sistema Crescer Saudável tem 3 serviços Docker:

1. **Backend C# (.NET 8)** - API REST na porta 5280
2. **ML Service Python (FastAPI)** - Serviço de Machine Learning na porta 8000
3. **Frontend React (Vite)** - SPA na porta 80

**Domínio**: cs.quasarai.co  
**Servidor Web**: Caddy (proxy reverso)

---

## 🚨 PROBLEMAS ATUAIS

### Problema 1: API retorna 404 para `/api/analytics/*`

- **Sintoma**: `GET /api/analytics/predict-growth/{id}` retorna 404
- **Causa**: Backend não foi atualizado com novos controllers
- **Solução**: Rebuild dos containers Docker

### Problema 2: SPA retorna 404 ao recarregar página (F5)

- **Sintoma**: Ao recarregar `/ia-insights/{id}` → 404
- **Causa**: Caddy não está configurado para SPA routing
- **Solução**: Configurar Caddy para fallback no index.html

---

## ✅ SOLUÇÃO 1: ATUALIZAR BACKEND E ML SERVICE

### Passo 1: Verificar Estado Atual

```bash
# Conectar ao servidor
cd /caminho/do/projeto/crescer-saudavel

# Ver containers rodando
docker-compose -f docker-compose.production.yml ps

# Ver última build
docker images | grep crescer
```

### Passo 2: Parar Containers

```bash
docker-compose -f docker-compose.production.yml down
```

### Passo 3: Atualizar Código do GitHub

```bash
git fetch origin
git pull origin main
```

**IMPORTANTE**: Verificar se o código foi atualizado:

```bash
git log --oneline -5
```

Deve conter commits recentes como:

- "feat: Chat IA com busca por nome e formato tools OpenAI"
- "feat: Configuração Docker Compose para produção"

### Passo 4: Verificar Arquivo .env

```bash
cat .env | grep -E "OpenAI|DATABASE"
```

**Deve conter**:

```env
DATABASE_SERVER=<host-do-sql>,<porta>
DATABASE_NAME=crescer
DATABASE_USER=crescer
DATABASE_PASSWORD=<senha-do-banco>
OPENAI_API_KEY=<chave-openai>
OpenAI__ApiKey=<chave-openai>
```

### Passo 5: Rebuild COMPLETO dos Containers

```bash
# Rebuild sem cache (importante!)
docker-compose -f docker-compose.production.yml build --no-cache

# Subir containers
docker-compose -f docker-compose.production.yml up -d

# Aguardar 15 segundos para inicialização
sleep 15
```

### Passo 6: Verificar Status

```bash
# Ver containers
docker-compose -f docker-compose.production.yml ps

# Todos devem estar "Up"

# Testar Backend
curl http://localhost:5280/api/health
# Esperado: {"ok":true}

# Testar ML Service
curl http://localhost:8000/health
# Esperado: {"status":"healthy",...}

# Testar novo endpoint Analytics
curl http://localhost:5280/api/analytics/stats
# Se retornar dados JSON → ✅ SUCESSO
# Se retornar 404 → ❌ Backend não atualizou
```

### Passo 7: Ver Logs se Houver Problemas

```bash
# Logs do backend
docker-compose -f docker-compose.production.yml logs backend --tail=100

# Logs do ml-service
docker-compose -f docker-compose.production.yml logs ml-service --tail=100

# Erros críticos
docker-compose -f docker-compose.production.yml logs | grep -i error
```

---

## ✅ SOLUÇÃO 2: CONFIGURAR CADDY PARA SPA ROUTING

### Problema

Quando o usuário acessa `/ia-insights/{id}` e aperta F5, o Caddy tenta buscar esse arquivo no servidor e retorna 404.

### Solução: Fallback para index.html

O Caddy precisa redirecionar TODAS as rotas do frontend para `index.html`, exceto arquivos estáticos.

### Configuração do Caddyfile

Localize o arquivo `Caddyfile` (geralmente em `/etc/caddy/Caddyfile` ou na pasta do projeto).

**Configuração Correta**:

```caddy
cs.quasarai.co {
    # Configuração de logs
    log {
        output file /var/log/caddy/access.log
        format json
    }

    # BACKEND API - Proxy para porta 5280
    handle /api/* {
        reverse_proxy localhost:5280
    }

    # ML SERVICE - Proxy para porta 8000 (se necessário acesso direto)
    handle /ml/* {
        reverse_proxy localhost:8000
    }

    # FRONTEND SPA - Servir arquivos estáticos + fallback
    handle {
        # Tentar servir arquivo estático primeiro
        root * /caminho/do/frontend/dist

        # Se não existir, retornar index.html (SPA routing)
        try_files {path} /index.html

        file_server
    }

    # Headers de segurança
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Compressão
    encode gzip zstd
}
```

### OU (se frontend estiver em container Docker):

```caddy
cs.quasarai.co {
    log {
        output file /var/log/caddy/access.log
        format json
    }

    # BACKEND API
    handle /api/* {
        reverse_proxy localhost:5280 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # FRONTEND (proxy para container Docker na porta 80)
    handle {
        reverse_proxy localhost:80 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    encode gzip zstd
}
```

### Aplicar Configuração do Caddy

```bash
# Testar configuração
caddy validate --config /etc/caddy/Caddyfile

# Se válida, recarregar
caddy reload --config /etc/caddy/Caddyfile

# OU reiniciar serviço
systemctl reload caddy
```

### Verificar Caddy

```bash
# Ver status
systemctl status caddy

# Ver logs
journalctl -u caddy -f

# Testar acesso
curl -I https://cs.quasarai.co
```

---

## ✅ SOLUÇÃO ALTERNATIVA: CONFIGURAR SPA NO FRONTEND CONTAINER

Se o frontend estiver em container Docker, adicione ao `Dockerfile` do frontend:

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Nginx para servir SPA
FROM nginx:alpine

# Copiar build
COPY --from=build /app/dist /usr/share/nginx/html

# Configuração Nginx para SPA
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://backend:5280; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🔍 DIAGNÓSTICO COMPLETO

### 1. Verificar se Backend tem os novos endpoints

```bash
# Entrar no container do backend
docker-compose -f docker-compose.production.yml exec backend bash

# Ver DLLs compiladas (deve ter data recente)
ls -lh /app/*.dll

# Verificar variáveis de ambiente
env | grep -E "OpenAI|MLService"

# Sair
exit
```

### 2. Testar Endpoints Diretamente

```bash
# Backend Health
curl -v http://localhost:5280/api/health

# Analytics Stats (novo endpoint)
curl -v http://localhost:5280/api/analytics/stats

# Predict Growth (novo endpoint)
curl -v -X POST http://localhost:5280/api/analytics/predict-growth/test-id \
  -H "Content-Type: application/json" \
  -d '{}'

# Se 404 → Backend não foi atualizado
# Se 500 → Backend atualizado mas erro interno
# Se 200 → ✅ Funcionando
```

### 3. Verificar Comunicação Backend → ML Service

```bash
# Do container backend, testar ML service
docker-compose -f docker-compose.production.yml exec backend \
  curl http://ml-service:8000/health

# Se erro → problema de rede Docker
# Se sucesso → comunicação OK
```

---

## 📊 CHECKLIST DE VERIFICAÇÃO

Após aplicar as soluções, verificar:

- [ ] `docker-compose ps` - todos containers `Up`
- [ ] `curl http://localhost:5280/api/health` → `{"ok":true}`
- [ ] `curl http://localhost:8000/health` → `{"status":"healthy"}`
- [ ] `curl http://localhost:5280/api/analytics/stats` → JSON com dados
- [ ] `curl https://cs.quasarai.co/api/health` → `{"ok":true}`
- [ ] Abrir `https://cs.quasarai.co` → Site carrega
- [ ] Fazer login → Funciona
- [ ] Acessar qualquer rota → Funciona
- [ ] Apertar F5 em qualquer rota → ✅ NÃO dá 404
- [ ] Abrir IA Insights de um paciente → ✅ Carrega dados
- [ ] Testar Chat IA → ✅ Funciona

---

## 🆘 TROUBLESHOOTING

### Erro: Container não sobe

```bash
docker-compose -f docker-compose.production.yml logs nome-container --tail=200
```

### Erro: Backend sempre 404 em `/analytics`

```bash
# Verificar se código foi atualizado
cd /projeto
git log --oneline --graph -10

# Forçar rebuild TOTAL
docker-compose -f docker-compose.production.yml down -v
docker system prune -af
docker-compose -f docker-compose.production.yml build --no-cache --pull
docker-compose -f docker-compose.production.yml up -d
```

### Erro: ML Service não conecta

```bash
# Verificar rede Docker
docker network inspect crescer-saudavel_app-network

# Backend deve estar na mesma rede que ml-service
```

### Erro: Caddy não recarrega

```bash
# Parar e iniciar (não reload)
systemctl stop caddy
systemctl start caddy

# Ver erros
journalctl -u caddy --since "5 minutes ago"
```

---

## 🎯 RESUMO EXECUTIVO

**Execute nesta ordem**:

1. `cd /projeto`
2. `docker-compose -f docker-compose.production.yml down`
3. `git pull origin main`
4. `docker-compose -f docker-compose.production.yml build --no-cache`
5. `docker-compose -f docker-compose.production.yml up -d`
6. Aguardar 15s
7. `curl http://localhost:5280/api/analytics/stats` → Se retornar JSON, backend OK
8. Configurar Caddyfile para SPA routing (try_files)
9. `caddy reload`
10. Testar: https://cs.quasarai.co
11. ✅ FUNCIONANDO

---

**Data**: 2025-12-03  
**Versão**: 1.0  
**Sistema**: Crescer Saudável - Módulo IA/ML
