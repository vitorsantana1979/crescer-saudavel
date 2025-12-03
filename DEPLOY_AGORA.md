# 🚀 DEPLOY IMEDIATO - INSTRUÇÕES

## ✅ Pré-requisitos Prontos

- [x] Arquivo `.env` criado no servidor
- [x] Nova OpenAI API Key configurada
- [x] Código commitado no GitHub (main)
- [x] `docker-compose.production.yml` criado
- [x] Script `DEPLOY_PRODUCAO.sh` atualizado

---

## 🎯 EXECUTE NO SERVIDOR AGORA

### 1. Conectar ao Servidor

```bash
ssh seu-usuario@cs.quasarai.co
```

### 2. Ir para o Projeto

```bash
cd /caminho/do/projeto/crescer-saudavel
```

### 3. Verificar se o .env está OK

```bash
cat .env | grep OpenAI
```

**Deve mostrar**:
```
OPENAI_API_KEY=sk-proj-z7BCuAqti...
OpenAI__ApiKey=sk-proj-z7BCuAqti...
```

### 4. Atualizar Código do GitHub

```bash
git pull origin main
```

### 5. Executar Deploy (Automático)

```bash
chmod +x DEPLOY_PRODUCAO.sh
./DEPLOY_PRODUCAO.sh
```

**OU MANUAL** (se preferir controle total):

```bash
# Parar
docker-compose -f docker-compose.production.yml down

# Rebuild
docker-compose -f docker-compose.production.yml build --no-cache

# Subir
docker-compose -f docker-compose.production.yml up -d

# Verificar
docker-compose -f docker-compose.production.yml ps
```

---

## 🔍 Verificação Pós-Deploy

### 1. Containers Rodando

```bash
docker-compose -f docker-compose.production.yml ps
```

**Esperado**: Todos com status `Up`

### 2. Logs dos Serviços

```bash
# Backend
docker-compose -f docker-compose.production.yml logs backend --tail=50

# ML Service
docker-compose -f docker-compose.production.yml logs ml-service --tail=50

# Frontend
docker-compose -f docker-compose.production.yml logs frontend --tail=50
```

### 3. Testar Endpoints

```bash
# Backend Health
curl http://localhost:5280/api/health
# Esperado: {"ok":true}

# ML Service Health
curl http://localhost:8000/health
# Esperado: {"status":"healthy",...}

# Analytics (novo!)
curl http://localhost:5280/api/analytics/stats
```

### 4. Testar no Navegador

1. Acesse: **https://cs.quasarai.co**
2. Faça login
3. Vá em **Menu → Chat IA Clínico**
4. Digite: **"Quero informações da paciente Clara Barbosa"**
5. ✅ Deve buscar dados e responder

---

## 🐛 Se Algo Der Errado

### Container não sobe

```bash
docker-compose -f docker-compose.production.yml logs nome-do-container --tail=100
```

### ML Service não conecta

```bash
# Verificar se está rodando
docker-compose -f docker-compose.production.yml ps ml-service

# Ver logs
docker-compose -f docker-compose.production.yml logs ml-service

# Entrar no container
docker-compose -f docker-compose.production.yml exec ml-service bash
```

### OpenAI API não funciona

```bash
# Verificar variável de ambiente no container
docker-compose -f docker-compose.production.yml exec backend env | grep OpenAI

# Deve mostrar:
# OpenAI__ApiKey=sk-proj-z7BCuAqti...
```

### Rebuild completo (última opção)

```bash
docker-compose -f docker-compose.production.yml down -v
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d
```

---

## 📊 Arquivos Criados/Atualizados

| Arquivo | Descrição |
|---------|-----------|
| `docker-compose.production.yml` | ✅ Configuração para produção |
| `DEPLOY_PRODUCAO.sh` | ✅ Script automatizado |
| `.env` (no servidor) | ✅ Variáveis de ambiente |
| `backend/CONFIGURACAO_SECRETS.md` | 📚 Documentação |
| `docs/DEPLOY_DOCKER_INSTRUCOES.md` | 📚 Guia completo |

---

## ✅ Checklist Final

- [ ] SSH no servidor
- [ ] `cd /projeto`
- [ ] Verificar `.env` existe e tem OpenAI key
- [ ] `git pull origin main`
- [ ] `./DEPLOY_PRODUCAO.sh` (ou manual)
- [ ] Verificar containers: `docker-compose -f docker-compose.production.yml ps`
- [ ] Testar: `curl http://localhost:5280/api/health`
- [ ] Testar: `curl http://localhost:8000/health`
- [ ] Abrir navegador: https://cs.quasarai.co
- [ ] Login → Chat IA → Testar mensagem
- [ ] ✅ SUCESSO!

---

## 🎉 Após Deploy Bem-Sucedido

Seu sistema estará com:
- ✅ Backend C# com todas as APIs IA/ML
- ✅ ML Service Python rodando
- ✅ Chat IA com OpenAI funcionando
- ✅ Predições de crescimento funcionando
- ✅ Análise de alimentos funcionando
- ✅ Dashboard de analytics funcionando

---

**🚀 ESTÁ PRONTO! EXECUTE OS COMANDOS ACIMA NO SERVIDOR!**

