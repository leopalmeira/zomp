# Diário de Bordo - App de Mobilidade (Zomp / Zompify)

Este documento deve **sempre** ser lido antes de qualquer nova implementação e **atualizado** após a conclusão de uma nova mudança de código, garantindo rastreabilidade do raciocínio e das decisões tomadas ao longo do projeto.

## Regras Críticas:
- A cada alteração significativa no projeto, um novo registro deve ser feito.
- Todo commit deve seguir um log atrelado às mudanças registradas aqui.

---

## Log de Modificações

### [15/04/2026] - Implementação da Camada de Dados e API do Backend
**Feito:**
- **Backend Initialized:** Servidor Node.js com Express e Prisma configurados.
- **Modelagem de Banco de Dados (SQLite):**
    - `User`: Suporte a Papéis (Motorista/Passageiro), QR Code para indicação e Saldo de Royalties.
    - `Referral`: Vínculo permanente entre passageiro e motorista indicador.
    - `Ride`: Registro de viagens com processamento automático de comissão.
    - `Withdrawal`: Gestão de solicitações de saque.
- **Lógica de Royalties:** Implementado o gatilho no endpoint `/api/rides/:id/complete` que credita R$ 0,10 ao motorista que indicou o passageiro da viagem.
- **Autenticação:** Sistema de Registro e Login com JWT e Hash de senha (bcrypt).
- **Referral QR System:** Geração automática de QR Code para motoristas e vinculação no registro de novos passageiros.

### [15/04/2026] - Inicialização do Frontend Premium
**Feito:**
- **Vite + React:** Setup inicial do frontend em `frontend/`.
- **Design System:** Implementação da base visual "Premium Stitch-style" em `index.css` e `App.css`.

