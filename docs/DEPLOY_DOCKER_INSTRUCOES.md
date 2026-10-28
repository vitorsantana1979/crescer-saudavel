# Deploy Docker - Instruções Completas

## 🚀 Deploy Rápido

### No seu computador (local):

```bash
# 1. Commit e push para main
git add .
git commit -m "suas mudanças"
git push origin main
```

### No servidor (cs.quasarai.co):

```bash
# 2. Conectar via SSH
ssh usuario@cs.quasarai.co

# 3. Ir para o diretório do projeto
cd /caminho/do/projeto/crescer-saudavel

# 4. Executar script de deploy
chmod +x DEPLOY_PRODUCAO.sh
./DEPLOY_PRODUCAO.sh
```

---

## 🔧 Deploy Manual (Passo a Passo)

Se preferir fazer manualmente:

```bash
# No servidor de produção

# 1. Parar containers
docker-compose down

# 2. Atualizar código
git pull origin main

# 3. Rebuild (importante para pegar novas mudanças)
docker-compose build --no-cache

# 4. Subir containers
docker-compose up -d

# 5. Verificar status
docker-compose ps

# 6. Ver logs (se houver problemas)
docker-compose logs -f backend
docker-compose logs -f ml-service
docker-compose logs -f frontend
```

---

## ⚙️ Configurações Necessárias (Primeira Vez)

### 1. **Variáveis de ambiente (`.env`)**

Nenhum segredo fica em arquivo versionado: senha do banco, chave JWT e chave OpenAI
vêm do `.env` na raiz do projeto, lido pelo `docker compose`.

```bash
# No servidor
cd /caminho/do/projeto/crescer-saudavel
cp .env.example .env
chmod 600 .env
nano .env
```

Preencha as variáveis listadas em `.env.example`:

| Variável | Obrigatória | Uso |
|----------|-------------|-----|
| `DATABASE_SERVER` | sim | `host,porta` do SQL Server |
| `DATABASE_NAME` | não (padrão `crescer`) | nome do banco |
| `DATABASE_USER` / `DATABASE_PASSWORD` | sim | credenciais do SQL Server (backend, ml-service e scripts) |
| `JWT_KEY` | sim | chave HS256 dos tokens, mínimo 32 bytes (`openssl rand -base64 48`) |
| `SEED_SUPERADMIN_PASSWORD` | recomendada | senha do SuperAdmin criado no primeiro start |
| `OPENAI_API_KEY` | não | Chat IA (backend e ml-service) |
| `VITE_API_URL` | produção | URL pública da API usada no build do frontend |
| `CORS_ORIGINS` | produção | origens permitidas no ml-service (lista JSON) |

Sem as variáveis obrigatórias o `docker compose` falha antes de subir (`${VAR:?...}`)
e o backend aborta a inicialização com mensagem clara. Credenciais que já foram
expostas precisam ser trocadas: veja `docs/SEGREDOS_ROTACAO.md`.

### 2. **Verificar os compose files**

`docker-compose.yml`, `docker-compose.production.yml` e `docker-compose.prod.yml` já
mapeiam o `.env` para as variáveis que cada serviço lê (`ConnectionStrings__DefaultConnection`,
`Jwt__Key`, `OpenAI__ApiKey`, `DATABASE_*`). Confira o resultado sem subir nada:

```bash
docker compose -f docker-compose.production.yml config
```

---

## 🔍 Verificação Pós-Deploy

### 1. **Verificar containers rodando**

```bash
docker-compose ps
```

**Esperado**: Todos com status `Up`

### 2. **Testar endpoints**

```bash
# Backend
curl http://localhost:5280/api/health
# Esperado: {"ok":true}

# ML Service
curl http://localhost:8000/health
# Esperado: {"status":"healthy","database_connected":true,...}

# Analytics (novo)
curl http://localhost:5280/api/analytics/stats
```

### 3. **Testar no navegador**

- https://cs.quasarai.co
- Fazer login
- Acessar Chat IA
- Testar predições ML

---

## 🐛 Troubleshooting

### Erro: Container não sobe

```bash
# Ver logs detalhados
docker-compose logs backend --tail=100

# Ver logs em tempo real
docker-compose logs -f backend
```

### Erro: ML Service não conecta

```bash
# Verificar se está rodando
docker-compose ps ml-service

# Ver logs
docker-compose logs ml-service --tail=50

# Testar diretamente
docker exec -it <container-id> curl http://localhost:8000/health
```

### Erro: Backend não conecta ao ML Service

```bash
# Verificar network
docker network ls
docker network inspect <network-name>

# Verificar se backend consegue pingar ml-service
docker exec -it <backend-container> ping ml-service
```

### Erro: API Key não configurada

```bash
# Verificar variáveis de ambiente no container
docker-compose config

# Verificar dentro do container
docker exec -it <backend-container> env | grep OpenAI
```

---

## 🔄 Rollback (Se algo der errado)

```bash
# Voltar para versão anterior
git log --oneline -5  # Ver últimos commits
git checkout <commit-anterior>

# Rebuild
docker-compose down
docker-compose up -d --build

# Voltar para main depois
git checkout main
```

---

## 📊 Monitoramento

### Ver uso de recursos

```bash
# CPU e memória de cada container
docker stats

# Ver logs em tempo real de todos os serviços
docker-compose logs -f
```

### Verificar disco

```bash
# Espaço usado pelo Docker
docker system df

# Limpar imagens antigas (liberar espaço)
docker system prune -a
```

---

## 🔐 Segurança

### ⚠️ **NUNCA** commitar secrets!

- ❌ Não commitar `.env`
- ❌ Não commitar `appsettings.Development.json`
- ❌ Não commitar API Keys no código
- ❌ Não colocar valores em `appsettings*.json` nem em `docker-compose*.yml` — eles ficam vazios e leem do `.env`

### ✅ Sempre usar variáveis de ambiente

```bash
# No servidor, criar .env
cp .env.example .env && nano .env
chmod 600 .env  # Permissões restritas
```

---

## 📝 Checklist de Deploy

- [ ] Código commitado e pushed para `main`
- [ ] Conectado ao servidor via SSH
- [ ] `git pull origin main` executado
- [ ] `.env` preenchido com todas as variáveis de `.env.example`
- [ ] `docker-compose down` executado
- [ ] `docker-compose build --no-cache` executado
- [ ] `docker-compose up -d` executado
- [ ] `docker-compose ps` - todos os containers `Up`
- [ ] Backend health: `curl http://localhost:5280/api/health`
- [ ] ML Service health: `curl http://localhost:8000/health`
- [ ] Teste no navegador: https://cs.quasarai.co
- [ ] Chat IA funcionando
- [ ] Predições ML funcionando
- [ ] Logs sem erros críticos

---

## 🆘 Suporte

Se encontrar problemas:

1. **Ver logs**: `docker-compose logs <service> --tail=100`
2. **Reiniciar serviço específico**: `docker-compose restart <service>`
3. **Rebuild completo**: `docker-compose down && docker-compose up -d --build`
4. **Verificar configurações**: `docker-compose config`

---

**Data**: 2025-12-03  
**Autor**: Sistema IA - Crescer Saudável

