#!/bin/bash
# Carrega o .env da raiz do repositório (não versionado; veja .env.example) e traduz
# as variáveis para os nomes que o ASP.NET Core lê. Alternativas: `dotnet user-secrets`
# ou appsettings.Development.json (ignorado pelo git).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ -f "$ROOT/.env" ]; then
  set -a
  . "$ROOT/.env"
  set +a
fi
if [ -z "$ConnectionStrings__DefaultConnection" ] && [ -n "$DATABASE_SERVER" ]; then
  export ConnectionStrings__DefaultConnection="Server=${DATABASE_SERVER};Database=${DATABASE_NAME:-crescer};User Id=${DATABASE_USER};Password=${DATABASE_PASSWORD};TrustServerCertificate=True;"
fi
[ -z "$Jwt__Key" ] && [ -n "$JWT_KEY" ] && export Jwt__Key="$JWT_KEY"
[ -z "$OpenAI__ApiKey" ] && [ -n "$OPENAI_API_KEY" ] && export OpenAI__ApiKey="$OPENAI_API_KEY"
[ -z "$Seed__SuperAdminPassword" ] && [ -n "$SEED_SUPERADMIN_PASSWORD" ] && export Seed__SuperAdminPassword="$SEED_SUPERADMIN_PASSWORD"

cd "$ROOT/backend/CrescerSaudavel.Api"
dotnet ef database update || dotnet ef migrations add InitialCreate && dotnet ef database update
dotnet run
