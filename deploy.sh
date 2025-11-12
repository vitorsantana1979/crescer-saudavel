#!/bin/bash

# Script de Deploy - Crescer Saudável
# Atualiza o repositório Git e prepara para deploy no Docker
#
# Uso:
#   ./deploy.sh                    # Solicita mensagem de commit
#   ./deploy.sh "Mensagem commit"  # Usa mensagem fornecida
#
# Variáveis de ambiente opcionais:
#   DEPLOY_SSH_HOST=usuario@servidor
#   DEPLOY_SSH_PATH=/caminho/do/projeto

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando deploy do Crescer Saudável...${NC}\n"

# Verificar se estamos em um repositório git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Erro: Não é um repositório Git!${NC}"
    exit 1
fi

# Verificar se há mudanças
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Nenhuma mudança para commitar.${NC}"
    read -p "Deseja fazer push mesmo assim? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${YELLOW}Deploy cancelado.${NC}"
        exit 0
    fi
else
    # Mostrar status
    echo -e "${YELLOW}📋 Status das mudanças:${NC}"
    git status --short
    echo

    # Adicionar todos os arquivos
    echo -e "${GREEN}📦 Adicionando arquivos ao Git...${NC}"
    git add .

    # Solicitar mensagem de commit
    if [ -z "$1" ]; then
        echo -e "${YELLOW}💬 Digite a mensagem do commit:${NC}"
        read -r commit_message
    else
        commit_message="$1"
    fi

    # Se não forneceu mensagem, usar padrão
    if [ -z "$commit_message" ]; then
        commit_message="Atualização: $(date '+%Y-%m-%d %H:%M:%S')"
    fi

    # Fazer commit
    echo -e "${GREEN}💾 Fazendo commit...${NC}"
    if ! git commit -m "$commit_message"; then
        echo -e "${RED}❌ Erro ao fazer commit. Verifique as mudanças.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Commit realizado: $commit_message${NC}\n"
fi

# Verificar se há remote configurado
if ! git remote | grep -q .; then
    echo -e "${YELLOW}⚠️  Nenhum remote configurado.${NC}"
    read -p "Deseja configurar um remote agora? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${YELLOW}Digite a URL do repositório remoto:${NC}"
        read -r remote_url
        echo -e "${YELLOW}Digite o nome do remote (padrão: origin):${NC}"
        read -r remote_name
        remote_name=${remote_name:-origin}
        git remote add "$remote_name" "$remote_url"
        echo -e "${GREEN}✅ Remote '$remote_name' adicionado.${NC}\n"
    else
        echo -e "${YELLOW}Deploy cancelado. Configure um remote e tente novamente.${NC}"
        exit 0
    fi
fi

# Detectar branch atual
current_branch=$(git branch --show-current)
echo -e "${GREEN}🌿 Branch atual: $current_branch${NC}"

# Fazer push
echo -e "${GREEN}📤 Fazendo push para o repositório remoto...${NC}"
if git push origin "$current_branch"; then
    echo -e "${GREEN}✅ Push realizado com sucesso!${NC}\n"
else
    echo -e "${RED}❌ Erro ao fazer push. Verifique sua conexão e permissões.${NC}"
    exit 1
fi

# Informações sobre deploy no Docker
echo -e "${GREEN}🐳 Instruções para deploy no servidor Docker:${NC}"
echo -e "${YELLOW}   1. SSH no servidor:${NC}"
echo -e "      ssh usuario@servidor"
echo
echo -e "${YELLOW}   2. Navegue até o diretório do projeto:${NC}"
echo -e "      cd /caminho/do/projeto"
echo
echo -e "${YELLOW}   3. Atualize o código:${NC}"
echo -e "      git pull origin $current_branch"
echo
echo -e "${YELLOW}   4. Reconstrua e reinicie os containers:${NC}"
echo -e "      docker-compose down"
echo -e "      docker-compose up -d --build"
echo
echo -e "${GREEN}   Ou em um único comando:${NC}"
echo -e "${YELLOW}      ssh usuario@servidor 'cd /caminho/do/projeto && git pull && docker-compose down && docker-compose up -d --build'${NC}"
echo

# Opção para executar comandos de deploy automaticamente (se configurado via variáveis de ambiente)
if [ -n "$DEPLOY_SSH_HOST" ] && [ -n "$DEPLOY_SSH_PATH" ]; then
    echo -e "${YELLOW}⚙️  Variáveis de deploy detectadas (DEPLOY_SSH_HOST e DEPLOY_SSH_PATH).${NC}"
    read -p "Deseja executar o deploy automaticamente no servidor? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${GREEN}🔄 Executando deploy no servidor...${NC}"
        ssh "$DEPLOY_SSH_HOST" "cd $DEPLOY_SSH_PATH && git pull origin $current_branch && docker-compose down && docker-compose up -d --build"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Deploy no servidor concluído com sucesso!${NC}"
        else
            echo -e "${RED}❌ Erro ao executar deploy no servidor.${NC}"
        fi
    fi
fi

echo -e "\n${GREEN}✨ Deploy concluído com sucesso!${NC}"

