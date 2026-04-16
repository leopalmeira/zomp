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
   - Adicionado mapa rodoviário flutuando por toda extensão da viewport simulando API (com pin luminoso animado saltitando no ar).
   - "Bottom Sheet" retrátil engajada fixada à borda inferior incluindo sistema dual de barra cronológica para origem `Local de Partida` visivelmente separada do campo de `Buscar Destino`.
   - Rolagem X do eixo para o "Carrossel de Motoristas Prioritários / Favoritados" em cima da escolha de partida onde usuários visualizam avatares em cards customizados dos motoristas distantes à < 10 minutos para prioridade e rápida associação.
   - Inclusão do submenu de Data/Tempo para acionamento na intenção de "Agendamento" acionando a regra de intervalo configurável (+2 hotas).

5. **Ações Registradas de Versionamento e Controles:**
   - Commit frequente (com Push integrado via console CLI) enviando atualizações sequencialmente para a master do GitHub (`leopalmeira/zomp.git`), certificando que qualquer mudança de layout pudesse ser consultada online.