### [15/04/2026] - Implementação Completa do Frontend (v1.1.0)
**Feito:**
- **Design System Premium (`index.css`):** Reconstrução completa do design system com paleta dark (#0a0e17) e accent verde (#00E676), tipografia Inter, sistema de botões, inputs, cards com glassmorphism, animações (fadeInUp, pulse-glow, float, shimmer) e scrollbar customizada.
- **Sistema de Rotas (`App.jsx`):** Implementação de rotas protegidas com `react-router-dom`. Redirecionamento automático baseado no papel do usuário (DRIVER → `/driver`, PASSENGER → `/passenger`). Componente `ProtectedRoute` com validação de autenticação e RBAC.
- **Camada de Serviços (`services/api.js`):** Módulo centralizado para comunicação com o Backend (baseURL `http://localhost:3001/api`). Funções: `register()`, `login()`, `logout()`, `getCurrentUser()`, `isAuthenticated()`, `getWallet()`, `requestWithdrawal()`, `requestRide()`, `completeRide()`. Persistência de token JWT e dados do usuário em localStorage.
- **Página de Login (`pages/LoginPage.jsx`):** Formulário de autenticação com validação, feedback visual de loading e erros. Redirecionamento pós-login baseado no papel do usuário.
- **Página de Cadastro (`pages/RegisterPage.jsx`):** Formulário com seletor visual de papel (Passageiro 🧑 / Motorista 🚗). Campo condicional de código de indicação (aparece apenas para passageiros). Validação de senha mínima 6 caracteres.
- **Dashboard do Motorista (`pages/DriverDashboard.jsx`):** Header sticky com glassmorphism e botão de logout. Card de saldo de Royalties com gradiente verde e animação de pulse. QR Code de indicação gerado via API externa (qrserver.com) com botão de copiar código. Grid de estatísticas (Indicados, Valor por corrida, Ciclo de saque).
- **Dashboard do Passageiro (`pages/PassengerDashboard.jsx`):** Área de mapa simulada com pin flutuante animado e grid de fundo. Botão "Solicitar Corrida" integrado com a API. Feedback visual de corrida solicitada com ID truncado. Grid de estatísticas do perfil.
- **Prisma Downgrade:** Migração de Prisma v7 (incompatível com `url` no schema) para Prisma v5.22.0 para compatibilidade com SQLite local. Banco de dados `dev.db` criado com sucesso via `prisma db push`.
- **SEO:** `index.html` atualizado com `lang="pt-BR"`, meta description, preconnect para Google Fonts.

**Decisões Técnicas:**
- **Prisma v5 vs v7:** Prisma 7 removeu suporte a `url` no `schema.prisma`, exigindo `prisma.config.ts`. Para manter simplicidade nesta fase, optamos por fixar na v5.22.0.
- **QR Code via API Externa:** Usamos `api.qrserver.com` para gerar QR Codes visualmente, evitando dependência adicional de bibliotecas de geração local.
- **Design Mobile-First:** Container max-width 480px para simular experiência de app mobile no desktop.

**A Fazer / Próximos Passos:**
- Endpoint de referrals para listar indicados de um motorista (contagem e detalhes).
- Integração do endpoint de saque (`/api/wallet/withdraw`) com botão na UI.
- Validação do ciclo de 3 meses para saque (regra de negócio no backend).
- Mapa real com integração de geolocalização (Leaflet ou Google Maps).
- Testes end-to-end das regras de royalties.
- Deploy no Render (backend + frontend build).

---

### [17/04/2026] - Deploy Local e Configuração de Ambiente
**Feito:**
- **Instalação de Dependências:** `npm install` completo em `frontend/` e `backend/`.
- **Sincronização de Banco de Dados:** SQLite (`dev.db`) inicializado e sincronizado via `npx prisma db push`.
- **Setup de Execução:** 
    - Backend ativo em `http://localhost:3001`.
    - Frontend (Vite) ativo em `http://localhost:5173/` (com `--host` habilitado).
- **Validação:** Ambiente local totalmente operacional para desenvolvimento simultâneo.

### [17/04/2026] - Integra��o do Passageiro ao Backend
**Feito:**
- **Schema Prisma Atualizado:** Adicionado suporte a origin, destination, price, distanceKm e vehicleType na tabela Ride.
- **API GET /api/rides:** Endpoint para buscar hist�rico real sincronizado com o banco.
- **API PUT /api/rides/:id/cancel:** Integra��o da cobran�a e mudan�a de status de cancelamentos virtuais (CANCELED_FREE e CANCELED_FEE).
- **Frontend (PassengerDashboard):**
  - Integra��o do bot�o Chamar Agora disparando payload rico para a base.
  - Sidebar substitui hist�rico mockado via localStorage por busca ass�ncrona.
  - L�gica de cancelamento reativa repassando o ID da viagem pro servidor.

### [17/04/2026] - Integra��o do Motorista Parceiro
**Feito:**
- **API GET /api/rides/pending:** Endpoint no backend para os motoristas escutarem chamados em tempo real.
- **API POST /api/rides/:id/accept:** Endpoint permitindo travar um pedido pendente para o motorista.
- **Frontend (DriverDashboard):**
  - Adicionado Toggle (Online / Offline) em tempo real que executa polling das novas corridas.
  - Cart�o detalhado informando o pre�o da corrida, origem, destino, km e nome do passageiro.
  - Bot�es para 'Aceitar Corrida' e 'Finalizar Corrida', que automaticamente recalcula os Royalties (via api completeRide) se o passageiro foi indicado.

### [17/04/2026] - Ajustes UI Mobile
**Feito:**
- Modificado tema do mapa padrao para Claro, adcionando opcao de dark mode no menu de configuracoes.
- Alterado comportamento do botao de online para um slide-to-go-online fixo em baixo.

### [17/04/2026] - Componentes Essenciais Driver App
**Feito:**
- Fix taxa de cancelamento do Passageiro (corrida cancelada cobra corretamente 2.80 fixo).
- Frontend: Melhorias significativas visuais na barra Slide To Go Online (bottom sheet).
- Frontend: Drawer Menu lateral com design mais profissional, cards e espacamentos ajustados.
- Adicionado Tela de 'Documentos e Veículo' para insercao de CNH, CRLV, Placa, Modelo, Cor e upload mockado de fotos.
- Backend: Atualizacao do Prisma (cnh, crlv, etc) e novo endpoint PUT /api/user/profile.

### [17/04/2026] - Regras de Royalties e Vinculo (5 Anos / 3 Anos)
**Feito:**
- Passageiro indicado (qr/link) ou na sua primeira corrida passa a ter um vinculo com o Motorista com duracao de **5 ANOS**.
- Apos a expiracao dos 5 anos, o passageiro fica 'livre'. Na proxima vez que ele concluir uma corrida, ele e imediatamente vinculado ao novo motorista daquela corrida, desta vez com duracao de **3 ANOS**.
- Vínculo gerencia o split de Royalties (0.10 por corrida) automaticamente.

### [17/04/2026] - GPS Tracking
**Feito:**
- Substituído getCurrentPosition por watchPosition().
- Ambos os apps (Passageiro e Motorista) agora vao atualizar a localizacao nativa (pino verde) em tempo real conforme andam com o dispositivo na rua.

### [17/04/2026] - Validacoes de Aprovação do Motorista
**Feito:**
- Criado logica na barra Slide To Go Online do Driver App:
  - Se usuario nao preencheu CNH e CRLV, o slider é bloqueado pedindo que ele faca o upload em 'Documentos e Veículo'.
  - Se ele fez upload mas ainda o **isApproved == false**, um alerta expecífico é retornado na tela ('Estamos validando seus dados... ate 12 horas') proibindo-o de aceitar corridas.
- Banco de dados atualizado, flag isApproved retornando no proprio payload de Sessao na hora do login.

## [19/04/2026] - Upgrade de UX e Identidade Visual (v2.0.12 - v2.0.18)
- **Compacta��o da Interface:** Barra de endere�os reduzida em 30% e sistema de paradas minimalista com sinal de (+).
- **Identidade Visual:** Substitui��o do logo de imagem por tipografia futurista neon, eliminando fundos brancos.
- **Limpeza de Marca:** Remo��o de todas as atribui��es e logos do Leaflet (Liftmaps) para um visual limpo e propriet�rio.
- **UX de Passageiros:** Integra��o do seletor de quantidade de pessoas diretamente no card do ve�culo, eliminando cards redundantes e melhorando o fluxo de escolha.
- **Estabilidade PWA:** Implementa��o do bloqueio de rolagem e overscroll para sensa��o de App Nativo 100% est�tico.


## [19/04/2026] - Refinamento Final de UX (v2.0.20)
- **Integra��o Total:** Seletor de passageiros movido para DENTRO do card do Carro, limpando o layout inferior.
- **Branding Clean:** Marca d�gua do Leaflet removida globalmente de todos os mapas no Passageiro e Motorista.


## [19/04/2026] - Estrat�gia de Pre�o Imbat�vel (v2.0.22)
- **Campanha Pre�o Imbat�vel:** Lan�ada funcionalidade que permite ao passageiro anexar print da concorr�ncia (Uber/99) para receber R$ 2,00 de desconto adicional garantido.
- **Refinamento de UI:** O seletor de passageiros foi movido para a borda inferior do card de ve�culo, com maior espa�amento entre os controles para melhor precis�o ao toque.


## [19/04/2026] - Estabilidade e Refinamento Geo (v2.0.24)
- **Corre��o da Tela Branca:** Implementada prote��o no renderizador de rotas e marcadores para evitar falhas catastr�ficas quando coordenadas s�o nulas.
- **Melhoria no GPS:** Removido texto " GPS\ fixo que travava as caixas de endere�o. Agora o usu�rio tem liberdade total para digitar ou usar a localiza��o atual mapeada.
- **Interatividade Total:** Adicionados marcadores interativos com Popups informando endere�os de partida, paradas e destino diretamente no mapa.
- **Design de Interface:** Barra de endere�os compactada em 30% na altura e 10% na largura para otimizar o uso do espa�o de tela e destacar o mapa.
- **Desconto Garantido:** Refor�ada funcionalidade de desconto de R$ 2,00 via print da concorr�ncia, agora com interface de upload mais clara.

