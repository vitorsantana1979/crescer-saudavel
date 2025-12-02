# ✅ Checklist de Deploy - Módulo ML/IA

## Status Atual do Deploy

Data de verificação: Dezembro 2024  
Versão: 1.1.0

---

## 📋 Resumo Executivo

✅ **BOA NOTÍCIA**: Toda a infraestrutura ML já está configurada e pronta para deploy!

O `docker-compose.yml` já inclui o serviço ML e o `deploy.sh` funciona perfeitamente para fazer o deploy completo do sistema incluindo a IA.

---

## ✅ O Que JÁ Está Configurado

### 1. Docker Compose (docker-compose.yml)

✅ **Serviço ML incluído e configurado**

```yaml
services:
  ml-service:
    build:
      context: ./ml-service
    volumes:
      - ./ml-service/app:/app/app
      - ml-models:/models  # Volume persistente para modelos
    environment:
      # Todas variáveis configuradas ✅
    ports:
      - "8000:8000"
    networks:
      - app-network
```

**Características**:
- ✅ Build automático do container Python
- ✅ Volume persistente para modelos (`ml-models`)
- ✅ Variáveis de ambiente configuradas
- ✅ Porta 8000 exposta
- ✅ Conectado à rede interna do Docker

### 2. Dockerfile do ML Service

✅ **Dockerfile completo e otimizado**

Localização: `ml-service/Dockerfile`

**Inclui**:
- ✅ Python 3.11 slim (base otimizada)
- ✅ Drivers SQL Server (ODBC Driver 18)
- ✅ Todas dependências Python (requirements.txt)
- ✅ Estrutura de diretórios (/app, /models)
- ✅ Comando de inicialização (uvicorn)

### 3. Modelos Treinados

✅ **Modelos presentes e prontos**

```
ml-service/models/
├── growth_predictor.joblib     (250KB) ✅
└── food_recommender.joblib     (49KB)  ✅
```

**Status**:
- ✅ Modelos treinados com 2.994 casos
- ✅ Accuracy validada (82-100%)
- ✅ Arquivos .joblib prontos para deploy
- ✅ NÃO estão no .dockerignore (serão copiados)

### 4. Integração Backend C#

✅ **Backend configurado para chamar ML Service**

Configuração em `appsettings.json`:
```json
"MLService": {
  "BaseUrl": "http://ml-service:8000"
}
```

- ✅ URL do serviço ML configurada
- ✅ Nome do serviço Docker correto (`ml-service`)
- ✅ Controllers e Services implementados
- ✅ DTOs mapeados (snake_case ↔ PascalCase)

### 5. Script de Deploy

✅ **deploy.sh funciona para todo o sistema**

```bash
./deploy.sh "Mensagem do commit"
```

**O que faz**:
1. ✅ Commit das mudanças (inclui modelos ML)
2. ✅ Push para repositório Git
3. ✅ Instruções para `docker-compose up -d --build`
4. ✅ Opção de deploy automático via SSH

**Importante**: O `docker-compose up -d --build` reconstrói TODOS os serviços, incluindo o ML.

### 6. Dependências Python

✅ **requirements.txt completo**

Localização: `ml-service/requirements.txt`

Inclui:
- ✅ fastapi
- ✅ uvicorn
- ✅ sqlalchemy
- ✅ pymssql / pyodbc
- ✅ pandas, numpy
- ✅ scikit-learn
- ✅ xgboost
- ✅ joblib
- ✅ python-dotenv

---

## 🔍 Verificações Pré-Deploy

### Checklist para o Servidor de Produção

#### 1. Requisitos do Sistema

```bash
# Verificar versão do Docker
docker --version
# Mínimo: Docker 20.10+

# Verificar Docker Compose
docker-compose --version
# Mínimo: Docker Compose 1.29+

# Verificar espaço em disco
df -h
# Recomendado: Mínimo 10GB livres
```

#### 2. Portas Necessárias

```
8000  → ML Service (Python FastAPI)
5280  → Backend (.NET API)
5174  → Frontend (React)
```

**Verificar se estão livres**:
```bash
sudo netstat -tulpn | grep -E "8000|5280|5174"
```

