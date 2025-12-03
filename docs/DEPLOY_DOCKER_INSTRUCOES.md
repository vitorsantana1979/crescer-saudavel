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

### 1. **OpenAI API Key**

Crie/edite o arquivo `.env` no servidor:

```bash
# No servidor
cd /caminho/do/projeto/crescer-saudavel
nano .env
```

Adicione:
```env
OpenAI__ApiKey=sua-chave-openai-aqui
OPENAI_API_KEY=sua-chave-openai-aqui
```

### 2. **Verificar docker-compose.yml**

O arquivo `docker-compose.yml` deve conter os 3 serviços:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - OpenAI__ApiKey=${OpenAI__ApiKey}
    ports:
      - "5280:5280"
    depends_on:
      - ml-service

  ml-service:
    build: ./ml-service
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}

  frontend:
    build: ./frontend
    ports:
      - "5193:80"
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

### ✅ Sempre usar variáveis de ambiente

```bash
# No servidor, criar .env
echo "OpenAI__ApiKey=sk-..." > .env
chmod 600 .env  # Permissões restritas
```

---

## 📝 Checklist de Deploy

- [ ] Código commitado e pushed para `main`
- [ ] Conectado ao servidor via SSH
- [ ] `git pull origin main` executado
- [ ] `.env` configurado com API keys
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

