# 📓 Diário de Bordo - Evolução Zomp (v10.0.0 a v12.0.0)

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

---
**Status Atual**: Produção Estabilizada. 🏁
**Versão**: 12.2.3
**Responsável**: Antigravity AI
