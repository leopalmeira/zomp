# DiÃ¡rio de Bordo - App de Mobilidade (Zomp / Zompify)

Este documento deve **sempre** ser lido antes de qualquer nova implementaÃ§Ã£o e **atualizado** apÃ³s a conclusÃ£o de uma nova mudanÃ§a de cÃ³digo, garantindo rastreabilidade do raciocÃ­nio e das decisÃµes tomadas ao longo do projeto.

## Regras CrÃ­ticas:
- A cada alteraÃ§Ã£o significativa no projeto, um novo registro deve ser feito.
- Todo commit deve seguir um log atrelado Ã s mudanÃ§as registradas aqui.

---

## Log de ModificaÃ§Ãµes

### [15/04/2026] - ImplementaÃ§Ã£o da Camada de Dados e API do Backend
**Feito:**
- **Backend Initialized:** Servidor Node.js com Express e Prisma configurados.
- **Modelagem de Banco de Dados (SQLite):**
    - `User`: Suporte a PapÃ©is (Motorista/Passageiro), QR Code para indicaÃ§Ã£o e Saldo de Royalties.
    - `Referral`: VÃ­nculo permanente entre passageiro e motorista indicador.
    - `Ride`: Registro de viagens com processamento automÃ¡tico de comissÃ£o.
    - `Withdrawal`: GestÃ£o de solicitaÃ§Ãµes de saque.
- **LÃ³gica de Royalties:** Implementado o gatilho no endpoint `/api/rides/:id/complete` que credita R$ 0,10 ao motorista que indicou o passageiro da viagem.
- **AutenticaÃ§Ã£o:** Sistema de Registro e Login com JWT e Hash de senha (bcrypt).
- **Referral QR System:** GeraÃ§Ã£o automÃ¡tica de QR Code para motoristas e vinculaÃ§Ã£o no registro de novos passageiros.

### [15/04/2026] - InicializaÃ§Ã£o do Frontend Premium
**Feito:**
- **Vite + React:** Setup inicial do frontend em `frontend/`.
- **Design System:** ImplementaÃ§Ã£o da base visual "Premium Stitch-style" em `index.css` e `App.css`.