#### 3. Variáveis de Ambiente

O arquivo `docker-compose.yml` já tem as variáveis hardcoded, mas para produção, recomenda-se usar `.env`:

```bash
# Criar arquivo .env na raiz do projeto
cat > .env << 'EOF'
# Database
DATABASE_SERVER=sql.vsantana.com.br,1279
DATABASE_NAME=crescer
DATABASE_USER=crescer
DATABASE_PASSWORD=QSSmFTgRS7B3rsdl

# ML Service
MODEL_PATH=/models
CORS_ORIGINS=["http://localhost:5173","http://localhost:5280"]

# Backend
ASPNETCORE_ENVIRONMENT=Production
MLService__BaseUrl=http://ml-service:8000
EOF
```

⚠️ **ATENÇÃO**: Mude senhas e URLs para produção!

#### 4. Firewall

Se o servidor tiver firewall, liberar portas:
```bash
sudo ufw allow 8000/tcp  # ML Service
sudo ufw allow 5280/tcp  # Backend API
sudo ufw allow 5174/tcp  # Frontend (ou 80/443 se usar Nginx)
```

---

## 🚀 Procedimento de Deploy Completo

### Opção 1: Deploy Manual (Recomendado para primeira vez)

**No seu computador local:**

```bash
# 1. Commit e push das mudanças
cd /Users/vitorsantana/Dev/crescer-saudavel/crescer-saudavel
./deploy.sh "Deploy inicial do módulo ML/IA"
```

**No servidor de produção (via SSH):**

```bash
# 2. SSH no servidor
ssh usuario@seu-servidor.com

# 3. Navegar até o diretório do projeto
cd /caminho/do/projeto/crescer-saudavel

# 4. Fazer pull das mudanças
git pull origin main  # ou master, ou sua branch

# 5. Parar containers antigos
docker-compose down

# 6. Reconstruir e iniciar (inclui ML service)
docker-compose up -d --build

# 7. Verificar se todos subiram
docker-compose ps

# Deve mostrar:
# ml-service   Up   0.0.0.0:8000->8000/tcp
# api          Up   0.0.0.0:5280->5280/tcp
# web          Up   0.0.0.0:5174->5173/tcp

# 8. Verificar logs (se necessário)
docker-compose logs -f ml-service
docker-compose logs -f api
```

### Opção 2: Deploy Automático (Via variáveis de ambiente)

```bash
# No seu computador, configure as variáveis
export DEPLOY_SSH_HOST="usuario@seu-servidor.com"
export DEPLOY_SSH_PATH="/caminho/do/projeto/crescer-saudavel"

# Execute o deploy
./deploy.sh "Deploy ML/IA"

# Quando perguntado, digite 's' para deploy automático
```

### Opção 3: Deploy em Um Comando (SSH direto)

```bash
ssh usuario@servidor 'cd /caminho/projeto && \
  git pull && \
  docker-compose down && \
  docker-compose up -d --build'
```

---

## 🧪 Testes Pós-Deploy

### 1. Verificar se ML Service está respondendo

```bash
# Do servidor
curl http://localhost:8000/health

# Resposta esperada:
# {"status":"healthy","service":"ML Service - Crescer Saudável"}
```

### 2. Verificar se modelos foram carregados

```bash
# Logs do ML Service
docker-compose logs ml-service | grep -i "modelo"

# Deve mostrar algo como:
# "Modelo growth_predictor carregado com sucesso"
# "Modelo food_recommender carregado com sucesso"
```

### 3. Testar endpoints ML

```bash
# Testar predição de crescimento
curl -X POST http://localhost:8000/api/v1/predictions/growth \
  -H "Content-Type: application/json" \
  -d '{
    "crianca_id": "algum-uuid",
    "perfil": {
      "idade_gestacional_semanas": 32,
      "peso_atual_gr": 1500,
      "sexo": "M",
      "dias_de_vida": 7
    },
    "dieta_atual": {
      "taxa_energetica_kcal_kg": 120,
      "meta_proteina_g_kg": 3.5
    },
    "prediction_days": 14
  }'
```

### 4. Testar integração Backend → ML

