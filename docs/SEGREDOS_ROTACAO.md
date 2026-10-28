# Rotação de segredos expostos no repositório

**Situação (2026-10-28):** o repositório `vitorsantana1979/crescer-saudavel` é público e, até o
commit que acompanha este documento, arquivos versionados continham credenciais reais. O código
foi alterado para não carregar mais nenhum segredo — tudo vem do ambiente / `.env` (modelo em
`.env.example`). Mas **remover do HEAD não remove do histórico do git nem invalida o que já foi
copiado**: trate todas as credenciais abaixo como comprometidas e rotacione.

Este documento não contém nenhum valor de segredo e não deve passar a conter.

## O que precisa ser rotacionado

| # | Segredo | Onde estava exposto | Ação do operador |
|---|---------|---------------------|------------------|
| 1 | **Chave de assinatura JWT** (`Jwt:Key`) | `appsettings.json`, `appsettings.Production.json` e histórico do git | Gerar nova chave (`openssl rand -base64 48`) e definir `JWT_KEY` no `.env` de cada ambiente. Com a chave antiga pública, qualquer pessoa consegue **forjar tokens válidos** para qualquer usuário — prioridade máxima. Efeito colateral: todos os tokens já emitidos deixam de valer (usuários refazem login). |
| 2 | **Senha do login da aplicação no SQL Server** | `appsettings.json`, `appsettings.Production.json`, `docker-compose.yml`, `ml-service/app/config.py`, `ml-service/README_QUICK_START.md`, `docs/DEPLOY_ML_CHECKLIST.md`, `scripts/seed-1000-pacientes.ts`, `scripts/verificar-dados.ts`, `scripts/verificar-paciente-especifico.ts`, o bytecode versionado `ml-service/app/__pycache__/config.cpython-313.pyc` e histórico | Trocar a senha no SQL Server (`ALTER LOGIN <login> WITH PASSWORD = '<nova>'`), atualizar `DATABASE_PASSWORD` no `.env` de cada ambiente e reiniciar backend e ml-service. Como o servidor é acessível pela internet, vale também restringir o firewall/porta do SQL Server aos IPs dos servidores da aplicação e revisar os logs de login do SQL Server. |
| 2b | Uma **segunda senha de banco** (valor diferente, 12 caracteres) | `INSTRUCOES_PARA_IA_SERVIDOR.md`, `PROMPT_COMPLETO_IA_SERVIDOR.txt`, `PROMPT_PARA_IA_SERVIDOR.txt` (já neutralizados) e histórico | Se ainda for válida em algum login ou ambiente, trocar também. |
| 3 | **Chaves da OpenAI** | Histórico do git (appsettings em commits antigos) e `appsettings.Development.json` local (não versionado) | Revogar todas as chaves do projeto em <https://platform.openai.com/api-keys>, criar uma nova e definir `OPENAI_API_KEY` no `.env`. Conferir o uso/billing por consumo indevido. Atualizar também o `appsettings.Development.json` local (ou migrar para `dotnet user-secrets`). |
| 4 | **Senha padrão do SuperAdmin** (`superadmin@crescersaudavel.com`) | `DatabaseSeeder.cs` e vários docs — é um valor de desenvolvimento, público | Em qualquer banco real, trocar a senha desse usuário agora. Em ambientes novos, definir `SEED_SUPERADMIN_PASSWORD` no `.env` antes do primeiro start (o seeder só usa o padrão quando a variável está vazia, e registra um aviso). |

## Ordem sugerida

1. JWT (item 1) — forjar tokens equivale a acesso total à API.
2. Senha do banco (itens 2 e 2b).
3. Chaves OpenAI (item 3).
4. Senha do SuperAdmin (item 4).
5. Subir com o novo `.env` e validar (seção abaixo).

## Repositório público: o histórico ainda contém os valores

Escolher ao menos uma das opções (a rotação acima é obrigatória de qualquer forma):

- **Tornar o repositório privado** (GitHub → Settings → Danger Zone → Change visibility). É a
  medida mais simples; não apaga o que já foi clonado ou indexado por scanners.
- **Reescrever o histórico** removendo os valores com `git filter-repo` (ou BFG), forçar push de
  todas as branches e tags e pedir ao suporte do GitHub para limpar caches de PRs e forks. Todos os
  clones existentes precisam ser refeitos. Só faz sentido **depois** da rotação, nunca no lugar dela.

  ```bash
  # em um clone novo, com git-filter-repo instalado; o arquivo de expressões fica FORA do repo
  git filter-repo --replace-text /caminho/fora/do/repo/segredos.txt
  git push --force --all
  git push --force --tags
  ```

- Ativar **Secret scanning** e **Push protection** no GitHub (Settings → Code security) para
  bloquear novos vazamentos.

## Verificação depois de rotacionar

- `git grep -n -E 'Password=|sk-[A-Za-z0-9]|"Key"'` no HEAD só retorna placeholders e campos vazios.
- `docker compose -f docker-compose.production.yml config` resolve sem erro com o novo `.env`
  (sem `.env`, falha apontando a variável que falta).
- O backend sobe; sem connection string ou sem `Jwt__Key` ele aborta na inicialização com
  mensagem clara.
- Login funciona e tokens antigos recebem 401.
- `GET /api/chat/status` retorna `configured: true`.

## Higiene adicional (não bloqueia a rotação)

- `frontend/node_modules/`, `server.log` e `backend/CrescerSaudavel.Api/dev-api.log` estão
  versionados apesar do `.gitignore`; remover do índice com `git rm -r --cached` (os
  `__pycache__/` já foram removidos do índice neste commit).
- Os docs de prompt na raiz (`DEPLOY_AGORA.md`, `INSTRUCOES_PARA_IA_SERVIDOR.md`,
  `PROMPT_*_SERVIDOR.txt`) são históricos; considerar removê-los.
