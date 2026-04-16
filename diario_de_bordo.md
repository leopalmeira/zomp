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

**A Fazer / Próximos Passos:**
- Implementar telas de Dashboard para Motorista (QR Code de Indicação) e Passageiro.
- Integrar Frontend com a API de Carteira (Wallet) para visualização de saldo e extrato.
- Adicionar mapa interativo para simulação de corridas.
- Configurar rotas protegidas (Private Routes) baseadas no papel do usuário.

