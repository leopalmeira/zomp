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

### 3. State Machine da Corrida
A interface responde dinamicamente à mudança de status sem recarregar a tela:
*   `IDLE`: Tela inicial de busca e marcação do local.
*   `PRICED`: Mostra o preço, opção de priorizar favoritos, seletor do veículo e os botões de Chamar ou Agendar.
*   `SCHEDULING`: View de configuração de hora/data para agendar.
*   `SEARCHING`: Radar de busca de motoristas dinâmico.
*   `ACCEPTED`: Mostra o motorista que aceitou a viagem, com foto, placa, modelo do veículo e avaliação.

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

4. **Acesse:**  `http://localhost:5173/`

## 📖 Documentação Adicional
Consulte os arquivos na raiz e dependências, e as atualizações descritas em `diario_de_bordo.md` (no frontend e raiz) para o histórico das decisões de arquitetura e registros do desenvolvimento ativo.

---
*Zomp - Mudando a mobilidade de forma inteligente.*
