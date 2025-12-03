# 🏷️ Sistema de Versionamento - Crescer Saudável

## Visão Geral

Sistema automático de versionamento que exibe informações da build no footer da aplicação, permitindo verificar qual versão está rodando em produção.

---

## 📦 O Que Foi Implementado

### 1. Script de Geração de Build Info

**Arquivo**: `frontend/scripts/generate-build-info.js`

**O que faz**:
- Lê a versão do `package.json`
- Captura hash do commit Git (7 caracteres)
- Captura branch atual do Git
- Registra timestamp da build
- Gera arquivo TypeScript com essas informações

**Quando executa**:
- Automaticamente antes de cada build de produção (`prebuild`)
- Automaticamente ao iniciar o dev server (`npm run dev`)

### 2. Arquivo Gerado

**Localização**: `frontend/src/generated/build-info.ts`

**Conteúdo** (gerado automaticamente):
```typescript
// Arquivo gerado automaticamente - NÃO EDITAR MANUALMENTE
// Gerado em: 2025-12-02T00:44:08.797Z

export const BUILD_INFO = {
  "version": "1.1.0",
  "gitCommit": "22a2806",
  "gitBranch": "main",
  "buildDate": "2025-12-02T00:44:08.797Z",
  "environment": "development"
} as const;
```

⚠️ **Este arquivo NÃO deve ser commitado** (está no `.gitignore`)

### 3. Footer com Informações de Versão

**Arquivo**: `frontend/src/components/Layout.tsx`

**Exibição**:
```
┌──────────────────────────────────────────────────┐
│  © 2024 Crescer Saudável  |  v1.1.0 (22a2806)   │
│                            |  Documentação   →   │
└──────────────────────────────────────────────────┘
```

**Recursos**:
- ✅ Exibe versão + hash do commit
- ✅ Clique na versão mostra card com detalhes completos
- ✅ Botão para copiar versão para área de transferência
- ✅ Indicador visual do ambiente (production/development)

### 4. Card de Detalhes (ao clicar na versão)

```
┌─────────────────────────────────────┐
│  Informações da Build            ✕  │
├─────────────────────────────────────┤
│  Versão:      1.1.0                 │
│  Commit:      22a2806               │
│  Branch:      main                  │
│  Build:       02/12/2024 às 00:44   │
│  Ambiente:    development           │
├─────────────────────────────────────┤
│  📋 Copiar versão                   │
└─────────────────────────────────────┘
```

---

## 🚀 Como Usar

### Durante Desenvolvimento

```bash
cd frontend

# Iniciar dev server (gera build info automaticamente)
npm run dev
```

O footer mostrará a versão atual com o commit do seu workspace local.

### Para Build de Produção

```bash
cd frontend

# Build de produção (gera build info automaticamente antes)
npm run build
```

O arquivo de build info será gerado antes do build do Vite.

### Deploy no Servidor

Quando você faz deploy com `./deploy.sh`:

1. Commit é feito com suas mudanças
2. Push para o repositório
3. No servidor, ao fazer `docker-compose up -d --build`:
   - Frontend executa `npm run build`
   - Script `generate-build-info.js` é executado automaticamente
   - **Captura o commit do servidor** (não o local!)
   - Build é gerado com informações corretas

**Resultado**: O footer mostrará a versão exata que está rodando no servidor.

---

## 🔍 Verificando Versões

### No Navegador (Qualquer Ambiente)

1. Acesse a aplicação
2. Role até o final da página
3. Veja no footer: `v1.1.0 (22a2806)`
4. **Clique na versão** para ver detalhes completos

### Comparando Local vs Servidor

**No seu computador**:
```bash
cd /Users/vitorsantana/Dev/crescer-saudavel/crescer-saudavel
git log --oneline -1
# 22a2806 Sua mensagem de commit
```

**No navegador** (servidor):
- Footer mostra: `v1.1.0 (22a2806)`

**Se forem iguais**: ✅ Servidor está atualizado  
**Se forem diferentes**: ⚠️ Servidor precisa de deploy

---

## 📋 Checklist de Verificação

### Antes do Deploy

