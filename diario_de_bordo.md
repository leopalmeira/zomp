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

## [20/04/2026] - Migração para OCR Local com EasyOCR e Robustez (v2.1.0)
- **Integração de OCR Local:** Adicionado suporte ao `EasyOCR` (Python) no backend para leitura de prints sem dependência de chaves de API externa e custo zero.
- **Backend Híbrido:** O endpoint `/api/analyze-print` agora tenta primeiro o processamento local e utiliza o Google Gemini apenas como fallback automático.
- **Frontend Consistente:** Padronizada a `API_BASE` no `PassengerDashboard.jsx` para evitar erros de conexão e adicionado tratamento de erro visual para chaves de IA expiradas.
- **Motor de Extração:** Criado `ocr_service.py` com lógica de Regex e heurística para ler categorias "Pop" da 99 e "UberX" da Uber com alta precisão.
- **Correção de Transparência:** Implementada conversão automática para RGB no script Python, resolvendo falhas ao salvar prints RGBA/LA como JPEG.
- **Compatibilidade Render:** Padronizado comando de execução para `python3` em ambientes Linux e inclusão automática de dependências no `render.yaml`.
- **Estabilidade CLI:** Migrado o envio da imagem do `base64` direto para um arquivo temporário no disco antes de chamar o Python. Isso resolve o erro `Argument list too long (E2BIG)` comum em sistemas Linux/Render com imagens grandes.
- **Tratamento de Arquivos:** Implementada limpeza automática (unlink) dos arquivos temporários após o processamento.

## [20/04/2026] - Refinamento da Campanha Preço Imbatível (v2.2.0)
- **Heurística de OCR Aprimorada:** Atualizado o `ocr_service.py` para priorizar a extração de preços próximos às palavras-chave "UberX", "99Pop" e "Pop", garantindo que o desconto seja aplicado sobre a categoria correta do concorrente.
- **Robustez no Backend:** Corrigido erro de redeclaração de variável no endpoint `/api/analyze-print` e otimizado o prompt do Gemini (fallback) para focar estritamente nas categorias econômicas.
- **Lógica de Preço Inteligente:** No frontend (`PassengerDashboard.jsx`), a função `getPrice` agora garante que o preço final seja o **mínimo** entre a tarifa padrão Zomp e o valor do print menos R$ 2,00. O desconto agora é aplicado exclusivamente à categoria "Carro".
- **UX de Confirmação:** Adicionado feedback visual claro no log do servidor e melhorado o tratamento de erros caso o print não contenha categorias elegíveis.
- **Conformidade de Especialistas:** Garantido que todas as mudanças respeitam os parâmetros definidos em `@backend-specialist.md` e `@frontend-specialist.md` para um app premium e escalável.

## [20/04/2026] - Robustez no Processamento de Print (v2.2.1)
- **Refatoração Async no Frontend:** Migrada toda a lógica de leitura, compressão e upload de imagem para uma estrutura de Promises encadeadas (`async/await`) no `PassengerDashboard.jsx`. Isso garante que o estado de "Lendo..." seja sempre limpo via `finally`, evitando que a interface trave.
- **Roteamento de API Fixo:** Adicionado o domínio `zomp-backend.onrender.com` como fallback direto no frontend para garantir que as requisições de análise de imagem cheguem ao servidor correto, independente de variáveis de ambiente do Vite.
- **Logging de Diagnóstico:** Implementados logs detalhados no console do navegador (`[AI VISION]`) para facilitar o rastreamento de sucessos e falhas em tempo real durante a análise do print.
- **Correção de Deployment:** Sincronizado o código corrigido com o GitHub, resolvendo o erro de build que impedia a atualização das novas regras de OCR.

## [20/04/2026] - Estética Premium: Aura Preço Imbatível (v2.2.2)
- **Efeito de Aura Animada:** Implementada uma animação de "aura" rotativa utilizando `conic-gradient` e `keyframes` em torno do card de Preço Imbatível. Isso cria um destaque visual de alto nível que atrai a atenção do passageiro para a promessa de menor preço.
- **Micro-interações:** Adicionado efeito de `hover` com elevação (`translateY`) e escala no botão de upload, reforçando a natureza interativa e premium da interface.
- **Design System:** Ajustados paddings, sombras e arredondamentos do card para alinhar com os parâmetros de "Visual Excellence" do projeto.

