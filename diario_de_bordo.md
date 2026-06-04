# 📓 Diário de Bordo — Zomp Mobilidade

## 🔗 Links Rápidos de Produção

| App | Link | Descrição |
|-----|------|-----------|
| 🌐 **Landing Page** | [zomp-app.onrender.com](https://zomp-app.onrender.com) | Site institucional |
| 📱 **App Passageiro** | [zomp-app.onrender.com/passageiro](https://zomp-app.onrender.com/passageiro) | Solicitar corridas |
| 🚗 **App Motorista** | [zomp-app.onrender.com/motorista](https://zomp-app.onrender.com/motorista) | Aceitar corridas |
| 🖥️ **Painel Admin** | [zomp-app.onrender.com/admin/login](https://zomp-app.onrender.com/admin/login) | Painel de controle |
| ⚡ **API Backend** | [zomp-api.onrender.com/api/health](https://zomp-api.onrender.com/api/health) | Health check |

### 🔐 Credenciais Admin
```
Email: leandro2703palmeira@gmail.com
Senha: Lps27031981@
```

### 🏗️ Arquitetura de Deploy (Render)
```
zomp-api  → Node.js (backend/index.js) — rootDir: backend
zomp-app  → Static SPA (frontend/dist) — rootDir: frontend
zomp-db   → PostgreSQL (plano free)
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
*   **Salvamento Dinâmico**: O backend agora permite que o administrador altere todas as regras de negócio em tempo real sem reiniciar o servidor.

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
*   **Fix force-db.js:** Adicionado `try-catch` completo em torno de `pool.connect()`. Agora o script falha silenciosamente e o servidor sobe normalmente.
*   **render.yaml reestruturado:**
    *   `zomp-api` com `rootDir: backend` + `startCommand: node index.js` (sem force-db)
    *   `zomp-app` como Static SPA com SPA rewrite (`/* → /index.html`)
    *   `VITE_API_URL` apontando corretamente para `zomp-api.onrender.com/api`
*   **package-lock.json regenerado:** `@react-oauth/google` ausente no lockfile era causa de falha silenciosa no `vite build`.

---
**Status Atual**: ✅ Deploy estável. API + SPA operacionais.
**Versão**: 12.3.0
**Responsável**: Leandro Palmeira + Antigravity AI