- [ ] Versão no `package.json` está correta
- [ ] Commit local está limpo (`git status`)
- [ ] Executar `npm run dev` para testar localmente

### Após Deploy no Servidor

- [ ] Acessar aplicação no navegador
- [ ] Verificar versão no footer
- [ ] Clicar na versão e verificar:
  - [ ] Hash do commit correto
  - [ ] Branch correta (main/master)
  - [ ] Data/hora do build recente
  - [ ] Ambiente: `production`

### Se Versão Estiver Errada

```bash
# No servidor
ssh usuario@servidor
cd /caminho/projeto

# Verificar commit atual
git log --oneline -1

# Se necessário, pull novamente
git pull origin main

# Rebuild forçado
docker-compose down
docker-compose build --no-cache web
docker-compose up -d

# Verificar build info foi gerado
docker-compose exec web cat /app/src/generated/build-info.ts
```

---

## 🔧 Troubleshooting

### Problema 1: Footer não mostra versão

**Sintoma**: Footer aparece vazio ou sem versão

**Causa**: Arquivo `build-info.ts` não foi gerado

**Solução**:
```bash
cd frontend
node scripts/generate-build-info.js
npm run dev
```

### Problema 2: Versão está "unknown"

**Sintoma**: Footer mostra `v1.1.0 (unknown)`

**Causa**: Script não conseguiu acessar Git

**Solução**:
```bash
# Verificar se está em repositório Git
git status

# Se não estiver, inicializar
git init

# Regenerar build info
cd frontend
node scripts/generate-build-info.js
```

### Problema 3: Commit está desatualizado no servidor

**Sintoma**: Footer mostra commit antigo mesmo após deploy

**Causa**: Cache do Docker ou build não foi executado

**Solução**:
```bash
# No servidor, rebuild sem cache
docker-compose down
docker-compose build --no-cache web
docker-compose up -d

# Força navegador a recarregar (Ctrl+Shift+R ou Cmd+Shift+R)
```

### Problema 4: Card de detalhes não abre

**Sintoma**: Clicar na versão não mostra o card

**Causa**: JavaScript não carregou ou erro no console

**Solução**:
1. Abrir DevTools (F12)
2. Ver erros no console
3. Verificar se `build-info.ts` foi importado
4. Recarregar página forçadamente

---

## 🎨 Personalização

### Mudar Posição do Footer

Editar `frontend/src/components/Layout.tsx`:

```tsx
// Mover para topo
<header className="...">
  <VersionInfo />
</header>

// Ou sidebar
<aside className="...">
  <VersionInfo />
</aside>
```

### Mudar Formato de Exibição

No componente `VersionInfo`:

```tsx
// Mostrar só versão (sem commit)
<span>v{buildInfo.version}</span>

// Mostrar tudo inline
<span>
  v{buildInfo.version} • {buildInfo.gitCommit} • {buildInfo.gitBranch}
</span>

// Mostrar só em hover
<span title={`v${buildInfo.version} (${buildInfo.gitCommit})`}>
  ℹ️
</span>
```

### Adicionar Mais Informações

No script `generate-build-info.js`, adicionar:

```javascript
const buildInfo = {
  // ... existentes
  buildNumber: process.env.BUILD_NUMBER || '0',
  deployer: process.env.USER || 'unknown',
  nodeVersion: process.version,
};
```

---

## 📊 Informações Técnicas

### Estrutura de Arquivos

```
crescer-saudavel/
├── frontend/
│   ├── scripts/
│   │   └── generate-build-info.js  ← Script gerador
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.tsx          ← Footer com versão
│   │   └── generated/              ← Gerado automaticamente
│   │       └── build-info.ts       ← NÃO commitar!
│   ├── package.json                ← Scripts configurados
│   └── .gitignore                  ← Ignora /generated
└── .gitignore                      ← Ignora frontend/src/generated/
```

### Fluxo de Geração