## [20/04/2026] - Refinamento Visual: Aura Verde Zomp (v2.2.3)
- **Aura Verde Neon:** Alterada a cor da aura para o verde padrão Zomp (`#00E676`), criando um contraste vibrante com o fundo avermelhado do card "Preço Imbatível".
- **Desfoque de 10px:** Aplicado filtro de `blur(10px)` na aura para um efeito de iluminação suave e profissional ("glow mode").
- **Animação Desacelerada:** Reduzida a velocidade de rotação para 10 segundos, tornando o movimento mais elegante e menos distrativo, mantendo o foco na informação.

## [20/04/2026] - Refatoração do Endpoint analyze-print: Gemini como Principal (v2.3.0)
- **Inversão de Prioridade:** O endpoint /api/analyze-print foi refatorado para usar o **Google Gemini Vision como método principal** (e não mais fallback). O EasyOCR Python passou a ser o fallback para ambientes locais.
- **Prompt Estruturado:** O prompt do Gemini foi completamente reescrito para ser muito mais específico, instruindo a IA a:
  1. Identificar a plataforma (Uber ou 99)
  2. Localizar APENAS o preço de **UberX** (Uber) ou **Pop/99Pop** (99)
  3. Ignorar categorias premium (UberBlack, Comfort, 99Top, etc.)
  4. Retornar um JSON estruturado: {platform, category, price}
- **Rodízio de Chaves:** Loop em sequência pelas chaves Gemini disponíveis até uma funcionar, garantindo máxima disponibilidade.
- **Validação de Categoria:** Backend agora valida se a categoria retornada pelo Gemini é aceitável (UberX ou Pop). Se for categoria premium, retorna HTTP 422 com mensagem específica.
- **Frontend Aprimorado:** O PassengerDashboard.jsx agora:
  - Guarda compPlatform e compCategory além do compPriceRead
  - Exibe badge com a plataforma identificada (Uber/99) e a categoria (UberX/Pop) no card de confirmação
  - Trata HTTP 422 de forma amigável (sem throw, mostra alert com mensagem do backend)
  - Mensagem de erro mais detalhada com dicas práticas ao usuário
  - Reset dos estados de plataforma/categoria no esetFlow()
- **Card de Confirmação Melhorado:** O card "PREÇO IMBATÍVEL APLICADO!" agora mostra: plataforma identificada, categoria, preço original, novo preço Zomp (- R$ 2,00) e badge "R$ 2,00 mais barato que a concorrência ✅"

## [2026-04-20] - Refinamento Premium & Integração de Ferramentas IA Parte 2

### 🚀 Novidades
- **Menu do Motorista (Premium v3.0):**
    - Redesign completo do drawer lateral do Motorista com estética 'Slate/Emerald' moderna (glassmorphism leve).
    - Organização de itens por categoria (Principal, Financeiro, Sistema & Ajuda).
    - Header dinâmico com Resumo de Créditos, Extrato de Royalties e Avatar destacado.
    - Navegação muito mais polida e profissional para alavancar a experiência do parceiro.
- **Antigravity Kit Instalado:**
    - Repositório udovn/antigravity-kit instalado na raiz (/antigravity-kit), trazendo blueprints e guias de +20 especialistas.
- **Preço Imbatível (OCR Resiliência):**
    - Otimização do endpoint do Gemini com novo Fallback Regex para correção de formatação em respostas Markdown embutidas.
    - Logs mais transparentes de Request (Base64 character length exibido) criados para facilitar debug de payload no Render.


---

### [28/04/2026] - Landing Page Premium + Simulador de Ganhos (v3.1.0)
**Feito:**
- Redesenho completo da LandingPage.jsx e LandingPage.css
- Royalty ajustado para R$ 0,30 por corrida
- Tabela: 400 passageiros x 2 corridas/semana = R$ 2.880 trimestral (estimado)
- Imagens IA: zomp_driver_network.png e zomp_driver_wallet.png
- CountUp animado nos valores com Framer Motion
- Todos os valores marcados como estimados de exemplo

