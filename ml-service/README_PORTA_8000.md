# ⚠️ PROBLEMA CONHECIDO: Porta 8000 Ocupada

## Sintoma

O ML Service parece estar rodando, mas retorna `404 Not Found` para todos os endpoints (exceto `/health`).

## Causa

O **Cursor/VSCode Code Helper** cria processos que ocupam a porta 8000 e interceptam os requests.

## Como Identificar

```bash
lsof -i:8000
```

Se aparecer algo como:
```
Code\x20H 90683 vitorsantana   46u  IPv4  ...  TCP localhost:irdmi (LISTEN)
```

É o problema!

## Solução Rápida

```bash
# Matar o Code Helper
lsof -ti:8000 | xargs ps -p | grep "Code Helper" | awk '{print $1}' | xargs kill -9

# Verificar se a porta está livre
lsof -i:8000

# Reiniciar o ML Service normalmente
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Solução Automática

Use o script fornecido:

```bash
cd ml-service
./start-ml-service.sh
```

Este script:
1. ✅ Verifica a porta 8000
2. ✅ Mata qualquer Code Helper bloqueando
3. ✅ Inicia o ML Service corretamente

## Como Verificar que Está Funcionando

```bash
# 1. Health Check (deve retornar JSON com status "healthy")
curl http://localhost:8000/health

# 2. Teste de Predição (deve retornar JSON com predição)
curl -X POST http://localhost:8000/api/v1/predictions/growth \
  -H "Content-Type: application/json" \
  -d '{
    "crianca_id":"test-id",
    "dieta_cenario":{
      "taxa_energetica_kcal_kg":110,
      "meta_proteina_g_kg":3,
      "frequencia_horas":3
    },
    "horizonte_dias":14
  }'
```

Se ambos retornarem JSON válido → ✅ Está funcionando!

## Prevenção

1. **Use o script `start-ml-service.sh`** em vez de iniciar manualmente
2. **Feche abas desnecessárias** do Cursor/VSCode
3. **Reinicie o Cursor** se o problema persistir

## Debug Avançado

Se o problema continuar:

```bash
# Ver todos os processos na porta 8000
lsof -i:8000

# Matar TODOS os processos
lsof -ti:8000 | xargs kill -9

# Aguardar
sleep 2

# Iniciar novamente
./start-ml-service.sh
```

## Logs

Verifique os logs do ML Service:

```bash
tail -f /tmp/ml-service.log
```

Deve mostrar:
```
INFO:     Application startup complete.
INFO:     127.0.0.1:XXXXX - "POST /api/v1/predictions/growth HTTP/1.1" 200 OK
```

Se não aparecerem logs de requests, o problema persiste.