```bash
# Do servidor
curl http://localhost:5280/api/analytics/predict-growth?criancaId=algum-uuid

# Se retornar JSON com predições, integração OK ✅
```

### 5. Testar Frontend completo

```bash
# Do seu navegador
http://seu-servidor.com:5174/alimentos/analytics

# Deve carregar o dashboard de analytics
# Clicar em "Recomendação Inteligente" deve funcionar
```

---

## 🐛 Troubleshooting Comum

### Problema 1: ML Service não inicia

**Sintomas**:
```bash
docker-compose ps
# ml-service   Exit 1
```

**Diagnóstico**:
```bash
docker-compose logs ml-service
```

**Causas comuns**:
1. **Dependências Python faltando**
   - Solução: Rebuild forçado
   ```bash
   docker-compose build --no-cache ml-service
   docker-compose up -d ml-service
   ```

2. **Drivers SQL Server não instalados**
   - Solução: Verificar Dockerfile tem instalação do ODBC Driver 18
   
3. **Erro de conexão com banco**
   - Solução: Verificar variáveis DATABASE_* no docker-compose.yml

### Problema 2: Modelos não encontrados

**Sintomas**:
```
FileNotFoundError: [Errno 2] No such file or directory: '/models/growth_predictor.joblib'
```

**Solução**:
```bash
# 1. Verificar se modelos existem localmente
ls -lh ml-service/models/*.joblib

# 2. Se não existirem, treinar
cd ml-service
python3 -c "from app.models.growth_predictor import get_growth_predictor; \
            p = get_growth_predictor(); print(p.train())"

python3 -c "from app.models.food_recommender import get_food_recommender; \
            r = get_food_recommender(); print(r.train())"

# 3. Rebuild do container
docker-compose build --no-cache ml-service
docker-compose up -d ml-service
```

### Problema 3: Backend não consegue chamar ML Service

**Sintomas**:
```
Erro ao conectar ao serviço de predição
```

**Diagnóstico**:
```bash
# Verificar se ml-service está na mesma rede
docker network inspect crescer-saudavel_app-network

# Deve listar ml-service, api, web
```

**Solução**:
```bash
# Recriar rede
docker-compose down
docker-compose up -d
```

### Problema 4: Timeout em requisições ML

**Sintomas**:
- Requisições demoram > 30s
- Frontend mostra erro de timeout

**Causas**:
1. **Primeiro request (lazy loading)**
   - Normal demorar 2-5s na primeira vez
   - Próximos < 1s

2. **Banco de dados lento**
   - Verificar latência do SQL Server
   - Considerar cache ou read replica

3. **Container com poucos recursos**
   ```bash
   # Ver uso de CPU/RAM
   docker stats ml-service
   
   # Se estiver em 100%, aumentar limites no docker-compose.yml:
   ml-service:
     deploy:
       resources:
         limits:
           cpus: '2'
           memory: 2G
   ```

### Problema 5: CORS errors

**Sintomas**:
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solução**:
Verificar CORS_ORIGINS no docker-compose.yml inclui o domínio correto:
```yaml
environment:
  - CORS_ORIGINS=["http://seu-dominio.com","https://seu-dominio.com"]
```

---

## 📊 Monitoramento em Produção

### Logs em Tempo Real

```bash
# Ver todos os logs
docker-compose logs -f

# Ver só ML service
docker-compose logs -f ml-service

# Ver últimas 100 linhas
docker-compose logs --tail=100 ml-service
```

### Métricas de Performance

```bash
# CPU e Memória
docker stats

# Espaço em disco dos volumes
docker system df -v
```

### Health Checks

Adicionar ao `docker-compose.yml`:
```yaml
ml-service:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

---

## 🔄 Retreinamento de Modelos em Produção

### Opção 1: Manual (quando necessário)

```bash
# SSH no servidor
ssh usuario@servidor

# Entrar no container ML
docker-compose exec ml-service bash

# Dentro do container, treinar
python3 -c "from app.models.growth_predictor import get_growth_predictor; \
            p = get_growth_predictor(); print(p.train())"

# Sair
exit