### [28/04/2026] - Landing Page Redesign Visual (v3.2.0)
**Feito:**
- Hero com foto realista de motorista como banner fullscreen
- Countdown regressivo ate 30/06/2026 (dias, horas, minutos, segundos)
- Vagas limitadas com ponto verde pulsante, texto sempre claro
- Cards comparativos clean: Zomp destacada, concorrencia apagada
- Paleta equilibrada: verde so em CTAs e destaques
- Card Passageiro: motorista indica app, passageiro acessa Preco Imbativel
- Secao Por que a Zomp e diferente: textos sempre claros

### [28/04/2026] - Painel Administrativo Completo (v4.0.0)
**Feito:**
- AdminPanel.jsx + AdminPanel.css: 7 secoes (Dashboard, Motoristas, Passageiros, Vinculos, Configuracoes, Fundo, Saques)
- Regras de negocio:
  - 1o Vinculo: 36 meses via QR Code ou 1a corrida com o motorista
  - Renovacao: 24 meses apos expirar (proximo motorista que aceitar)
  - Royalty padrao: R$ 0,30 por corrida concluida do passageiro vinculado
  - Limite mensal: mais de 8 corridas/mes vai ao fundo coletivo
  - Maximo 700 passageiros vinculados por motorista
- Novas rotas backend /api/admin/: stats, drivers, passengers, link, config, royalty-fund, withdrawals
- Schema Prisma: AdminConfig, RoyaltyFund, Ride.royaltySentToFund, User.role=ADMIN
- Migration SQL manual: 20260428000000_add_admin_config_royalty_fund
- seed.js: cria admin e config via env vars (nunca hardcoded no codigo)
- App.jsx: rotas /admin e /admin/login
- SEGURANCA: configurar no Render Dashboard: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME



### [29/04/2026] - Governança Master & Preço Imbatível 2.0
**Feito:**
- **Preço Imbatível S/ Burocracia:** Removida a necessidade de print de tela no app do passageiro. Agora a validação é 100% via input de valor e lógica de teto de segurança no sistema.
- **Visual Agressivo:** Redesign do feedback de oferta no app do passageiro, com animações e destaque de economia real (savings).
- **Suspensão Automática (IA/Métricas):** Implementada lógica no backend que monitora Nota (Estrelas) e Taxa de Aceitação. Motoristas abaixo do limite (configurável pelo admin) são suspensos automaticamente.
- **Painel Admin Consolidado:** Seção de configurações agora detalha todas as regras de negócio da plataforma (Preço, Royalties, Suspensão). Ajustada terminologia para "Prazo Definido".
- **Informe de Rendimentos:** Implementado gerador de informe anual em HTML/Print para conformidade fiscal dos motoristas.
- **Deploy:** Atualização técnica completa e restauração de acessos aos servidores.

### 📅 29/04/2026 - Gestão Master e Sistema de Créditos
- **Nacionalização Total:** Painel Admin traduzido 100% para o Português, eliminando termos técnicos em inglês (IRP, Profit Margin, etc) para clareza absoluta.
- **Sistema de Créditos Operacionais:**
    - Implementação de rastreamento de compras de créditos (Diário, Semanal, Mensal).
    - Autonomia administrativa para configurar o preço por crédito via PIX.
    - Integração de receitas de créditos no Demonstrativo Financeiro Geral.
- **Central de Documentação Integrada:** Criada uma enciclopédia operacional dentro do painel, detalhando regras de suspensão, precificação e fluxos técnicos.
- **Onboarding Purificado:** Ajuste na jornada do motorista para focar 100% na sua operação, removendo referências irrelevantes a passageiros durante o cadastro.
- **Blindagem Financeira:** Adição de 'Optional Chaining' e proteções numéricas no frontend para prevenir crashes por falta de dados históricos.
- **Banco de Dados (Prisma):** Adição do modelo `CreditTransaction` e novos campos de configuração global.

**Decisões Técnicas:**
- **Fim do Print:** A análise de print (Gemini/OCR) era um ponto de fricção. Optamos por uma regra de negócio baseada em "Teto de Segurança por KM", permitindo que o passageiro apenas informe o valor e o sistema decida se cobre ou não instantaneamente.
- **Gatilho de Suspensão:** O check de suspensão ocorre em cada evento crítico (aceitação, rejeição ou avaliação), garantindo resposta rápida à baixa qualidade.

**A Fazer:**
- Automação de envio de e-mails/notificações para motoristas suspensos.
- Exportação do Informe de Rendimentos diretamente para PDF (server-side).
