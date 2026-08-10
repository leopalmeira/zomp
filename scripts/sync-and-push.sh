#!/bin/bash

# =============================================================================
# Script: sync-and-push.sh
# Descrição: Automatiza a sincronização do projeto Zomp com o repositório GitHub
#            e atualiza o diário de bordo com as mudanças.
# Uso: ./sync-and-push.sh "Mensagem do commit"
# =============================================================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para exibir mensagens
log() {
    echo -e "${BLUE}[Zomp Sync]${NC} $1"
}

success() {
    echo -e "${GREEN}[Zomp Sync] ✅ $1${NC}"
}

error() {
    echo -e "${RED}[Zomp Sync] ❌ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[Zomp Sync] ⚠️ $1${NC}"
}

# Verifica se está no diretório do projeto
if [ ! -d ".git" ]; then
    error "Não está em um repositório Git. Execute este script a partir da raiz do projeto Zomp."
    exit 1
fi

# Verifica se há um commit message
if [ -z "$1" ]; then
    error "É necessário fornecer uma mensagem para o commit."
    error "Uso: ./sync-and-push.sh \"Mensagem do commit\""
    exit 1
fi

COMMIT_MSG="$1"

# Passo 1: Verificar status do Git
log "Verificando status do Git..."
git status --short > /tmp/git_status.txt 2>&1
if [ $? -ne 0 ]; then
    error "Falha ao verificar status do Git."
    cat /tmp/git_status.txt
    exit 1
fi

# Verificar se há mudanças
if [ -s /tmp/git_status.txt ]; then
    log "Mudanças detectadas:"
    cat /tmp/git_status.txt
else
    warn "Nenhuma mudança detectada. Sincronizando com o repositório remoto..."
    git fetch --all --prune
    if [ $? -ne 0 ]; then
        error "Falha ao buscar atualizações do repositório remoto."
        exit 1
    fi
    
    # Verificar se há atualizações remotas
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{u})
    BASE=$(git merge-base @ @{u})
    
    if [ $LOCAL = $REMOTE ]; then
        success "Repositório já está sincronizado com o remoto."
        exit 0
    elif [ $LOCAL = $BASE ]; then
        warn "Repositório local está atrás do remoto. Atualizando..."
        git pull origin master
        if [ $? -ne 0 ]; then
            error "Falha ao atualizar o repositório local."
            exit 1
        fi
        success "Repositório local atualizado com sucesso."
        exit 0
    else
        warn "Repositório local está à frente do remoto. Fazendo push..."
    fi
fi

# Passo 2: Adicionar todas as mudanças
log "Adicionando todas as mudanças..."
git add -A
if [ $? -ne 0 ]; then
    error "Falha ao adicionar mudanças."
    exit 1
fi

# Passo 3: Commit das mudanças
log "Fazendo commit das mudanças..."
git commit -m "$COMMIT_MSG"
if [ $? -ne 0 ]; then
    error "Falha ao fazer commit."
    exit 1
fi

# Passo 4: Push para o repositório remoto
log "Enviando mudanças para o GitHub..."
git push origin master
if [ $? -ne 0 ]; then
    error "Falha ao enviar mudanças para o GitHub."
    exit 1
fi

# Passo 5: Atualizar diário de bordo (opcional)
read -p "Deseja atualizar o diário de bordo com esta mudança? (s/n): " UPDATE_DIARY
if [ "$UPDATE_DIARY" = "s" ] || [ "$UPDATE_DIARY" = "S" ]; then
    log "Abrindo diário de bordo para edição..."
    
    # Verificar se o nano está disponível
    if command -v nano &> /dev/null; then
        nano diario_de_bordo.md
    elif command -v vim &> /dev/null; then
        vim diario_de_bordo.md
    elif command -v vi &> /dev/null; then
        vi diario_de_bordo.md
    else
        warn "Nenhum editor de texto encontrado. Usando 'cat' para adicionar entrada..."
        echo "" >> diario_de_bordo.md
        echo "### 📅 $(date +'%Y-%m-%d') - $COMMIT_MSG" >> diario_de_bordo.md
        echo "* **Commit:** $(git rev-parse --short HEAD)" >> diario_de_bordo.md
        echo "* **Descrição:** $COMMIT_MSG" >> diario_de_bordo.md
        echo "" >> diario_de_bordo.md
    fi
    
    # Commit e push do diário de bordo
    git add diario_de_bordo.md
    git commit -m "docs: update diario_de_bordo.md with latest changes"
    git push origin master
    
    if [ $? -eq 0 ]; then
        success "Diário de bordo atualizado e enviado para o GitHub."
    else
        error "Falha ao atualizar o diário de bordo."
        exit 1
    fi
fi

# Resumo
success "Sincronização concluída com sucesso!"
echo ""
echo "========================================"
echo "Resumo:"
echo "  - Mensagem do commit: $COMMIT_MSG"
echo "  - Commit: $(git rev-parse --short HEAD)"
echo "  - Status: ✅ Enviado para o GitHub"
echo "========================================"
