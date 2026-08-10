# 📓 Diário de Bordo — Zomp Mobilidade

## 🔗 Links Rápidos de Produção

| App | Link | Descrição |
|-----|------|-----------|
| 🌐 **Site Principal** | [zomp-app.onrender.com](https://zomp-app.onrender.com) | Landing Page institucional |
| 📱 **App Passageiro** | [zomp-passageiro.onrender.com](https://zomp-passageiro.onrender.com) | Solicitar corridas |
| 🚗 **App Motorista** | [zomp-motorista.onrender.com](https://zomp-motorista.onrender.com) | Aceitar corridas e renda passiva |
| 🖥️ **Painel Admin** | [zomp-admin.onrender.com](https://zomp-admin.onrender.com) | Gerenciar plataforma (link privado) |
| ⚡ **API Backend** | [zomp-api.onrender.com/api/health](https://zomp-api.onrender.com/api/health) | Health check da API |

### 🔐 Credenciais de Teste

#### 📱 Passageiro (Cliente)
```
Email: cliente@zomp.com
Senha: teste123
```

#### 🚗 Motorista (Já Aprovado)
```
Email: motorista@zomp.com
Senha: teste123
```

#### 🖥️ Painel Admin
```
Email: leandro2703palmeira@gmail.com
Senha: Lps27031981@
```

### 🏗️ Arquitetura de Deploy (Render)
```
zomp-api         → Node.js (backend/index.js)       — Backend / API REST
zomp-app         → Static SPA (frontend/dist)        — Site Principal (Landing + apps)
zomp-passageiro  → Static Redirect                   — Redireciona para /passageiro
zomp-motorista   → Static Redirect                   — Redireciona para /motorista
zomp-admin       → Static Redirect                   — Redireciona para /admin/login
zomp-db          → PostgreSQL (plano free)            — Banco de dados
```

---

# 📋 Histórico de Versões

Este diário registra a transformação da Zomp em uma plataforma de mobilidade profissional, focada em segurança, automação e experiência de produção real.

---

### 🚀 v10.0.0 - A Era do Onboarding Profissional
*   **Status "Embarcando"**: Motoristas cadastrados entram em modo de espera visual enquanto aguardam análise de documentos.
*   **Slider Premium**: O botão de "Ficar Online" foi substituído por um slider moderno com glassmorphism e animações neon.
*   **Dados de Contato**: Inclusão de Telefone e Chave PIX no perfil para facilitar pagamentos e suporte.
*   **Painel Admin**: Visualização completa de CNH e CRLV dos motoristas com zoom de imagem.

### 🛡️ v11.0.0 - Segurança e Identidade
*   **Selfie Obrigatória (Passageiro)**: Implementado fluxo que exige uma selfie nítida do passageiro antes da primeira corrida. Zero mocks, validação real.
*   **Google Auth**: Integração da interface de login via Google para agilizar a entrada de novos usuários.
*   **Configuração Global de Estreia**: Admin agora define uma única data de lançamento para todos os motoristas (Ex: 30 de Julho).
*   **Salvamento Dinâmico**: O backend agora permite que o administrador falhe todas as regras de negócio em tempo real sem reiniciar o servidor.

### ⚡ v12.0.0 - Produção Real (Uber/99 Style)
*   **Fim dos Mocks**: Todo o fluxo de despacho de corridas agora é real. O app do motorista monitora o servidor e "toca" imediatamente ao receber um pedido.
*   **Trabalho em Segundo Plano**: Implementado Service Worker e API de Notificações. O app notifica o motorista mesmo se o celular estiver bloqueado ou com o app minimizado.
*   **Haptic Feedback**: O celular vibra em padrões específicos ao receber uma nova solicitação.
*   **Gestão de Royalties Automática**: 
    *   Vínculo de 2 anos (24 meses) entre passageiro e motorista indicador.
    *   R$ 0,30 por corrida creditados na hora.
    *   Redirecionamento automático para o Fundo Global após atingir o limite mensal de bônus por passageiro.

### 🎨 v12.1.0 - Refinamento Estético e Clareza
*   **Menu Light (Clean Style)**: Substituímos o fundo preto dos menus (Driver e Admin) por um branco puro com elementos em cinza e verde esmeralda. Isso melhora a leitura sob luz solar e traz um ar mais profissional e moderno.
*   **Remoção de Redundâncias**: O botão "Outros Apps" foi removido para simplificar a navegação e manter o foco total na operação Zomp.
*   **Interface Unificada**: Agora, tanto o app do passageiro quanto o do motorista seguem a mesma linguagem visual de "clareza e alta fidelidade".

### 🚀 v12.2.0 - Central de Comando Administrativa & Produção Financeira
*   **Gestão Financeira Avançada**: Novo dashboard financeiro com cálculo de Lucro Líquido Real (Descontando Impostos, Royalties de R$ 0,30 e Taxa de Servidor de R$ 0,10 por crédito).
*   **Créditos de Produção**: Valor do crédito operacional atualizado para **R$ 1,50**, com sistema de trava e auditoria.
*   **Monitoramento em Tempo Real**: Dashboard Admin agora mostra corridas em andamento e fluxo de pedidos ao vivo.
*   **Visibilidade de Rede**: Admin agora visualiza o número de passageiros vinculados a cada motorista e o motorista vinculado a cada passageiro.
*   **Lightbox Interna**: Verificação de documentos agora abre em modal interno, sem sair do painel, garantindo agilidade.
*   **Fundo Coletivo Automático**: Reforço da lógica de transbordo de royalties para o Fundo Global após a 8ª corrida mensal do passageiro.

### 🚀 v12.2.1 - Autenticidade Total & Gestão de Créditos
*   **Fim das Corridas Mock**: Removida a simulação de aceitação automática no app do passageiro. Agora a plataforma opera 100% com dados reais.
*   **Gestão Manual de Créditos**: Administradores agora podem adicionar créditos manualmente para qualquer motorista diretamente pelo painel.
*   **Sincronização de Produção**: Ajustes finais nos PWAs para garantir que todas as solicitações sejam processadas apenas por motoristas reais.

### 🚀 v12.2.3 - Restauração Premium & Gestão Avançada
*   **Volta do Dark Mode**: Atendendo ao feedback, restauramos o tema "Premium Dark" (Slate/Zinc) para os painéis Admin e Driver, mantendo a clareza e alto contraste.
*   **Gestão Financeira Direta**: Adicionada seção de gestão financeira no modal do motorista, permitindo **Adicionar Créditos** e **Resetar Taxa de Aceitação** manualmente.
*   **Correção de Estatísticas**: Implementado endpoint para correção manual de `ridesMissed` e `ridesAccepted` para garantir que a performance do motorista reflita a realidade operacional.

### 🚀 v12.2.4 - Acesso Facilitado & Estabilidade Mobile
*   **Fix Login Google**: Corrigido o erro visual onde o botão de Login com Google desaparecia em dispositivos móveis. A página agora é rolável, garantindo acesso total aos botões mesmo com o teclado aberto.
*   **Novo Botão de Cadastro**: Adicionado um botão de "Criar Conta de Motorista" destacado na tela inicial, tornando o onboarding de novos parceiros muito mais intuitivo.
*   **Otimização de Layout**: Ajustes finos no CSS do fluxo de autenticação para evitar quebras visuais e garantir uma experiência premium em qualquer tamanho de tela.

### 🚀 v12.2.8 - Correção de Build no Render
*   **Fix Backend Syntax Error**: Resolvido o conflito de variáveis (SyntaxError: Identifier 'token' has already been declared) no endpoint de autenticação do Google, garantindo que o deploy no Render seja concluído com sucesso e o servidor suba normalmente.

### 🔧 v12.3.0 — Correção de Deploy no Render (2026-06-04)
*   **Causa raiz identificada:** `force-db.js` crashava com `ENOTFOUND` ao tentar conectar ao banco antes do Render configurar o DNS. O `pool.connect()` sem `try-catch` matava o processo com `exit code 1`.
*   **Fix force-db.js:** Adicionado `try-catch` completo em torno de `pool.connect()`. Agora o script falha silenciosamente e o servidor suba normalmente.
*   **render.yaml reestruturado:**
    *   `zomp-api` com `rootDir: backend` + `startCommand: node index.js` (sem force-db)
    *   `zomp-app` como Static SPA com SPA rewrite (`/* → /index.html`)
    *   `VITE_API_URL` apontando corretamente para `zomp-api.onrender.com/api`
*   **package-lock.json regenerado:** `@react-oauth/google` ausente no lockfile era causa de falha silenciosa no `vite build`.

### 🔧 v12.4.0 — Sincronização do Repositório, Correção de Banco e Contas de Teste (2026-08-02)
*   **Sincronização com GitHub:** Repositório local atualizado e sincronizado com o commit mais recente (`7f2468b`).
*   **Correção do Host de Banco (DATABASE_URL):**
    *   `backend/.env` corrigido localmente com o host de conexão externa correto (`dpg-d8guds48aovs73efq1a0-a.oregon-postgres.render.com/zomp_f1dk`).
    *   `render.yaml` alterado para injetar a URL estática correta do banco ativo, contornando o erro de banco inativo no Blueprint.
*   **Injeção de Usuários de Teste:** Configurada a inicialização da API (`initDB`) para criar automaticamente uma conta de passageiro (`cliente@zomp.com`) e uma conta de motorista pré-aprovada (`motorista@zomp.com`), ambas com a senha `teste123`.

### 🚀 v12.5.0 — Separação de Serviços no Render e Segurança do Admin (2026-08-02)
*   **Separação visual na Landing Page:** A seção de entrada do site agora exibe **dois cards dedicados** — App Passageiro (azul) e App Motorista (verde) — em vez de um único card genérico. Cada card redireciona para o respectivo aplicativo.
*   **Remoção do link Admin da página pública:** Por segurança, o card e o botão do Painel Administrativo foram **completamente removidos** do site público. O acesso agora é feito apenas por link direto privado (`zomp-admin.onrender.com`).
*   **Serviços separados no Render Dashboard:**
    *   `zomp-passageiro` → Serviço estático dedicado que redireciona para o App do Passageiro.
    *   `zomp-motorista` → Serviço estático dedicado que redireciona para o App do Motorista.
    *   `zomp-admin` → Serviço estático dedicado que redireciona para o Painel Administrativo.
*   **Documentação atualizada:** `CREDENCIAS.md`, `diario_de_bordo.md` e `README.md` sincronizados com os novos links e arquitetura.

### 🚀 v12.6.0 — Garantia de Preço Imbatível, Autocomplete, Correção de Crash e Remoção de Favoritos (2026-08-10)
*   **Correção de Crash Crítico (PRICE_PER_KM):** Resolvido o erro de JavaScript `PRICE_PER_KM is not defined` que crashava o app do passageiro ao carregar a tela de estimativa de preços/seleção de veículo. Os preços por km agora são mapeados dinamicamente das configurações ativas do servidor (`config.pricePerKmCar` / `config.pricePerKmMoto`).
*   **Autocomplete Resiliente com Fallback:** Adicionada uma lista estática de endereços populares do Brasil (`LOCAL_ADDRESS_FALLBACK`) no autocomplete do painel do passageiro. Caso a API pública do Nominatim (OpenStreetMap) falhe por CORS, limites de taxa ou lentidão, o app filtra e exibe sugestões locais válidas e clicáveis imediatamente.
*   **Nova Regra do Preço Imbatível Zomp:**
    *   A caixa de desconto agora aceita a entrada do preço da concorrência e calcula em tempo real o preço Zomp correspondente.
    *   Tabela de desconto dinâmico baseada em distância:
        *   Distância `>= 2.0 km`: **15% de desconto**
        *   Distância `>= 1.8 km`: **12% de desconto**
        *   Distância `>= 1.4 km`: **10% de desconto**
        *   Distância `< 1.4 km`: **5% de desconto** (padrão)
    *   **Limite de 3 Corridas Promocionais:** Implementado controle persistente (`localStorage`) que limita o passageiro a usufruir de até 3 descontos de Preço Imbatível. A contagem é atualizada e exibida na UI em tempo real e decrementada ao solicitar uma corrida.
*   **Remoção de Favoritos:** Removida visualmente toda a funcionalidade de Motoristas Favoritos da interface do passageiro (Widget da tela inicial, seletor de priorização de favoritos nas opções de preços, botão de favoritar na tela de avaliação de corrida, botão de favoritar na tela de aceitação de corrida e a aba de favoritos no menu sanduíche). O estado é mantido em background apenas para prover dados da simulação de motorista a caminho.

---
**Status Atual**: ✅ Deploy atualizado. Correções de crash no passageiro e novo fluxo de Preço Imbatível ativos.
**Versão**: 12.6.0
**Responsável**: Leandro Palmeira + Antigravity AI
