# Diário de Bordo - Construção do Zomp 🚀

## Registro de Implementações Iniciais & UI Premium Avançado

### Refatoração Arquitetural e Visuais (Stitch para Uber SDK Style)

1. **Separação de Instâncias do Aplicativo (PWA Isolado):**
   - Criação de rotas distintas: Aplicação separada logicamente entre `http://localhost:5173/motorista` e `http://localhost:5173/passageiro`, não exigindo mais escolhas em tela de switch.  
   - Definição do Form Factor estrito: O layout foi engessado para emular um ambiente mobile (largura container 480px) de forma fluida sem requerer bordas pesadas limitantes e garantindo que o Progressive Web App (PWA) funcione uniformemente em desktop ou em telas cheia localmente no telefone.

2. **A Autenticação Visual Premium:**
   - Transição do fundo sem graça ou borrado para um *Mapa Vetorial Urbano de Alta Vibração e Exposição*. Este background possui cor vibrante (Neon e Prata), trazendo o ambiente noturno/tech para dentro do app.
   - **Correção da Máscara do Logo:** A imagem estática (`logo.png`), originalmente fornecida com um bloco branco não-transparente que impedia sua inclusão harmônica sobre outros fundos, foi tratada nativamente e em tempo real em CSS (`Auth.css`). Ao utilizar máscaras alfa e backgrounds `linear-gradient` com top branco 100% que se esvaipara formar contraste com o logotipo, eliminamos completamente o retângulo acinzentado de caixa revelando o Z transparente. Adicionalmente, técnicas CSS (`mix-blend-mode` e `filter`) completaram a iluminação.

3. **Sistema Animado de Tráfego de Trânsito:**
   - Implantação de CSS Tracking: Criada uma animação fluida na home-page reproduzindo trânsito nas ruas, composta de pontos neons brilhantes (`.car-dot`) correndo pelas perpendiculares.
   - Velocidade Reduzida: A temporização linear dos "rastros" verdes e neon foi prolongada em cerca de 30% e coordenada com as faixas de rolamento falsas das texturas, oferecendo aquele feeling profissional de um autêntico app de locomoção dinâmico.

4. **Novo App de Passageiro Modernizado (Uber-Likeness):**
   - Construção completa do `Passenger.css` e reescritura do componente `PassengerDashboard.jsx`.
   - **Módulo de Mapeamento Interativo (Leaflet):** Adicionado `react-leaflet` para geração de um mapa real e arrastável. O usuário agora pode mover livremente as ruas da interface baseada em open-street-maps (Carto Voyager Styles).
   - **Geolocalização Ativa Constante:** Integrado hook no ciclo inicial buscando via hardware a API `navigator.geolocation` que detecta nativamente o GPS do passageiro, movendo o centro do mapa automaticamente e preenchendo o Local de Partida.
   - **Roteamento Real via Ruas (OSRM Integration):** Substituí a linha reta (euclidiana) pelo cálculo de trajeto real por ruas utilizando a API **OSRM**. Agora o mapa desenha a geometria exata das ruas entre a Origem e o Destino.
   - **Cálculo de Distância de Precisão:** O valor da corrida e a quilometragem exibida agora refletem o **trajeto real percorrido em ruas**, garantindo que a precificação de R$ 2,00 por KM seja justa e precisa seguindo a malha viária urbana.
   - **Inteligência de Rotas Avançada:** Substituí sugestões mockadas por busca real via **Nominatim API (OpenStreetMap)**, permitindo que o usuário encontre ruas reais no Brasil enquanto digita.
   
5. **Máquina de Estados de Viagem (Booking Flow State Machine):**
   - Transição dinâmica de interface na Bottom Sheet sem recarregar tela: `IDLE` (Busca de rua) -> `PRICED` (Seletor de veículo, valor final, toggle de favoritos, botões Agendar / Chamar Agora) -> `SCHEDULING` (Date/Time Picker) -> `SEARCHING` (Radar pulsante UI) -> `ACCEPTED` (Card detalhado do Motorista a Caminho).
   - **Toggle Priorizar Favoritos:** Uma engine visual no painel `PRICED` onde motoristas favoritos recebem preferência simulando os 15s iniciais de busca dedicada (Ping Priority), ou desligamento para matching imediato de radio abrangente.
   - **Agendamento Real:** Clicar em "Agendar" abre uma tela dedicada com inputs de Data e Hora, seletor de veículo e valor final. O botão "Confirmar Agendamento" só habilita quando data e hora são preenchidos.
   - **Chat Integrado ao Passageiro:** Sobreposição visual na tela em casos de viagens aceitas onde é possível estabelecer uma conversa síncrona com o motorista online em trânsito.
   - **Tempo Estimado (ETA):** Em "viagem ativa" o passageiro agora verá um painel indicando a quantos minutos restam a estimativa de distância do destino. A minutagem é calculada em tempo real com dados retornado pelo roteamento OSRM.
   - **Contagem Regressiva para Cancelamento Gratuito:** Motorista a caminho gera um contador decrescente de 2 minutos ao botão "*Cancelar*", indicando cancelamento gratuito. Expirado o tempo (0:00), o sistema injetará no próprio **Histórico do Passageiro** um status de `CANCELED_FEE` avisando que uma taxa de deslocamento de R$ 2,60 será somada à sua próxima viagem, garantindo o resguardo financeiro do motorista. Paralelamente, corridas canceladas em tempo viável assumem um status limpo de `CANCELED_FREE`. Essa taxa fica pendente e soma-se no valor final automático ao visualizar os preços da próxima solicitação.

