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
   - **Módulo de Mapeamento Interativo (Leaflet):** Adicionado `react-leaflet` para geração de um mapa real e arrastável. O usuário agora pode mover livremente as ruas da interface baseada em open-street-maps (Carto Voyager Styles) debaixo do Pino Fixo Central, tal qual dinâmica da classe A de apps de mobilidade.
   - **Geolocalização Ativa Constante:** Integrado hook no ciclo inicial buscando via hardware a API `navigator.geolocation` que detecta nativamente o GPS do passageiro, movendo o centro do mapa automaticamente e validando o painel dinamicamente em espera.
   - "Bottom Sheet" retrátil engajada fixada à borda inferior incluindo sistema dual de barra cronológica para origem/destino.
   - **Interação Recolhível:** Agora é possível clicar na aba da haste (Drag Handle) no topo do painel branco para colapsá-lo `isSheetCollapsed`, permitindo visão desobstruída do grande mapa atrás.
   - Inclusão do submenu de Data/Tempo para acionamento na intenção de "Agendamento" acionando a regra de intervalo configurável (+2 hotas).
   
5. **Sidebar e Gerenciador de Facilidades (Hamburguer Menu):**
   - O botão `☰` de sanduíche no topo do mapa foi codificado em React State (`isMenuOpen` e `activeScreen`), acionando um Drawer Lateral (Sidebar) em vez de um logout imediato. 
   - A sub-navegação agora inclui o Perfil completo e **Editável**, que permite a mudança em tempo real dentro do container local ("Local Storage Override") do Nome Complet e Email refletindo sobre todo o App do passageiro, e um esqueleto visual para listagem de `Histórico` e `Pedidos de Entregas`.
   - **Módulo de Edição de Favoritos:** A aba "Motoristas Favoritos" agora possui um painel próprio onde os usuários conseguem ver a listagem em lista corrida e clicar no botão vermelho "Remover", ação que agora atualiza via State Array e limpa em tempo-real seu indicado. O Logout foi movido com segurança para dentro desta Sidebar.

6. **Ações Registradas de Versionamento e Controles:**
   - Commit frequente (com Push integrado via console CLI) enviando atualizações sequencialmente para a master do GitHub (`leopalmeira/zomp.git`).
