# Zomp - Mobilidade Inteligente

Zomp é uma plataforma de mobilidade urbana moderna (estilo Uber), focada na experiência do usuário e em um sistema de bonificação exclusivo para motoristas e passageiros (Royalties).

O projeto é dividido em **Frontend** (React + Vite) e **Backend** (Node.js + Prisma + PostgreSQL/SQLite).

## 🚀 Principais Funcionalidades

### 1. Painel do Passageiro (Passenger Dashboard)
O core do aplicativo para os usuários solicitarem ou agendarem corridas com uma interface fluida, *mobile-first* e baseada em estados (State Machine).

*   **Busca de Endereços Real (Nominatim API):** Sistema de autocompletar que busca endereços reais no Brasil usando o OpenStreetMap.
*   **Integração OSRM (Roteamento Real):** O caminho da viagem é desenhado no mapa exatamente sobre as ruas, calculando a distância precisa de rodagem, substituindo cálculos de distância em linha reta (euclidiana).
*   **Precificação Inteligente & Seletor de Veículo:**
    *   🚗 **Carro:** Foco em conforto. Custo de R$ 2,00 / km com tarifa mínima de R$ 8,40.
    *   🏍️ **Moto:** Opção econômica. Custo de R$ 1,50 / km com tarifa mínima de R$ 7,20.
*   **Agendamento Real:** 
    *   Formulário para definir data e hora. 
    *   Formatação de datas amigável ao formato brasileiro (DD/MM/YYYY). 
    *   Salvamento automático (via `localStorage`) e seção dedicada no menu para visualização, acompanhamento de status de motoristas confirmados ou agurdando, e cancelamento de corridas.
*   **Priorização de Favoritos:** O passageiro pode ativar uma chave (toggle) para que um motorista de sua preferência seja avisado antes dos outros na busca.

### 2. Sistema de Referral & Royalties
*   Todo motorista gera um QR Code único e um código numérico.
*   O passageiro realiza o cadastro no app lendo o QR Code do seu motorista favorito.
*   Esse vínculo é **permanente**: para toda corrida que o passageiro finaliza (independente de qual motorista fez a viagem), o motorista que o indicou recebe **R$ 0,10** de royalty.
*   O motorista possui uma **Carteira (Wallet)** com o saldo acumulado, disponível para saque a cada 3 meses.

### 3. Preço Imbatível Zomp (Anti-Concorrência)
*   **Zero Burocracia:** O passageiro informa o preço visto na Uber ou 99 diretamente no app.
*   **Desconto Instantâneo:** O sistema aplica automaticamente um desconto de R$ 2,00 sobre o valor informado.
*   **Teto de Segurança:** Algoritmo protege o motorista, garantindo que o valor final por KM nunca fique abaixo do custo operacional definido pelo administrador.

### 4. Governança & Qualidade (Driver Care)
*   **Suspensão Automática:** Monitoramento em tempo real de Avaliação (Estrelas) e Taxa de Aceitação. Motoristas abaixo do padrão são suspensos instantaneamente pelo sistema.
*   **Transparência Fiscal:** Geração de Informe de Rendimentos anual (HTML/PDF) para facilitar a declaração de imposto de renda dos parceiros.
*   **Vínculo Vitalício:** Sistema de Royalties de 60 meses para indicações de novos passageiros.

### 5. Painel Administrativo Master
*   **Monitoramento Real-Time:** Fluxo de pedidos, corridas em andamento e faturamento global.
*   **Gestão Financeira:** Controle de Fundo de Royalties, Saldo da Empresa e Processamento de Saques.
*   **Configuração Global:** Alteração dinâmica de tarifas, limites de suspensão e parâmetros de rede.

## 💻 Stack Tecnológico

**Frontend:**
*   React 18 + Vite
*   React Router DOM para navegação.
*   React Leaflet para integração com mapas interativos e renderização flexível utilizando OpenStreetMap e CartoDB.
*   Vanilla CSS para componentização com estilos personalizados e premium.

**Backend (Estrutura):**
*   Express / Node.js
*   Prisma ORM integrado inicialmente ao SQLite para rápido desenvolvimento.

## 🛠️ Como Executar o Projeto Localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/leopalmeira/zomp.git
   cd zomp
   ```

2. **Backend:**
   Abra um terminal, instale e rode:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npm run start:dev
   ```

3. **Frontend:**
   Abra outro terminal, instale e rode:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Acesse as interfaces (PWA) de navegação em seu navegador local:**
   - **App do Passageiro:** [http://localhost:5173/passageiro](http://localhost:5173/passageiro)
   - **App do Motorista:** [http://localhost:5173/motorista](http://localhost:5173/motorista)

### 5. Painel Administrativo Master
*   **Monitoramento Real-Time:** Fluxo de pedidos, corridas em andamento e faturamento global.
*   **Gestão Financeira:** Controle de Fundo de Royalties, Saldo da Empresa e Processamento de Saques.
*   **Configuração Global:** Alteração dinâmica de tarifas, limites de suspensão e parâmetros de rede.

## 💻 Stack Tecnológico
...
