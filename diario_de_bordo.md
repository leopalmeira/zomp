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

---
**Status Atual**: Produção Refinada. 🚀
**Versão**: 12.1.0
**Responsável**: Antigravity AI
