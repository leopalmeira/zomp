# 🔐 Credenciais de Acesso Rápido — Zomp

> Todas as credenciais abaixo são exclusivamente para **testes internos**.

---

## 🌐 Site Principal (Landing Page)
- **Link:** [zomp.com.br](https://zomp.com.br) *(ou https://www.zomp.com.br)*
- **Descrição:** Página institucional pública da Zomp. Contém os links de acesso para Passageiro e Motorista.

---

## 📱 App do Passageiro (Cliente)
- **Link:** [zomp.com.br/passageiro](https://zomp.com.br/passageiro)
- **E-mail:** `cliente@zomp.com`
- **Senha:** `teste123`
- **Ações:** Solicitar corridas de carro ou moto, visualizar valor estimado e acompanhar motorista no mapa.

---

## 🚗 App do Motorista (Já Aprovado)
- **Link:** [zomp.com.br/motorista](https://zomp.com.br/motorista)
- **E-mail:** `motorista@zomp.com`
- **Senha:** `teste123`
- **Veículo:** Toyota Corolla (Preto), Placa: `ZMP-2026`
- **CNH:** `12345678900`
- **Ações:** Ficar online, receber chamados com haptic feedback e alertas sonoros, aceitar e realizar corridas.

---

## 🖥️ Painel Administrativo (Admin)
- **Link:** [zomp.com.br/admin/login](https://zomp.com.br/admin/login)
- **E-mail:** `leandro2703palmeira@gmail.com`
- **Senha:** `Lps27031981@`
- **Ações:** Gerenciar motoristas, aprovar cadastros, configurar taxas, acompanhar corridas e dados financeiros.

> ⚠️ **IMPORTANTE:** O link do painel admin **NÃO aparece** na página pública do site. Acesse apenas pelo link direto acima.

---

## ⚙️ Infraestrutura Essencial no Render
| Serviço | Tipo | Função | Domínio / URL |
|---------|------|--------|---------------|
| `zomp-app` | Static Site | Site principal + Apps (React SPA) | `zomp.com.br` / `www.zomp.com.br` |
| `zomp-api` | Web Service (Node) | Backend / API REST | `zomp-api.onrender.com` *(ou api.zomp.com.br)* |
| `zomp-db` | PostgreSQL | Banco de dados relacional | Interno |