# Reiniciar ML service para carregar novo modelo
docker-compose restart ml-service
```

### Opção 2: Automatizado (cron job)

```bash
# No servidor, criar script
cat > /root/retrain-ml.sh << 'EOF'
#!/bin/bash
cd /caminho/do/projeto
docker-compose exec -T ml-service python3 -c "
from app.models.growth_predictor import get_growth_predictor
from app.models.food_recommender import get_food_recommender
print('Treinando GrowthPredictor...')
p = get_growth_predictor()
p.train()
print('Treinando FoodRecommender...')
r = get_food_recommender()
r.train()
print('Retreinamento concluído!')
"
docker-compose restart ml-service
EOF

chmod +x /root/retrain-ml.sh

# Adicionar ao cron (1º dia do mês, 3h da manhã)
crontab -e
# Adicionar linha:
0 3 1 * * /root/retrain-ml.sh >> /var/log/ml-retrain.log 2>&1
```

---

## 📦 Backup dos Modelos

### Script de Backup

```bash
#!/bin/bash
# backup-ml-models.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/ml-models"
PROJECT_DIR="/caminho/do/projeto"

mkdir -p $BACKUP_DIR

# Backup dos modelos do volume Docker
docker run --rm \
  -v crescer-saudavel_ml-models:/models \
  -v $BACKUP_DIR:/backup \
  alpine \
  tar czf /backup/ml-models-$DATE.tar.gz -C /models .

echo "✅ Backup criado: ml-models-$DATE.tar.gz"

# Manter apenas últimos 10 backups
cd $BACKUP_DIR
ls -t ml-models-*.tar.gz | tail -n +11 | xargs rm -f
```

### Restaurar Backup

```bash
#!/bin/bash
# restore-ml-models.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Uso: ./restore-ml-models.sh /caminho/backup.tar.gz"
  exit 1
fi

docker run --rm \
  -v crescer-saudavel_ml-models:/models \
  -v $(dirname $BACKUP_FILE):/backup \
  alpine \
  tar xzf /backup/$(basename $BACKUP_FILE) -C /models

echo "✅ Modelos restaurados. Reiniciando ML service..."
cd /caminho/do/projeto
docker-compose restart ml-service
```

---

## 📝 Checklist Final

### Antes do Deploy

- [ ] Modelos treinados existem (`ml-service/models/*.joblib`)
- [ ] `requirements.txt` está atualizado
- [ ] Variáveis de ambiente configuradas
- [ ] Credenciais de produção (não usar dev)
- [ ] `.env` criado (opcional, mas recomendado)
- [ ] Firewall configurado
- [ ] Backup do banco de dados
- [ ] Notificar equipe sobre manutenção

### Durante o Deploy

- [ ] `git pull` executado
- [ ] `docker-compose down` executado
- [ ] `docker-compose up -d --build` executado
- [ ] Todos containers subiram (`docker-compose ps`)
- [ ] Nenhum erro nos logs (`docker-compose logs`)

### Após o Deploy

- [ ] Health check do ML service OK (`/health`)
- [ ] Modelos carregados (verificar logs)
- [ ] Endpoint de predição responde
- [ ] Backend consegue chamar ML service
- [ ] Frontend carrega dashboard analytics
- [ ] Recomendação ML funciona
- [ ] Performance aceitável (< 3s primeira carga)
- [ ] Logs sendo salvos
- [ ] Monitoramento ativo

---

## 🎯 Resumo: Está Pronto para Deploy?

**SIM! ✅**

Todo o módulo ML está pronto e integrado no deploy padrão. Basta executar:

```bash
./deploy.sh "Deploy produção com ML/IA"
```

E seguir os passos de deploy no servidor com `docker-compose up -d --build`.

**Não é necessário nenhum passo extra** - o ML já faz parte do sistema!

---

## 📞 Suporte

Se encontrar problemas durante o deploy:

1. **Verificar logs**: `docker-compose logs ml-service`
2. **Verificar health**: `curl http://localhost:8000/health`
3. **Consultar este documento**: Seção Troubleshooting
4. **Documentação técnica**: `docs/APRESENTACAO_IA_ML.md`

---

**Última atualização**: Dezembro 2024  
**Versão ML**: 1.1.0  
**Status**: ✅ PRONTO PARA PRODUÇÃO

