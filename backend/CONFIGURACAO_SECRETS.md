# Configuração de Secrets (API Keys)

## 🔒 Segurança

**NUNCA** commite API keys ou secrets no Git! Elas devem estar apenas em arquivos locais que não são versionados.

---

## 📝 Configuração Local (Desenvolvimento)

### 1. OpenAI API Key

Crie o arquivo `appsettings.Development.json` (que está no `.gitignore`):

```json
{
  "OpenAI": {
    "ApiKey": "sua-chave-aqui",
    "Model": "gpt-4",
    "MaxTokens": 1500
  }
}
```

### 2. Ou use Variáveis de Ambiente

**Linux/Mac**:
```bash
export OpenAI__ApiKey="sua-chave-aqui"
dotnet run
```

**Windows PowerShell**:
```powershell
$env:OpenAI__ApiKey="sua-chave-aqui"
dotnet run
```

**Windows CMD**:
```cmd
set OpenAI__ApiKey=sua-chave-aqui
dotnet run
```

---

## 🚀 Configuração em Produção

### Opção 1: Azure App Service

1. Vá para **Configuration** → **Application Settings**
2. Adicione:
   - Name: `OpenAI:ApiKey`
   - Value: `sua-chave-aqui`

### Opção 2: Docker Compose

```yaml
services:
  backend:
    environment:
      - OpenAI__ApiKey=${OPENAI_API_KEY}
```

Crie arquivo `.env` (não commitado):
```
OPENAI_API_KEY=sua-chave-aqui
```

### Opção 3: Kubernetes Secrets

```bash
kubectl create secret generic openai-secret \
  --from-literal=apiKey='sua-chave-aqui'
```

```yaml
env:
  - name: OpenAI__ApiKey
    valueFrom:
      secretKeyRef:
        name: openai-secret
        key: apiKey
```

---

## 🔑 Obtendo a OpenAI API Key

1. Acesse: https://platform.openai.com/account/api-keys
2. Clique em "Create new secret key"
3. Copie a chave (ela só é mostrada uma vez!)
4. Configure conforme acima

---

## ⚠️ Se você commitou uma secret por engano:

1. **REVOGUE a key imediatamente** no painel da OpenAI
2. Crie uma nova key
3. Limpe o histórico do Git:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/file" \
     --prune-empty --tag-name-filter cat -- --all
   ```
4. Force push (cuidado!):
   ```bash
   git push origin --force --all
   ```

---

## 📊 Status Atual

| Arquivo | Versionado | Contém Secrets |
|---------|------------|----------------|
| `appsettings.json` | ✅ Sim | ❌ Não (vazio) |
| `appsettings.Development.json` | ❌ Não (.gitignore) | ✅ Sim (local) |
| Variáveis de ambiente | ❌ Não | ✅ Sim (runtime) |

---

**Data**: 2025-12-03  
**Autor**: Sistema IA - Crescer Saudável