```
┌─────────────────────────────────────────────────────┐
│  1. npm run dev  OU  npm run build                  │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│  2. Script: generate-build-info.js                  │
│     - Lê package.json                               │
│     - Executa: git rev-parse --short HEAD           │
│     - Executa: git rev-parse --abbrev-ref HEAD      │
│     - Captura timestamp                             │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│  3. Gera: src/generated/build-info.ts               │
│     export const BUILD_INFO = { ... }               │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│  4. Vite compila aplicação                          │
│     - Importa build-info.ts                         │
│     - Inclui no bundle final                        │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│  5. Layout.tsx renderiza footer                     │
│     - Exibe: v1.1.0 (22a2806)                       │
│     - Card detalhado ao clicar                      │
└─────────────────────────────────────────────────────┘
```

### Versionamento Semântico

O sistema usa **Semantic Versioning (SemVer)**:

```
v1.1.0
│ │ │
│ │ └─ PATCH: Bug fixes, pequenas correções
│ └─── MINOR: Novas features, não quebra compatibilidade
└───── MAJOR: Mudanças que quebram compatibilidade
```

**Quando incrementar**:
- **MAJOR (1.x.x → 2.0.0)**: Mudanças de API, remoção de features
- **MINOR (1.0.x → 1.1.0)**: Novo módulo (ex: IA/ML adicionado)
- **PATCH (1.1.0 → 1.1.1)**: Bug fixes, pequenas melhorias

**Como atualizar**:
```bash
cd frontend

# Editar package.json manualmente
"version": "1.2.0",

# Ou usar npm
npm version patch  # 1.1.0 → 1.1.1
npm version minor  # 1.1.0 → 1.2.0
npm version major  # 1.1.0 → 2.0.0
```

---

## 🎯 Casos de Uso

### Caso 1: Validar Deploy em Produção

**Situação**: Acabou de fazer deploy e quer confirmar que atualizou.

**Passo a passo**:
1. Note o commit antes do deploy:
   ```bash
   git log --oneline -1
   # 22a2806 Deploy módulo IA
   ```

2. Faça o deploy:
   ```bash
   ./deploy.sh "Deploy módulo IA"
   ```

3. Acesse o site em produção

4. Veja o footer: `v1.1.0 (22a2806)`

5. ✅ Confirmado! Versão correta no ar.

---

### Caso 2: Reportar Bug com Versão Correta

**Situação**: Usuário encontrou um bug e você precisa saber a versão exata.

**Instruções para o usuário**:
1. Role até o final da página
2. Clique na versão no footer
3. Tire um print do card de detalhes
4. Envie junto com o relato do bug

**Você receberá**:
- Versão: 1.1.0
- Commit: 22a2806
- Branch: main
- Data: 02/12/2024
- Ambiente: production

**Benefício**: Consegue reproduzir o bug na versão exata.

---

### Caso 3: Rollback para Versão Anterior

**Situação**: Deploy novo tem problemas, precisa voltar.

**Passo a passo**:
1. Ver versão atual com problema:
   ```
   Footer mostra: v1.2.0 (abc1234)
   ```

2. No servidor, voltar ao commit anterior:
   ```bash
   ssh usuario@servidor
   cd /caminho/projeto
   
   # Ver histórico
   git log --oneline -5
   
   # Voltar ao commit anterior (que funcionava)
   git checkout 22a2806
   
   # Rebuild
   docker-compose down
   docker-compose up -d --build
   ```

3. Verificar no navegador:
   ```
   Footer mostra: v1.1.0 (22a2806) ✅
   ```

---

## 📚 Referências

- **Semantic Versioning**: https://semver.org/
- **Git Short Hash**: `git rev-parse --short HEAD`
- **Git Branch**: `git rev-parse --abbrev-ref HEAD`

---

## ✅ Checklist de Implementação

- [x] Script de geração criado
- [x] Scripts do package.json configurados
- [x] Footer adicionado ao Layout
- [x] Componente VersionInfo implementado
- [x] Card de detalhes com todas informações
- [x] Botão para copiar versão
- [x] Arquivo gerado adicionado ao .gitignore
- [x] Versão atualizada para 1.1.0 (módulo IA)
- [x] Documentação completa criada
- [x] Testado em desenvolvimento

---

**Última atualização**: Dezembro 2024  
**Versão do sistema**: 1.1.0  
**Status**: ✅ IMPLEMENTADO E FUNCIONANDO

