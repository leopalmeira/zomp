# 🔐 Credenciais de Acesso Rápido — Zomp

> Todas as credenciais abaixo são exclusivamente para **testes internos**.

---

## 🌐 Site Principal (Landing Page)
- **Link:** [zomp-app.onrender.com](https://zomp-app.onrender.com)
- **Descrição:** Página institucional pública da Zomp. Contém os links de acesso para Passageiro e Motorista.

---

## 📱 App do Passageiro (Cliente)
- **Link Direto:** [zomp-app.onrender.com/passageiro](https://zomp-app.onrender.com/passageiro)
- **Link Render:** [zomp-passageiro.onrender.com](https://zomp-passageiro.onrender.com)
- **E-mail:** `cliente@zomp.com`
- **Senha:** `teste123`
- **Ações:** Solicitar corridas de carro ou moto, visualizar valor estimado e acompanhar motorista no mapa.

---

## 🚗 App do Motorista (Já Aprovado)
- **Link Direto:** [zomp-app.onrender.com/motorista](https://zomp-app.onrender.com/motorista)
- **Link Render:** [zomp-motorista.onrender.com](https://zomp-motorista.onrender.com)
- **E-mail:** `motorista@zomp.com`
- **Senha:** `teste123`
- **Veículo:** Toyota Corolla (Preto), Placa: `ZMP-2026`
- **CNH:** `12345678900`
- **Ações:** Ficar online, receber chamados com haptic feedback e alertas sonoros, aceitar e realizar corridas.

---

## 🖥️ Painel Administrativo (Admin)
- **Link Direto:** [zomp-app.onrender.com/admin/login](https://zomp-app.onrender.com/admin/login)
- **Link Render:** [zomp-admin.onrender.com](https://zomp-admin.onrender.com)
- **E-mail:** `leandro2703palmeira@gmail.com`
- **Senha:** `Lps27031981@`
- **Ações:** Gerenciar motoristas, aprovar cadastros, configurar taxas, acompanhar corridas e dados financeiros.

> ⚠️ **IMPORTANTE:** O link do painel admin **NÃO aparece** na página pública do site. Acesse apenas pelo link direto acima ou pelo serviço `zomp-admin` no Render.

---

## ⚙️ Infraestrutura no Render
| Serviço | Tipo | Função |
|---------|------|--------|
| `zomp-api` | Web Service (Node) | Backend / API REST |
| `zomp-app` | Static Site | Site principal (Landing + SPA) |
| `zomp-passageiro` | Static Site | Redirect para App Passageiro |
| `zomp-motorista` | Static Site | Redirect para App Motorista |
| `zomp-admin` | Static Site | Redirect para Painel Admin |
| `zomp-db` | PostgreSQL | Banco de dados |