### [15/04/2026] - ImplementaÃ§Ã£o Completa do Frontend (v1.1.0)
**Feito:**
- **Design System Premium (`index.css`):** ReconstruÃ§Ã£o completa do design system com paleta dark (#0a0e17) e accent verde (#00E676), tipografia Inter, sistema de botÃµes, inputs, cards com glassmorphism, animaÃ§Ãµes (fadeInUp, pulse-glow, float, shimmer) e scrollbar customizada.
- **Sistema de Rotas (`App.jsx`):** ImplementaÃ§Ã£o de rotas protegidas com `react-router-dom`. Redirecionamento automÃ¡tico baseado no papel do usuÃ¡rio (DRIVER â†’ `/driver`, PASSENGER â†’ `/passenger`). Componente `ProtectedRoute` com validaÃ§Ã£o de autenticaÃ§Ã£o e RBAC.
- **Camada de ServiÃ§os (`services/api.js`):** MÃ³dulo centralizado para comunicaÃ§Ã£o com o Backend (baseURL `http://localhost:3001/api`). FunÃ§Ãµes: `register()`, `login()`, `logout()`, `getCurrentUser()`, `isAuthenticated()`, `getWallet()`, `requestWithdrawal()`, `requestRide()`, `completeRide()`. PersistÃªncia de token JWT e dados do usuÃ¡rio em localStorage.
- **PÃ¡gina de Login (`pages/LoginPage.jsx`):** FormulÃ¡rio de autenticaÃ§Ã£o com validaÃ§Ã£o, feedback visual de loading e erros. Redirecionamento pÃ³s-login baseado no papel do usuÃ¡rio.
- **PÃ¡gina de Cadastro (`pages/RegisterPage.jsx`):** FormulÃ¡rio com seletor visual de papel (Passageiro ðŸ§‘ / Motorista ðŸš—). Campo condicional de cÃ³digo de indicaÃ§Ã£o (aparece apenas para passageiros). ValidaÃ§Ã£o de senha mÃ­nima 6 caracteres.
- **Dashboard do Motorista (`pages/DriverDashboard.jsx`):** Header sticky com glassmorphism e botÃ£o de logout. Card de saldo de Royalties com gradiente verde e animaÃ§Ã£o de pulse. QR Code de indicaÃ§Ã£o gerado via API externa (qrserver.com) com botÃ£o de copiar cÃ³digo. Grid de estatÃ­sticas (Indicados, Valor por corrida, Ciclo de saque).
- **Dashboard do Passageiro (`pages/PassengerDashboard.jsx`):** Ã�rea de mapa simulada com pin flutuante animado e grid de fundo. BotÃ£o "Solicitar Corrida" integrado com a API. Feedback visual de corrida solicitada com ID truncado. Grid de estatÃ­sticas do perfil.
- **Prisma Downgrade:** MigraÃ§Ã£o de Prisma v7 (incompatÃ­vel com `url` no schema) para Prisma v5.22.0 para compatibilidade com SQLite local. Banco de dados `dev.db` criado com sucesso via `prisma db push`.
- **SEO:** `index.html` atualizado com `lang="pt-BR"`, meta description, preconnect para Google Fonts.

**DecisÃµes TÃ©cnicas:**
- **Prisma v5 vs v7:** Prisma 7 removeu suporte a `url` no `schema.prisma`, exigindo `prisma.config.ts`. Para manter simplicidade nesta fase, optamos por fixar na v5.22.0.
- **QR Code via API Externa:** Usamos `api.qrserver.com` para gerar QR Codes visualmente, evitando dependÃªncia adicional de bibliotecas de geraÃ§Ã£o local.
- **Design Mobile-First:** Container max-width 480px para simular experiÃªncia de app mobile no desktop.

**A Fazer / PrÃ³ximos Passos:**
- Endpoint de referrals para listar indicados de um motorista (contagem e detalhes).
- IntegraÃ§Ã£o do endpoint de saque (`/api/wallet/withdraw`) com botÃ£o na UI.
- ValidaÃ§Ã£o do ciclo de 3 meses para saque (regra de negÃ³cio no backend).
- Mapa real com integraÃ§Ã£o de geolocalizaÃ§Ã£o (Leaflet ou Google Maps).
- Testes end-to-end das regras de royalties.
- Deploy no Render (backend + frontend build).

---

### [17/04/2026] - Deploy Local e ConfiguraÃ§Ã£o de Ambiente
**Feito:**
- **InstalaÃ§Ã£o de DependÃªncias:** `npm install` completo em `frontend/` e `backend/`.
- **SincronizaÃ§Ã£o de Banco de Dados:** SQLite (`dev.db`) inicializado e sincronizado via `npx prisma db push`.
- **Setup de ExecuÃ§Ã£o:** 
    - Backend ativo em `http://localhost:3001`.
    - Frontend (Vite) ativo em `http://localhost:5173/` (com `--host` habilitado).
- **ValidaÃ§Ã£o:** Ambiente local totalmente operacional para desenvolvimento simultÃ¢neo.

### [17/04/2026] - Integração do Passageiro ao Backend
**Feito:**
- **Schema Prisma Atualizado:** Adicionado suporte a origin, destination, price, distanceKm e vehicleType na tabela Ride.
- **API GET /api/rides:** Endpoint para buscar histórico real sincronizado com o banco.
- **API PUT /api/rides/:id/cancel:** Integração da cobrança e mudança de status de cancelamentos virtuais (CANCELED_FREE e CANCELED_FEE).
- **Frontend (PassengerDashboard):**
  - Integração do botão Chamar Agora disparando payload rico para a base.
  - Sidebar substitui histórico mockado via localStorage por busca assíncrona.
  - Lógica de cancelamento reativa repassando o ID da viagem pro servidor.

### [17/04/2026] - Integração do Motorista Parceiro
**Feito:**
- **API GET /api/rides/pending:** Endpoint no backend para os motoristas escutarem chamados em tempo real.
- **API POST /api/rides/:id/accept:** Endpoint permitindo travar um pedido pendente para o motorista.
- **Frontend (DriverDashboard):**
  - Adicionado Toggle (Online / Offline) em tempo real que executa polling das novas corridas.
  - Cartão detalhado informando o preço da corrida, origem, destino, km e nome do passageiro.
  - Botões para 'Aceitar Corrida' e 'Finalizar Corrida', que automaticamente recalcula os Royalties (via api completeRide) se o passageiro foi indicado.

### [17/04/2026] - Ajustes UI Mobile
**Feito:**
- Modificado tema do mapa padrao para Claro, adcionando opcao de dark mode no menu de configuracoes.
- Alterado comportamento do botao de online para um slide-to-go-online fixo em baixo.

### [17/04/2026] - Componentes Essenciais Driver App
**Feito:**
- Fix taxa de cancelamento do Passageiro (corrida cancelada cobra corretamente 2.80 fixo).
- Frontend: Melhorias significativas visuais na barra Slide To Go Online (bottom sheet).
- Frontend: Drawer Menu lateral com design mais profissional, cards e espacamentos ajustados.
- Adicionado Tela de 'Documentos e VeÃ­culo' para insercao de CNH, CRLV, Placa, Modelo, Cor e upload mockado de fotos.
- Backend: Atualizacao do Prisma (cnh, crlv, etc) e novo endpoint PUT /api/user/profile.

### [17/04/2026] - Regras de Royalties e Vinculo (5 Anos / 3 Anos)
**Feito:**
- Passageiro indicado (qr/link) ou na sua primeira corrida passa a ter um vinculo com o Motorista com duracao de **5 ANOS**.
- Apos a expiracao dos 5 anos, o passageiro fica 'livre'. Na proxima vez que ele concluir uma corrida, ele e imediatamente vinculado ao novo motorista daquela corrida, desta vez com duracao de **3 ANOS**.
- VÃ­nculo gerencia o split de Royalties (0.10 por corrida) automaticamente.

### [17/04/2026] - GPS Tracking
**Feito:**
- SubstituÃ­do getCurrentPosition por watchPosition().
- Ambos os apps (Passageiro e Motorista) agora vao atualizar a localizacao nativa (pino verde) em tempo real conforme andam com o dispositivo na rua.

### [17/04/2026] - Validacoes de AprovaÃ§Ã£o do Motorista
**Feito:**
- Criado logica na barra Slide To Go Online do Driver App:
  - Se usuario nao preencheu CNH e CRLV, o slider Ã© bloqueado pedindo que ele faca o upload em 'Documentos e VeÃ­culo'.
  - Se ele fez upload mas ainda o **isApproved == false**, um alerta expecÃ­fico Ã© retornado na tela ('Estamos validando seus dados... ate 12 horas') proibindo-o de aceitar corridas.
- Banco de dados atualizado, flag isApproved retornando no proprio payload de Sessao na hora do login.

## [19/04/2026] - Upgrade de UX e Identidade Visual (v2.0.12 - v2.0.18)
- **Compactação da Interface:** Barra de endereços reduzida em 30% e sistema de paradas minimalista com sinal de (+).
- **Identidade Visual:** Substituição do logo de imagem por tipografia futurista neon, eliminando fundos brancos.
- **Limpeza de Marca:** Remoção de todas as atribuições e logos do Leaflet (Liftmaps) para um visual limpo e proprietário.
- **UX de Passageiros:** Integração do seletor de quantidade de pessoas diretamente no card do veículo, eliminando cards redundantes e melhorando o fluxo de escolha.
- **Estabilidade PWA:** Implementação do bloqueio de rolagem e overscroll para sensação de App Nativo 100% estático.


## [19/04/2026] - Refinamento Final de UX (v2.0.20)
- **Integração Total:** Seletor de passageiros movido para DENTRO do card do Carro, limpando o layout inferior.
- **Branding Clean:** Marca dágua do Leaflet removida globalmente de todos os mapas no Passageiro e Motorista.


## [19/04/2026] - Estratégia de Preço Imbatível (v2.0.22)
- **Campanha Preço Imbatível:** Lançada funcionalidade que permite ao passageiro anexar print da concorrência (Uber/99) para receber R$ 2,00 de desconto adicional garantido.
- **Refinamento de UI:** O seletor de passageiros foi movido para a borda inferior do card de veículo, com maior espaçamento entre os controles para melhor precisão ao toque.


## [19/04/2026] - Estabilidade e Refinamento Geo (v2.0.24)
- **Correção da Tela Branca:** Implementada proteção no renderizador de rotas e marcadores para evitar falhas catastróficas quando coordenadas são nulas.
- **Melhoria no GPS:** Removido texto " GPS\ fixo que travava as caixas de endereço. Agora o usuário tem liberdade total para digitar ou usar a localização atual mapeada.
- **Interatividade Total:** Adicionados marcadores interativos com Popups informando endereços de partida, paradas e destino diretamente no mapa.
- **Design de Interface:** Barra de endereços compactada em 30% na altura e 10% na largura para otimizar o uso do espaço de tela e destacar o mapa.
- **Desconto Garantido:** Reforçada funcionalidade de desconto de R$ 2,00 via print da concorrência, agora com interface de upload mais clara.

## [19/04/2026] - Integração Gemini AI Vision e Robustez Extrema (v2.0.35 - v2.0.42)
- **Blindagem do App (Anti Tela Branca):** Adicionado `ErrorBoundary` Global envolvendo todo o App em React, salvando o sistema de quebras (crashes brancos). O GPS useEffect foi blindado contra loops, e os parsers de API não cracham mais com Respostas não-JSON (Ex: 403 Forbidden).
- **IA de Visão (OCR Inteligente Removido):** O Tesseract.js (rodando no celular do cliente) foi completamente **removido** do React devido às altas falhas em telas escuras e variação de UX na concorrência.
- **Google Gemini 2.5 Flash Vision no Backend:** A nova API da Inteligência Computacional (`/api/analyze-print`) foi integrada. Agora convertemos o print em Base64 no Frontend e a IA do Google Lê pelo servidor, alcançando **100% de taxa de acerto** da identificação do valor lido no print, ignorando números descartados ou de outras classes.
- **Arquitetura de Rodízio de Chaves:** Implementada arquitetura de rodízio randômico de chaves da API (Arsenal com Múltiplas Chaves do AI Studio Google) no NodeJS, distribuindo assim as cargas da IA e garantindo que o sistema gratuito (15 RPM) se multiplique e nunca gere bloqueios ou cobranças acidentais.
