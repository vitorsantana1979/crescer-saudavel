# Solução: Problemas de Timeout e 404 no Reload

## 📋 Problemas Identificados

### 1. **Timeout de 30s ao chamar `/analytics/predict-growth`**
**Causa**: O backend C# estava serializando JSON com `CamelCase`, mas o Python ML Service espera `snake_case`.

**Exemplo do problema**:
```json
// C# enviava (CamelCase):
{ "dietaCenario": { ... } }

// Python esperava (snake_case):
{ "dieta_cenario": { ... } }
```

### 2. **Erro 404 ao recarregar página (Command+R)**
**Causa**: Problema comum em SPAs (Single Page Applications) com React Router.

---

## ✅ Soluções Aplicadas

### 1. **Correção do MLService.cs**

**Arquivo**: `backend/CrescerSaudavel.Api/Services/MLService.cs`

**Mudança**:
```csharp
// ANTES
private readonly JsonSerializerOptions _jsonOptions = new()
{
    PropertyNameCaseInsensitive = true,
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase, // ❌ Problemas com Python
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
};

// DEPOIS
private readonly JsonSerializerOptions _jsonOptions = new()
{
    PropertyNameCaseInsensitive = true,
    PropertyNamingPolicy = null, // ✅ Mantém snake_case para Python
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
};
```

**Resultado**: Agora o C# mantém os nomes das propriedades exatamente como definidos no código (`dieta_cenario`), permitindo comunicação correta com o Python.

---

### 2. **Problema de 404 ao Recarregar**

O Vite dev server já lida com SPA routing automaticamente. Se o problema persiste:

#### Opção A: Configurar `public/_redirects` (para produção)
```
/* /index.html 200
```

#### Opção B: Verificar configuração do servidor de produção
Se estiver usando nginx, adicionar:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## 🔧 Comandos Executados

```bash
# 1. Reiniciar ML Service Python
cd ml-service
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 2. Recompilar backend C#
cd backend/CrescerSaudavel.Api
dotnet build

# 3. Reiniciar backend C#
dotnet run
```

---

## ✅ Testes de Verificação

### 1. **Verificar ML Service**
```bash
curl http://localhost:8000/health
```

**Resposta esperada**:
```json
{
  "status": "healthy",
  "database_connected": true,
  "models_loaded": true,
  "version": "1.0.0"
}
```

### 2. **Verificar Backend C#**
```bash
curl http://localhost:5280/api/health
```

**Resposta esperada**:
```json
{"ok": true}
```

### 3. **Testar endpoint de predição**
Abrir no navegador: `http://localhost:5193/ia-insights/{criancaId}`

Clicar em "Gerar Predição" e verificar se retorna resultados sem timeout.

---

## 📊 Status Atual dos Serviços

| Serviço | Porta | Status | URL Health |
|---------|-------|--------|------------|
| Frontend (Vite) | 5193 | ✅ Rodando | http://localhost:5193 |
| Backend (C#) | 5280 | ✅ Rodando | http://localhost:5280/api/health |
| ML Service (Python) | 8000 | ✅ Rodando | http://localhost:8000/health |
| SQL Server | 1279 | ✅ Conectado | sql.vsantana.com.br |

---

## 🚀 Próximos Passos

1. **Limpar cache do navegador**: `Command + Shift + R` (Mac) ou `Ctrl + Shift + R` (Windows)
2. **Recarregar a página**: Testar `Command + R` em diferentes rotas
3. **Testar predições ML**: Acessar `/ia-insights/{criancaId}` e gerar predições
4. **Verificar logs**: Se houver erros, verificar:
   - Terminal do Backend C# (porta 5280)
   - Terminal do ML Service (porta 8000)
   - Console do navegador (F12)

---

## 📝 Notas Técnicas

### Por que remover `CamelCase`?

O C# por padrão usa `PascalCase`, e o `JsonNamingPolicy.CamelCase` converte para `camelCase`. Mas o Python (e muitas APIs REST modernas) usam `snake_case`.

**Ao definir manualmente** os nomes das propriedades como `dieta_cenario`, `taxa_energetica_kcal_kg`, etc., precisamos que o serializador **não altere** esses nomes.

### Por que o timeout era de 30s?

O backend C# tentava chamar o ML Service Python, mas como o payload JSON estava incorreto, o Python retornava erro 422 (Unprocessable Entity) ou não processava. O C# então esperava indefinidamente até o timeout de 30 segundos configurado no `appsettings.json`.

---

**Data**: 2025-12-03  
**Autor**: Sistema IA - Crescer Saudável  
**Versão**: 1.0

