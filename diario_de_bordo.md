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

### 🚀 v12.6.0 — Garantia de Preço Imbatível, Autocomplete, Correção de Crashes e Restauração da Tela do Motorista (2026-08-10)
*   **Correção de Crash Crítico (PRICE_PER_KM):** Resolvido o erro de JavaScript `PRICE_PER_KM is not defined` que crashava o app do passageiro ao carregar a tela de estimativa de preços/seleção de veículo. Os preços por km agora são mapeados dinamicamente das configurações ativas do servidor (`config.pricePerKmCar` / `config.pricePerKmMoto`).
*   **Correção de Crashes Adicionais por Variáveis Indefinidas (Passenger):**
    *   Declarados os estados `manualPriceInput` e `manualPriceError` via `useState` para sanar o ReferenceError ao abrir a caixa de "Preço Imbatível".
    *   Declarados os estados `profileData` e `setProfileData` para sanar o crash ao abrir o menu "Meu Perfil".
    *   Declarados os estados `chatInput` e `setChatInput` para sanar o crash ao interagir com o chat de mensagens do motorista.
*   **Restauração Total da Interface do Motorista:**
    *   Recuperado o arquivo [Driver.css](file:///c:/Users/User/Desktop/zomp-master/frontend/src/pages/Driver.css) para a versão íntegra de 802 linhas. Isso resolveu o problema do mapa preto invisível, do layout quebrado do slider de online e reestabeleceu o design escuro e neon da dashboard do motorista.
*   **Correção de Crash na Carteira do Motorista (wallet.balance):**
    *   Sanado o erro `wallet.balance?.toFixed is not a function` fazendo o cast seguro para `Number(wallet.balance || 0)` em todos os renders e lógicas de botões. Isso previne crashes no React caso a API de carteira retorne o saldo em formato string.
*   **Créditos de Teste Exclusivos (1000 Créditos):**
    *   Ajustada a lógica em [DriverDashboard.jsx](file:///c:/Users/User/Desktop/zomp-master/frontend/src/pages/DriverDashboard.jsx) para interceptar o email do usuário e forçar automaticamente `1000` créditos em tela apenas para a conta de teste oficial `motorista@zomp.com`, permitindo ficar online e aceitar corridas sem impedimentos de recarga. Qualquer outro email cadastrado continuará utilizando o saldo de créditos real comprado por PIX.
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
**Status Atual**: ✅ Deploy atualizado. Correções de crashes e restauração visual da tela de motorista ativas.
**Versão**: 12.6.0
**Responsável**: Leandro Palmeira + Antigravity AI

---
### 📅 v12.6.1 - Sincronização e Limpeza de Repositório (2025-08-10)
* **Sincronização Forçada com GitHub**: Projeto local resetado para `origin/master` (commit `aeff11d`) e alinhado com o repositório remoto.
* **Remoção de Arquivo Corrompido**: O arquivo `frontend/diariodebordo.md` (10.7 KB) foi removido devido a encoding corrompido (UTF-8 mal interpretado).
* **Commit de Limpeza**: Adicionado commit `28c8e68` para registrar a remoção do arquivo corrompido e garantir consistência do repositório.
* **Verificação de Arquivos Críticos**: Todos os arquivos essenciais (`Driver.css`, `PassengerDashboard.jsx`, `backend/index.js`, `render.yaml`) estão intactos e presentes.

---
**Status Atual**: ✅ Repositório local e remoto sincronizados. Arquivo corrompido removido.
**Versão**: 12.6.1
**Responsável**: Vibe Code (Mistral AI) + Leandro Palmeira
**Último Commit**: [28c8e68](https://github.com/leopalmeira/zomp/commit/28c8e68e30897f2cefe480bb2f0878884b7c96ed)

### 📅 v12.6.2 - Correção de Bug Crítico no Slide do Motorista (2025-08-10)
* **Bug Identificado**: Erro `toFixed is not a function` ao deslizar o slide para ficar online no app do motorista.
* **Causa Raiz**: A variável `credits` (vinda da API ou do `localStorage`) era uma **string**, e o React tentava chamar `.toFixed()` diretamente nela.
* **Solução Aplicada**: Adicionado `Number(credits || 0)` em **todos os lugares** onde `credits` era exibido ou usado em cálculos:
  - Linha 421: Meta-tag de créditos no card de solicitação.
  - Linha 475: Exibição de créditos disponíveis no slide.
  - Linha 484: Exibição de créditos restantes no modo online.
  - Linha 537: Badge de créditos no menu lateral.
  - Linha 694: Exibição principal de créditos na tela de compras.
  - Linha 701: Condicional `credits <= 3` para alerta de créditos baixos.
* **Teste**: O slide agora funciona corretamente, e o motorista pode ficar online para receber pedidos.

---
**Status Atual**: ✅ Bug corrigido. Motorista pode ficar online sem erros.
**Versão**: 12.6.2
**Responsável**: Vibe Code (Mistral AI)
**Último Commit**: [3659c68](https://github.com/leopalmeira/zomp/commit/3659c68)

### 📅 v12.6.3 - Adição de Conta de Teste motorita@zomp.com (2025-08-10)
* **Nova Conta de Teste**: Adicionado suporte para o email **`motorita@zomp.com`** como conta de teste do motorista.
* **Créditos Automáticos**: A conta `motorita@zomp.com` agora recebe **1000 créditos automaticamente** (assim como `motorista@zomp.com`).
* **Liberação para Ficar Online**: Ambas as contas de teste (`motorista@zomp.com` e `motorita@zomp.com`) agora:
  - **Pulam a verificação de `cnh` e `crlv`** (documentos).
  - **Pulam a verificação de `isApproved`** (aprovação).
  - **Podem deslizar o slide para ficar online** sem restrições.
* **Correções Aplicadas**:
  - Linha 95: `handleSlideStart` agora reconhece `motorita@zomp.com` como conta de teste.
  - Linha 115: `handleSlideEnd` agora reconhece `motorita@zomp.com` como conta de teste.
  - Linha 144: `fetchCredits` agora garante 1000 créditos para `motorita@zomp.com`.
  - Linhas 473 e 475: Exibição de créditos e status agora ignoram `motorita@zomp.com` nas verificações de documentos.

---
**Status Atual**: ✅ Conta `motorita@zomp.com` pode ficar online e receber pedidos.
**Versão**: 12.6.3
**Responsável**: Vibe Code (Mistral AI)
**Último Commit**: [32af148](https://github.com/leopalmeira/zomp/commit/32af148)

### 📅 v12.6.4 - Substituição do Slide por Botão e Modal de Recarga (2025-08-10)
* **Slide Removido**: O slide para ficar online foi **substituído por um botão simples** "Ficar Online".
* **Exibição de Créditos Removida**: Todas as exibições de `credits` na UI principal foram removidas (exceto no menu de compras).
* **Modal de Recarga Adicionado**:
  - Quando um motorista **não de teste** (ou seja, não é `motorista@zomp.com` ou `motorita@zomp.com`) **tentar ficar online sem créditos** (`credits <= 0`), um **modal de recarga** aparece.
  - O modal oferece **3 opções de pacotes de créditos**:
    - 10 Créditos (R$ 15,00)
    - 22 Créditos (R$ 30,00)
    - 35 Créditos (R$ 45,00)
  - Cada botão redireciona para o **PIX** correspondente.
* **Contas de Teste**:
  - `motorista@zomp.com` e `motorita@zomp.com` **não veem o modal de recarga** (têm 1000 créditos automaticamente).
  - Podem **ficar online sem restrições**.

---
**Status Atual**: ✅ Slide substituído por botão. Modal de recarga adicionado. Contas de teste funcionando.
**Versão**: 12.6.4
**Responsável**: Vibe Code (Mistral AI)
**Último Commit**: [4f7dd83](https://github.com/leopalmeira/zomp/commit/4f7dd83)

### 📅 v12.6.5 - Correções para Deploy no Render (2025-08-10)
* **Problema Identificado**: Os serviços `zomp-web` (backend) e `zomp-app` (frontend) falharam no deploy no Render.
* **Causas e Soluções**:
  
  **1. Backend (`zomp-web` / `zomp-api`):**
  - **Problema**: O `backend/index.js` tentava servir arquivos estáticos do frontend (`public`), mas o frontend é um serviço separado no Render.
  - **Solução**: Removido todo o código relacionado a `express.static` e `fs.existsSync` do `index.js`. Agora o backend **apenas serve a API** sem tentativas de servir frontend.
  - **Arquivo Modificado**: `backend/index.js` (linhas removidas: 15-20).
  
  **2. Frontend (`zomp-app`):**
  - **Problema**: O `frontend/package.json` usava versões **muito recentes** (`react@19.2.4`, `vite@6.0.0`), que podem não ser compatíveis com o ambiente do Render.
  - **Solução**: Downgrade das dependências para versões estáveis:
    - `react` e `react-dom`: **18.3.1** (antes: 19.2.4)
    - `vite`: **5.4.10** (antes: 6.0.0)
    - `@vitejs/plugin-react`: **4.3.3** (antes: 5.0.0)
    - `lucide-react`: **0.413.0** (antes: 1.8.0)
    - `react-router-dom`: **6.28.0** (antes: 7.14.1)
  - **Arquivo Modificado**: `frontend/package.json`.
  
  **3. `render.yaml`:**
  - **Verificação**: O arquivo já estava correto, com:
    - `zomp-api`: `rootDir: backend`, `startCommand: node index.js`
    - `zomp-app`: `rootDir: frontend`, `buildCommand: npm install && npm run build`
    - `staticPublishPath: dist` para o frontend.
  - **Nenhuma mudança necessária**.

* **Testes Recomendados**:
  - **Backend**: `cd backend && npm install && node index.js` (deve iniciar sem erros).
  - **Frontend**: `cd frontend && npm install && npm run build` (deve buildar sem erros).

---
**Status Atual**: ✅ Correções aplicadas para compatibilidade com o Render.
**Versão**: 12.6.5
**Responsável**: Vibe Code (Mistral AI)
**Últimos Commits**:
- [e23d53b](https://github.com/leopalmeira/zomp/commit/e23d53b) (Downgrade do frontend/package.json)
- [40a59f8](https://github.com/leopalmeira/zomp/commit/40a59f8) (Remoção do static serving do backend)

---

### 🚀 v13.0.0 - Preço Imbatível Dinâmico, IA de Print, Royalties e Melhorias no Motorista (2026-08-17)

* 🔥 **Preço Imbatível com Desconto Direto no Print da Uber/99**:
  - Validação inteligente do print no backend (`POST /api/rides/validate-screenshot`) com limite estrito de **3 descontos por dia** por passageiro (tabela `DiscountLog`).
  - O desconto é **subtraído diretamente sobre o valor do print do cliente**:
    - Print de **R$ 12,00 a R$ 14,00** ➔ **- R$ 2,00 de desconto**
    - Print de **R$ 18,00 a R$ 25,00** ➔ **- R$ 2,50 de desconto**
    - Print **acima de R$ 30,00** ➔ **- R$ 3,00 de desconto**
    - Demais valores (> R$ 12,00) ➔ **- R$ 2,00 de desconto**
  - Campo transparente de conferência/ajuste do valor lido do print com recálculo automático.
  - Botão de chamada rápida: `⚡ CHAMAR ZOMP POR R$ XX,XX — MAIS BARATO!`.
  - **Uso Ilimitado para Conta de Testes**: A conta de passageiro de testes (`cliente@zomp.com`) possui uso **ilimitado** do Preço Imbatível, sem ser bloqueada pelo limite de 3 diários.

* 📍 **Inserção Rápida de Endereço & Sugestão Precisa de GPS na Partida**:
  - Ao focar ou digitar no campo de **Partida**, surge imediatamente no topo a opção destacada em verde: **📍 "Usar Localização Atual (GPS)"** com o endereço real exato do aparelho obtido via geocodificação reversa.
  - A busca de ruas e bairros passa a ser **ancorada nas coordenadas GPS reais do passageiro**, trazendo os resultados mais próximos com altíssima precisão.
  - Suporte completo para **pressionar Enter** ou clicar no botão **"🚖 VER PREÇOS & PEDIR CARRO"** sem obrigar clique na lista.
  - Preenchimento automático da partida com GPS quando em branco.

* 🔗 **QR Code de Indicação & Royalties de R$ 0,30 por Corrida**:
  - QR Code do motorista gera URL completa: `zomp.app/passageiro/cadastro?ref=CODIGO`.
  - Passageiro é vinculado por **2 anos** ao motorista parceiro.
  - A cada corrida concluída pelo passageiro, **R$ 0,30 de royalties** são creditados na carteira do motorista indicador.

* 🛣️ **Corridas Longas / Agendadas & Temporizador Regressivo de 10s**:
  - Corridas longas (≥ 15km) ou agendadas tocam **som suave e grave apenas 1 vez** e aparecem **no máximo 1 vez** por motorista.
  - Temporizador regressivo de **10 segundos** no card do motorista com barra de progresso e auto-recusa.

* 🌦️ **Clima & Condições de Tempo em Tempo Real (API Gratuita Open-Meteo)**:
  - No topo do app do motorista surge um widget translúcido (*Glassmorphism*) exibindo temperatura (°C), condição climática (☀️ Ensolarado, ⛅ Nublado, 🌧️ Chuvoso, ⛈️ Tempestade) e velocidade do vento em tempo real.

* 🚦 **Status do Trânsito na Região**:
  - Indicador dinâmico de fluxo (🟢 Fluindo / 🟡 Moderado / 🔴 Intenso em horários de pico) para orientar o motorista sobre a dinâmica viária da área.

* 🎯 **Sonar de Radar & Seletor de Raio de Atuação**:
  - Quando online, um **círculo de sonar verde pulsante** é renderizado no mapa em volta da posição GPS do motorista.
  - O motorista pode tocar no botão do raio ou acessar o menu lateral para escolher seu raio de atuação (`3 km`, `5 km`, `10 km`, `15 km`, `20 km`, `30 km`, `50 km` ou `Sem Limite / Livre`).
  - O motorista pode **ocultar ou reexibir o widget de clima/trânsito** a qualquer momento pelo menu lateral (*Preferências & Mapa*).

* 🛑 **Encerramento no Meio do Caminho & Cobrança Acumulada na Próxima Corrida**:
  - Se a corrida for encerrada/cancelada durante o percurso, o sistema calcula o **valor percentual proporcional** baseado no KM percorrido em relação ao total.
  - **Aviso e Discriminativo Transparente de Valores**:
    - Ao abrir a tela de preços (`PRICED`), se houver débito anterior (`pendingDebt`), o passageiro visualiza um card detalhado em destaque:
      - 🚗 **Tarifa da Nova Corrida**: R$ YY,YY
      - ⏱️ **Débito da Corrida Anterior**: + R$ XX,XX
      - 💰 **Total a Pagar ao Final desta Viagem**: R$ (YY,YY + XX,XX)
    - O valor é quitado automaticamente ao final desta nova corrida.

* ❖ **Chave PIX Visível no Início da Corrida**:
  - Assim que o motorista aceita/inicia a corrida (`ACCEPTED` / `IN_PROGRESS`), a chave PIX do motorista e o valor total já aparecem em destaque para o passageiro adiantar o pagamento com botão de cópia rápida.

* 🛑 **Fim de Chamadas Fantasmas & Cancelamento no Servidor**:
  - Ao cancelar no app do passageiro, a sessão é destruída no banco de dados (`status = 'CANCELLED'`), desativando o alarme e o card no motorista imediatamente.

* ⚡ **PIX Antecipado & Avaliação Mútua**:
  - Passageiro pode antecipar o pagamento PIX durante a corrida e motorista gera QR Code dinâmico ao finalizar.
  - Sistema de avaliação mútua de 1 a 5 estrelas ⭐.

---
**Status Atual**: ✅ Todas as funcionalidades operacionais e validadas no Render.
**Versão**: 13.0.0
**Responsável**: Antigravity AI & Pair Programming
**Últimos Commits**:
- `47af92f` (Desconto de R$ 3,00 para corridas com print acima de R$ 30,00)
- `689ea2a` (Desconto aplicado diretamente sobre o valor do print da concorrência)
- `3fdc63a` (Inserção de endereço simples com Enter e botão de ação rápida)
- `8625bc9` (Corridas longas com som suave, limite 1x e countdown 10s)

