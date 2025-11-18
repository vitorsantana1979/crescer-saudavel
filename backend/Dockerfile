# ---------- Dev (hot reload) ----------
    FROM mcr.microsoft.com/dotnet/sdk:8.0 AS dev
    WORKDIR /src
    
    # Instala/atualiza Git
    RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
    
    # Copia apenas o csproj primeiro (cache do restore)
    COPY CrescerSaudavel.Api/*.csproj ./CrescerSaudavel.Api/
    RUN dotnet restore ./CrescerSaudavel.Api/CrescerSaudavel.Api.csproj
    
    # Copia o restante do código
    COPY . .
    
    # Roda o projeto dentro da pasta do projeto
    WORKDIR /src/CrescerSaudavel.Api
    EXPOSE 5280
    CMD ["dotnet","watch","--no-hot-reload","run","--urls","http://0.0.0.0:5280"]
    
    # ---------- Build de produção ----------
    FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
    WORKDIR /src
    
    # Instala/atualiza Git
    RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
    
    COPY . .
    RUN dotnet publish ./CrescerSaudavel.Api/CrescerSaudavel.Api.csproj -c Release -o /app/publish
    
    # ---------- Runtime ----------
    FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS prod
    WORKDIR /app
    
    # Instala/atualiza Git (se necessário no runtime)
    RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
    
    COPY --from=build /app/publish .
    EXPOSE 5280
    ENV ASPNETCORE_URLS=http://+:5280
    ENTRYPOINT ["dotnet","CrescerSaudavel.Api.dll"]
    