7. **Seletor de Veículo e Precificação Inteligente:**
   - **Tipos:** Carro (🚗 Conforto) e Moto (🏍️ Econômico) com cards visuais clicáveis.
   - **Precificação:** Carro = R$ 2,00/km | Moto = R$ 1,50/km.
   - **Tarifa Mínima:** Carro nunca abaixo de R$ 8,40 | Moto nunca abaixo de R$ 7,20. Quando a tarifa mínima é aplicada, um aviso amarelo ⚠️ aparece informando o passageiro.

6. **Sidebar e Gerenciador de Facilidades (Hamburguer Menu):**
   - O botão `☰` de sanduíche no topo do mapa foi codificado em React State (`isMenuOpen` e `activeScreen`), acionando um Drawer Lateral (Sidebar) em vez de um logout imediato. 
   - A sub-navegação agora inclui o Perfil completo e **Editável**, que permite a mudança em tempo real dentro do container local ("Local Storage Override") do Nome Complet e Email refletindo sobre todo o App do passageiro, e um esqueleto visual para listagem de `Histórico` e `Pedidos de Entregas`.
   - **Módulo de Edição de Favoritos:** A aba "Motoristas Favoritos" agora possui um painel próprio onde os usuários conseguem ver a listagem em lista corrida e clicar no botão vermelho "Remover", ação que agora atualiza via State Array e limpa em tempo-real seu indicado. O Logout foi movido com segurança para dentro desta Sidebar.

6. **Ações Registradas de Versionamento e Controles:**
   - Commit frequente (com Push integrado via console CLI) enviando atualizações sequencialmente para a master do GitHub (`leopalmeira/zomp.git`).

7. **Deploy Local (17/04/2026):**
- **Processo:** Instala��o limpa de node_modules e reconstru��o do Prisma Client.
- **Ambiente:** Servidores locais ativos:
    - Frontend: http://localhost:5173/
    - Backend: http://localhost:3001
- **Status:** Dispon�vel para acesso local e testes de integra��o.


## Sessão de Atualização: Formulário de Fretes, Endereços Fixos e Sistema de Avaliação (18/04/2026)

### 1. Novo Motor de UX de Endereços
As caixas e opções de input de Endereços (Origem e Destino) foram transportadas com sucesso para a barra estática superior (`fixed-address-bar`), libertando o passageiro do comportamento invasivo do `bottom-sheet`. Permitindo agora fluxo interativo nativo sem precisar rolar os menus.

### 2. Tratamento Placeholder e Imagens
As cidades de rotas longas que estavam com redundância de praia (como Nova Friburgo e Valença, já que são localizadas em regiões de montanha/interior) tiveram seus designs adaptados usando endpoints estáticos nativos (Unsplash placeholder templates), aguardando asset definitivo para esticar.

### 3. Tela Exclusiva para Fluxo de Fretes
- Foi construída uma state block completamente nova no passenger dashboard: state `FREIGHT`.
- Adição visual na triagem do frete: novas UI inputs para descrições precisas das "Caixas/Sacos", inputs para nome e contatos do destinatário/remetente.
- Tarifa customizada interna setada localmente. Total estimado na base da quilometragem da OSRM (Min() R$ 15,00 ou Km * R$ 2.70). O cliente vê apenas o total cheio pre-calculado.
- Botões duplos obsoletos removidos devido à automatização limpa da validação de rota via Nominatim com o botão focado único.
- **PIN Code anti-fraude em Frete**: Adoção de um código gerado aleatoriamente (ex: `8390`), notificado na visualização do passageiro e necessário para obrigar formalmente aos motoristas parceiros executarem 2 fotos protocolares do envio/recebimento nas duas portas do trajeto para confirmação monetária final.

### 4. Flow de Encerramento e Interface 'Star-Rating'
- Extensão lógica da Máquina de Estados agregando `RATING`.
- Implantação da clássica UX interativa de pontuação em `5 Estrelas` e validação com agradecimento via Modal no pós-chegada.
- Função atrelada com `handleFavorites` diretamente embutida na tela de avaliações: o passageiro já pode salvar ou remover o condutor logado da sua lista de Favoritos do sistema com a macro "Favoritar Motorista" ou mesmo avaliar os motoristas no botão estrela antes disso.

### 5. Pagamento via PIX Descentralizado (P2P Integrado)
- Incluída tela de métodos de pagamento
- Motorista adiciona Chave no Perfil.
- Passageiro visualiza a Chave ao avaliar.

### 6. Múltiplas Paradas Intermediárias em Corridas
- Roteamento nativo e UI estendida para suportar paradas entre rota (Multi-Stop).
- Ocultação inteligente veicular (Ex: Quantidade de pessoas é oculto para Motos).
- Incremento progressivo na tarifa (+2 BRL flat-fee base).
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

