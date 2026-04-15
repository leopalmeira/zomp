# Diário de Bordo - App de Mobilidade (Zomp / Zompify)

Este documento deve **sempre** ser lido antes de qualquer nova implementação e **atualizado** após a conclusão de uma nova mudança de código, garantindo rastreabilidade do raciocínio e das decisões tomadas ao longo do projeto.

## Regras Críticas:
- A cada alteração significativa no projeto, um novo registro deve ser feito.
- Todo commit deve seguir um log atrelado às mudanças registradas aqui.

---

## Log de Modificações

### [15/04/2026] - Inicialização do Projeto e Definição de Arquitetura
**Feito:**
- Inicializado o repositório Git no diretório raiz do projeto.
- Criados os arquivos de modelo de agente `@frontend-specialist.md` e `@backend-specialist.md`.
- Estabelecido este arquivo (`diario_de_bordo.md`) para rastreamento centralizado de atividades.
- Definida as premissas de regras de negócio estritas sobre o vínculo vitalício de indicação (Motorista -> Passageiro via QRCode) e comissão por viagem concluída (R$ 0,10 por corrida, sacável a cada 3 meses).

**A Fazer / Próximos Passos:**
- Inicializar a infraestrutura do Backend (Node/Express, Banco de dados Prisma) com a modelagem do sistema de Referrals.
- Inicializar a aplicação Frontend (React / Vite) para seguir referencial do layout (Stitch).
- Configuração do Git para commit automático de cada fase de modificação.
