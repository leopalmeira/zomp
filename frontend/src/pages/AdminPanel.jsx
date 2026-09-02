import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminPanel.css'

const API = import.meta.env.VITE_API_URL || 'https://zomp-api.onrender.com/api'

function api(path, opts = {}) {
  const token = localStorage.getItem('zomp_token')
  return fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...opts
  }).then(async r => {
    try {
      return await r.json()
    } catch {
      return { error: 'Resposta inválida do servidor' }
    }
  })
}

function safeNum(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const tabs = [
  'Dashboard',
  'Financeiro',
  'Operações',
  'Motoristas',
  'Passageiros',
  'Suporte',
  'Configurações',
  'Fundo',
  'Saques',
  'Documentação'
]

export default function AdminPanel() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('Dashboard')
  const [stats, setStats] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [passengers, setPassengers] = useState([])
  const [operations, setOperations] = useState([])
  const [config, setConfig] = useState(null)
  const [fund, setFund] = useState(null)
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  // Suporte & Chat em Tempo Real
  const [supportTickets, setSupportTickets] = useState([])
  const [activeSupportTicket, setActiveSupportTicket] = useState(null)
  const [supportMessages, setSupportMessages] = useState([])
  const [adminReplyText, setAdminReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)
  const [supportFilter, setSupportFilter] = useState('ALL')

  // Filtros & Buscas
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modais
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [selectedPassenger, setSelectedPassenger] = useState(null)
  const [selectedRide, setSelectedRide] = useState(null)
  const [creditsModal, setCreditsModal] = useState(null)
  const [creditsAmount, setCreditsAmount] = useState('')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'Dashboard') {
        const [s, ops, cfg, drvs] = await Promise.all([
          api('/admin/stats'),
          api('/admin/operations'),
          api('/admin/config'),
          api('/admin/drivers')
        ])
        setStats(s)
        setOperations(Array.isArray(ops) ? ops : [])
        if (cfg && !cfg.error) setConfig(cfg)
        if (Array.isArray(drvs)) setDrivers(drvs)
      } else if (tab === 'Financeiro') {
        setStats(await api('/admin/stats'))
      } else if (tab === 'Operações') {
        const ops = await api('/admin/operations')
        setOperations(Array.isArray(ops) ? ops : [])
      } else if (tab === 'Motoristas') {
        const [drvs, cfg] = await Promise.all([
          api('/admin/drivers'),
          api('/admin/config')
        ])
        setDrivers(Array.isArray(drvs) ? drvs : [])
        if (cfg && !cfg.error) setConfig(cfg)
      } else if (tab === 'Passageiros') {
        const psgs = await api('/admin/passengers')
        setPassengers(Array.isArray(psgs) ? psgs : [])
      } else if (tab === 'Suporte') {
        const tks = await api('/admin/support/tickets')
        if (Array.isArray(tks)) {
          setSupportTickets(tks)
          if (tks.length > 0 && !activeSupportTicket) {
            setActiveSupportTicket(tks[0])
          }
        }
      } else if (tab === 'Configurações') {
        setConfig(await api('/admin/config'))
      } else if (tab === 'Fundo') {
        setFund(await api('/admin/royalty-fund'))
      } else if (tab === 'Saques') {
        const wds = await api('/admin/withdrawals')
        setWithdrawals(Array.isArray(wds) ? wds : [])
      }
    } catch (e) {
      showToast('Erro ao carregar dados da aba', 'error')
    } finally {
      setLoading(false)
    }
  }, [tab, activeSupportTicket])

  useEffect(() => {
    const initialLoad = setTimeout(load, 0)
    let interval
    if (tab === 'Operações' || tab === 'Dashboard' || tab === 'Suporte') {
      interval = setInterval(load, 6000)
    }
    return () => {
      clearTimeout(initialLoad)
      clearInterval(interval)
    }
  }, [load, tab])

  // Polling em tempo real das mensagens do chamado ativo no chat
  useEffect(() => {
    let interval
    if (tab === 'Suporte' && activeSupportTicket?.id) {
      const fetchMsgs = async () => {
        try {
          const msgs = await api(`/admin/support/tickets/${activeSupportTicket.id}/messages`)
          if (Array.isArray(msgs)) setSupportMessages(msgs)
        } catch (e) {
          console.warn('Erro ao buscar mensagens:', e)
        }
      }
      fetchMsgs()
      interval = setInterval(fetchMsgs, 3000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [tab, activeSupportTicket?.id])

  const handleSendAdminReply = async (textToSend) => {
    const text = textToSend || adminReplyText
    if (!activeSupportTicket || !text.trim()) return
    setIsSendingReply(true)
    try {
      const r = await api(`/admin/support/tickets/${activeSupportTicket.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ text: text.trim() })
      })
      if (r.error) return showToast(r.error, 'error')
      setAdminReplyText('')
      const msgs = await api(`/admin/support/tickets/${activeSupportTicket.id}/messages`)
      if (Array.isArray(msgs)) setSupportMessages(msgs)
      showToast('Resposta enviada com sucesso!')
    } catch (e) {
      showToast('Erro ao enviar resposta', 'error')
    } finally {
      setIsSendingReply(false)
    }
  }

  const handleUpdateTicketStatus = async (newStatus) => {
    if (!activeSupportTicket) return
    const r = await api(`/admin/support/tickets/${activeSupportTicket.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    })
    if (r.error) return showToast(r.error, 'error')
    showToast(`Status alterado para ${newStatus}!`)
    setActiveSupportTicket({ ...activeSupportTicket, status: newStatus })
    const tks = await api('/admin/support/tickets')
    if (Array.isArray(tks)) setSupportTickets(tks)
  }

  // Ações de Motorista & Pré-Cadastro
  const approveDriver = async (id, val) => {
    const r = await api(`/admin/users/${id}/approve`, { method: 'PUT', body: JSON.stringify({ isApproved: val }) })
    if (r.error) return showToast(r.error, 'error')
    showToast(val ? '✓ Motorista aprovado e ativado para a estreia com sucesso!' : 'Motorista suspenso temporariamente!')
    load()
  }

  const toggleAppLaunch = async () => {
    const nextVal = !config?.isAppLive
    const r = await api('/admin/config', { 
      method: 'PUT', 
      body: JSON.stringify({ isAppLive: nextVal, launchStatus: nextVal ? 'LIVE' : 'PRE_LAUNCH' }) 
    })
    if (r.error) return showToast(r.error, 'error')
    setConfig(r)
    showToast(nextVal ? '🚀 Estreia Oficial do App LIBERADA para todos os passageiros!' : '⏸️ Plataforma em Fase de Pré-Cadastro (Aguardando Estreia).')
  }

  const handleAddCredits = async () => {
    if (!creditsModal || !creditsAmount) return
    const r = await api(`/admin/users/${creditsModal.id}/credits`, {
      method: 'PUT',
      body: JSON.stringify({ amount: Number(creditsAmount) })
    })
    if (r.error) return showToast(r.error, 'error')
    showToast(`+${creditsAmount} créditos concedidos a ${creditsModal.name}!`)
    setCreditsModal(null)
    setCreditsAmount('')
    load()
  }

  const handleResetStats = async (id) => {
    const r = await api(`/admin/users/${id}/reset-stats`, { method: 'PUT' })
    if (r.error) return showToast(r.error, 'error')
    showToast('Estatísticas de aceitação resetadas com sucesso!')
    load()
  }

  // Ações de Configuração
  const saveConfig = async () => {
    const r = await api('/admin/config', { method: 'PUT', body: JSON.stringify(config) })
    if (r.error) showToast(r.error, 'error')
    else showToast('Configurações operacionais salvas com sucesso!')
  }

  // Ações de Saques
  const handleWithdrawalAction = async (id, status) => {
    const r = await api(`/admin/withdrawals/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })
    if (r.error) return showToast(r.error, 'error')
    showToast(status === 'APPROVED' ? 'Saque marcado como APROVADO!' : 'Saque REJEITADO e saldo estornado ao motorista!')
    load()
  }

  // Ações de Corridas
  const handleCancelRide = async (id) => {
    if (!window.confirm('Tem certeza que deseja cancelar esta corrida pelo painel administrativo?')) return
    const r = await api(`/admin/rides/${id}/cancel`, { method: 'PUT' })
    if (r.error) return showToast(r.error, 'error')
    showToast('Corrida cancelada pelo administrador!')
    if (selectedRide?.id === id) setSelectedRide(null)
    load()
  }

  // Contadores de Motoristas
  const pendingDriversCount = drivers.filter(d => !d.isApproved).length
  const approvedDriversCount = drivers.filter(d => d.isApproved).length

  // Filtros aplicados
  const filteredDrivers = drivers.filter(d => {
    const matchesSearch =
      (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.phone || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.carPlate || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.carModel || '').toLowerCase().includes(search.toLowerCase())
    if (statusFilter === 'PENDING') return matchesSearch && !d.isApproved
    if (statusFilter === 'ACTIVE') return matchesSearch && d.isApproved
    if (statusFilter === 'SUSPENDED') return matchesSearch && !d.isApproved
    return matchesSearch
  })

  const filteredPassengers = passengers.filter(p => {
    return (
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.phone || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.linkedDriverName || '').toLowerCase().includes(search.toLowerCase())
    )
  })

  const filteredOperations = operations.filter(r => {
    const matchesSearch =
      (r.passengerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.driverName || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.origin || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.destination || '').toLowerCase().includes(search.toLowerCase())
    if (statusFilter !== 'ALL') return matchesSearch && r.status === statusFilter
    return matchesSearch
  })

  const filteredWithdrawals = withdrawals.filter(w => {
    const matchesSearch =
      (w.userName || '').toLowerCase().includes(search.toLowerCase()) ||
      (w.userEmail || '').toLowerCase().includes(search.toLowerCase()) ||
      (w.pixKey || '').toLowerCase().includes(search.toLowerCase())
    if (statusFilter !== 'ALL') return matchesSearch && w.status === statusFilter
    return matchesSearch
  })

  const configGroups = [
    {
      title: '🚗 Tarifas e Preços Operacionais',
      fields: [
        { key: 'pricePerKmCar', label: 'Preço por KM (Carro)', type: 'number', step: '0.10', prefix: 'R$' },
        { key: 'pricePerKmMoto', label: 'Preço por KM (Moto)', type: 'number', step: '0.10', prefix: 'R$' },
        { key: 'minFareCar', label: 'Tarifa Mínima (Carro)', type: 'number', step: '0.50', prefix: 'R$' },
        { key: 'minFareMoto', label: 'Tarifa Mínima (Moto)', type: 'number', step: '0.50', prefix: 'R$' },
        { key: 'pricePerCredit', label: 'Preço de Compra por Crédito', type: 'number', step: '0.10', prefix: 'R$' },
      ]
    },
    {
      title: '💎 Royalties & Rede de Fidelidade (Landing Page & Sistema)',
      fields: [
        { key: 'royaltyPerRide', label: 'Royalty por Corrida Concluída', type: 'number', step: '0.05', prefix: 'R$' },
        { key: 'driverSlots', label: 'Vagas de Motoristas para Cadastro (RJ)', type: 'number', step: '100' },
        { key: 'bindingMonthsFirst', label: 'Duração do Vínculo Inicial (12 = 1 ano, 24 = 2 anos)', type: 'number', step: '1' },
        { key: 'bindingMonthsRenew', label: 'Duração da Renovação de Vínculo (meses)', type: 'number', step: '1' },
        { key: 'maxPassengersPerDriver', label: 'Limite de Passageiros por Motorista', type: 'number', step: '50' },
        { key: 'royaltyMonthlyLimit', label: 'Limite Mensal de Saque de Royalties', type: 'number', step: '1' },
      ]
    },
    {
      title: '🛡️ Segurança, Critérios e Contagem Regressiva',
      fields: [
        { key: 'launchDate', label: 'Data de Encerramento do Pré-cadastro (Contador Regressivo)', type: 'date' },
        { key: 'autoSuspendMinAcceptance', label: 'Taxa Mínima de Aceitação para Suspensão (%)', type: 'number', step: '1' },
        { key: 'autoSuspendMinRating', label: 'Nota Mínima de Avaliação para Suspensão', type: 'number', step: '0.1' },
      ]
    }
  ]

  return (
    <div className="ap-root">
      {toast && <div className={`ap-toast ap-toast-${toast.type}`}>{toast.msg}</div>}

      {/* ── MENU LATERAL (SIDEBAR) ── */}
      <aside className="ap-sidebar">
        <div className="ap-brand">
          <img src="/logo.svg" alt="Zomp" className="ap-logo" />
          <div className="ap-brand-text">
            <span>ZOMP</span>
            <small>Terminal Admin</small>
          </div>
        </div>

        <nav className="ap-nav">
          {tabs.map(t => (
            <button
              key={t}
              className={`ap-nav-btn ${tab === t ? 'active' : ''}`}
              onClick={() => {
                setTab(t)
                setSearch('')
                setStatusFilter('ALL')
                setSelectedDriver(null)
                setSelectedPassenger(null)
                setSelectedRide(null)
              }}
            >
              <span className="ap-nav-icon">
                {t === 'Dashboard' && '📊'}
                {t === 'Financeiro' && '💰'}
                {t === 'Operações' && '📡'}
                {t === 'Motoristas' && '🚗'}
                {t === 'Passageiros' && '👤'}
                {t === 'Suporte' && '🎧'}
                {t === 'Configurações' && '⚙️'}
                {t === 'Fundo' && '💎'}
                {t === 'Saques' && '💳'}
                {t === 'Documentação' && '📖'}
              </span>
              <span className="ap-nav-label">{t}</span>
            </button>
          ))}
        </nav>

        <div className="ap-sidebar-footer">
          <button className="ap-logout" onClick={() => { localStorage.clear(); navigate('/') }}>
            <span>🚪</span> Sair da Conta
          </button>
        </div>
      </aside>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <main className="ap-main">
        <div className="ap-topbar">
          <div>
            <h1 className="ap-page-title">{tab}</h1>
            <p className="ap-page-sub">
              {tab === 'Dashboard' && 'Visão panorâmica e métricas em tempo real'}
              {tab === 'Financeiro' && 'Balanço financeiro, receitas e royalties'}
              {tab === 'Operações' && 'Monitoramento ao vivo de todas as corridas'}
              {tab === 'Motoristas' && 'Gestão, aprovações, créditos e documentos'}
              {tab === 'Passageiros' && 'Base de clientes e vínculos de indicação'}
              {tab === 'Suporte' && 'Atendimento ao vivo para motoristas e passageiros'}
              {tab === 'Configurações' && 'Parâmetros globais, taxas e regras do app'}
              {tab === 'Fundo' && 'Fundo acumulado de dividendos e top motoristas'}
              {tab === 'Saques' && 'Processamento e aprovação de resgates PIX'}
              {tab === 'Documentação' && 'Manual e regras operacionais da plataforma'}
            </p>
          </div>
          <div className="ap-topbar-right">
            <span className="ap-admin-badge">🟢 Conectado ao Servidor</span>
            <button className="ap-refresh" onClick={load} title="Atualizar dados">
              {loading ? 'Carregando...' : '↻ Atualizar'}
            </button>
          </div>
        </div>

        {/* ── DASHBOARD ── */}
        {tab === 'Dashboard' && stats && (
          <div className="ap-dashboard">
            {/* CARD DE CONTROLE DE ESTREIA DO APP */}
            <div className="ap-launch-control-card" style={{
              background: config?.isAppLive 
                ? 'linear-gradient(135deg, rgba(0, 230, 118, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)' 
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.2) 100%)',
              border: config?.isAppLive ? '1.5px solid #00E676' : '1.5px solid #f59e0b',
              borderRadius: '18px',
              padding: '20px 24px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: config?.isAppLive ? '0 8px 30px rgba(0, 230, 118, 0.2)' : '0 8px 30px rgba(245, 158, 11, 0.15)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '1.4rem' }}>{config?.isAppLive ? '🚀' : '⏳'}</span>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', fontWeight: 900 }}>
                    Status da Plataforma: {config?.isAppLive ? 'Estreia Oficial Liberada (App ao Vivo)' : 'Fase de Pré-Cadastro (Aguardando Estreia)'}
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', maxWidth: '680px', lineHeight: '1.4' }}>
                  {config?.isAppLive 
                    ? 'O app está 100% liberado para todos os passageiros solicitarem corridas estilo Uber/99 e motoristas realizarem viagens em tempo real.'
                    : `Os motoristas estão realizando o pré-cadastro na Landing Page. Existem ${pendingDriversCount} motoristas aguardando aprovação.`}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {pendingDriversCount > 0 && (
                  <button 
                    className="ap-btn ap-btn-primary" 
                    onClick={() => { setTab('Motoristas'); setStatusFilter('PENDING'); }}
                    style={{ background: '#f59e0b', color: '#000', fontWeight: 800 }}
                  >
                    ⏳ Ver {pendingDriversCount} Pré-Cadastros
                  </button>
                )}
                <button
                  className="ap-btn"
                  onClick={toggleAppLaunch}
                  style={{
                    background: config?.isAppLive ? '#ef4444' : '#00E676',
                    color: '#000',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                  }}
                >
                  {config?.isAppLive ? '⏸️ Pausar Estreia (Modo Pré-Cadastro)' : '🚀 Liberar Estreia Oficial do App'}
                </button>
              </div>
            </div>

            <div className="ap-stats-grid">
              <div className="ap-stat-card ap-stat-green" onClick={() => setTab('Motoristas')} style={{cursor:'pointer'}}>
                <span className="ap-stat-val">{stats.totalDrivers}</span>
                <span className="ap-stat-lbl">🚗 Motoristas Cadastrados</span>
                <small className="ap-stat-hint">{pendingDriversCount} pendentes de aprovação</small>
              </div>
              <div className="ap-stat-card ap-stat-blue" onClick={() => setTab('Passageiros')} style={{cursor:'pointer'}}>
                <span className="ap-stat-val">{stats.totalPassengers}</span>
                <span className="ap-stat-lbl">👤 Passageiros Totais</span>
                <small className="ap-stat-hint">Clique para gerenciar</small>
              </div>
              <div className="ap-stat-card ap-stat-orange" onClick={() => setTab('Operações')} style={{cursor:'pointer'}}>
                <span className="ap-stat-val">{stats.activeRidesCount || 0}</span>
                <span className="ap-stat-lbl">📡 Corridas em Andamento</span>
                <small className="ap-stat-hint">Em tempo real</small>
              </div>
              <div className="ap-stat-card ap-stat-gold" onClick={() => setTab('Fundo')} style={{cursor:'pointer'}}>
                <span className="ap-stat-val">R$ {safeNum(stats.royaltyFundBalance).toFixed(2)}</span>
                <span className="ap-stat-lbl">💎 Fundo Global de Royalties</span>
                <small className="ap-stat-hint">Acumulado em carteiras</small>
              </div>
            </div>

            <div className="ap-two-col">
              <div className="ap-live-feed">
                <div className="ap-card-header-flex">
                  <h3>📡 Últimas Corridas na Plataforma</h3>
                  <button className="ap-link-btn" onClick={() => setTab('Operações')}>Ver todas →</button>
                </div>
                {operations && operations.slice(0, 7).map(ride => (
                  <div key={ride.id} className="ap-feed-item" onClick={() => setSelectedRide(ride)}>
                    <div className="ap-feed-icon">🚗</div>
                    <div className="ap-feed-body">
                      <strong>{ride.passengerName || 'Passageiro'} → {ride.driverName || 'Buscando motorista...'}</strong>
                      <span>Origem: {(ride.origin || '').slice(0, 35)}...</span>
                    </div>
                    <div className="ap-feed-right">
                      <strong className="ap-feed-price">R$ {safeNum(ride.price).toFixed(2)}</strong>
                      <span className={`ap-status ap-status-${(ride.status || '').toLowerCase()}`}>{ride.status}</span>
                    </div>
                  </div>
                ))}
                {operations && operations.length === 0 && (
                  <p className="ap-empty-msg">Nenhuma operação registrada recentemente.</p>
                )}
              </div>

              <div className="ap-rules-box">
                <h3>⚡ Ações Rápidas do Administrador</h3>
                <div className="ap-quick-actions-grid">
                  <button className="ap-quick-btn" onClick={() => { setTab('Motoristas'); setStatusFilter('PENDING'); }}>
                    <span className="ap-qb-icon">⏳</span>
                    <div>
                      <strong>Aprovar Pré-Cadastros ({pendingDriversCount})</strong>
                      <small>Validar CNH, CRLV e perfil</small>
                    </div>
                  </button>
                  <button className="ap-quick-btn" onClick={() => setTab('Saques')}>
                    <span className="ap-qb-icon">💳</span>
                    <div>
                      <strong>Aprovar Saques</strong>
                      <small>Liberar transferências PIX</small>
                    </div>
                  </button>
                  <button className="ap-quick-btn" onClick={() => setTab('Configurações')}>
                    <span className="ap-qb-icon">⚙️</span>
                    <div>
                      <strong>Alterar Tarifas</strong>
                      <small>Ajustar preço por KM ou tarifa mínima</small>
                    </div>
                  </button>
                  <button className="ap-quick-btn" onClick={() => setTab('Financeiro')}>
                    <span className="ap-qb-icon">💰</span>
                    <div>
                      <strong>Relatório de Lucro</strong>
                      <small>Ver margem líquida e impostos</small>
                    </div>
                  </button>
                </div>

                <div className="ap-info-notice" style={{marginTop:'20px'}}>
                  <strong>📌 Regra Central de Royalties:</strong>
                  <p>Cada corrida concluída por um passageiro credita automaticamente <strong>R$ 0,30</strong> na conta do motorista que o indicou.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── FINANCEIRO ── */}
        {tab === 'Financeiro' && stats && (
          <div className="ap-finance">
            <div className="ap-fin-grid">
              <div className="ap-fin-card">
                <span className="ap-fin-label">Venda de Créditos (Faturamento do App)</span>
                <strong className="ap-fin-val" style={{color:'#00E676'}}>
                  R$ {safeNum(stats.financials?.creditSalesTotal).toFixed(2)}
                </strong>
                <small className="ap-fin-sub">
                  Receita bruta com créditos ({stats.completedRidesCount || stats.totalRides || 0} corridas × R$ {safeNum(stats.financials?.pricePerCredit || 1.50).toFixed(2)})
                </small>
              </div>

              <div className="ap-fin-card">
                <span className="ap-fin-label">Impostos s/ Faturamento Bruto</span>
                <strong className="ap-fin-val" style={{color:'#f87171'}}>
                  - R$ {safeNum(stats.financials?.taxes).toFixed(2)}
                </strong>
                <small className="ap-fin-sub">6% DAS Simples Nacional sobre a venda de créditos</small>
              </div>

              <div className="ap-fin-card">
                <span className="ap-fin-label">Custos (Servidor + Royalties)</span>
                <strong className="ap-fin-val" style={{color:'#f59e0b'}}>
                  - R$ {(safeNum(stats.financials?.serverFeesTotal) + safeNum(stats.financials?.royaltiesTotal)).toFixed(2)}
                </strong>
                <small className="ap-fin-sub">R$ 0,10 servidor + R$ 0,30 royalties / corrida</small>
              </div>

              <div className="ap-fin-card vibrant">
                <span className="ap-fin-label">Lucro Líquido do App</span>
                <strong className="ap-fin-val" style={{color:'#00E676'}}>
                  R$ {safeNum(stats.financials?.netProfit).toFixed(2)}
                </strong>
                <small className="ap-fin-sub">
                  Margem real (R$ {safeNum(stats.financials?.unitNetProfit || 1.01).toFixed(2)} líquido por corrida)
                </small>
              </div>
            </div>

            <div className="ap-fin-detail">
              <h3>📊 Detalhamento Contábil & Fiscal</h3>
              <div className="ap-fin-row"><span>Total de Corridas Faturadas (Concluídas)</span><strong>{stats.completedRidesCount || stats.totalRides || 0} corridas</strong></div>
              <div className="ap-fin-row"><span>Volume Total Transacionado (GMV pago aos Motoristas)</span><strong>R$ {safeNum(stats.financials?.grossRevenue).toFixed(2)}</strong></div>
              <div className="ap-fin-row"><span>Ticket Médio por Corrida</span><strong>R$ {stats.totalRides ? (safeNum(stats.financials?.grossRevenue) / stats.totalRides).toFixed(2) : '0.00'}</strong></div>
              <div className="ap-fin-row"><span>Valor de Venda por Crédito / Corrida</span><strong style={{color:'#00E676'}}>R$ {safeNum(stats.financials?.pricePerCredit || 1.50).toFixed(2)}</strong></div>
              <div className="ap-fin-row"><span>Valor Total da Venda de Créditos (Faturamento Bruto)</span><strong style={{color:'#00E676'}}>R$ {safeNum(stats.financials?.creditSalesTotal).toFixed(2)}</strong></div>
              <div className="ap-fin-row"><span>Imposto DAS Simples Nacional (6% sobre Venda de Créditos)</span><strong style={{color:'#f87171'}}>- R$ {safeNum(stats.financials?.taxes).toFixed(2)}</strong></div>
              <div className="ap-fin-row"><span>Taxa de Servidor & Cloud Fixa (R$ 0,10 por corrida)</span><strong style={{color:'#f59e0b'}}>- R$ {safeNum(stats.financials?.serverFeesTotal).toFixed(2)}</strong></div>
              <div className="ap-fin-row"><span>Custo de Royalties Distribuídos (R$ 0,30 por corrida)</span><strong style={{color:'#f59e0b'}}>- R$ {safeNum(stats.financials?.royaltiesTotal).toFixed(2)}</strong></div>
              <div className="ap-fin-row" style={{background:'rgba(0,230,118,0.06)', padding:'14px 12px', borderRadius:'10px', marginTop:'6px'}}>
                <span style={{color:'#fff', fontWeight:700}}>Lucro Líquido Real da Plataforma</span>
                <strong style={{color:'#00E676', fontSize:'1.15rem'}}>R$ {safeNum(stats.financials?.netProfit).toFixed(2)} <span style={{fontSize:'0.75rem', color:'#a7f3d0', fontWeight:600}}>(R$ {safeNum(stats.financials?.unitNetProfit || 1.01).toFixed(2)} / corrida)</span></strong>
              </div>
            </div>
          </div>
        )}

        {/* ── OPERAÇÕES ── */}
        {tab === 'Operações' && (
          <div className="ap-operations">
            <div className="ap-filters-bar">
              <input
                className="ap-search"
                placeholder="🔍 Buscar por passageiro, motorista, origem, destino..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select className="ap-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="ALL">Todos os Status</option>
                <option value="PENDING">Pendentes</option>
                <option value="ACCEPTED">Em Andamento (Aceitas)</option>
                <option value="COMPLETED">Concluídas</option>
                <option value="CANCELLED">Canceladas</option>
              </select>
            </div>

            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Passageiro</th>
                    <th>Motorista</th>
                    <th>Veículo</th>
                    <th>Valor</th>
                    <th>Distância</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperations.map(r => (
                    <tr key={r.id}>
                      <td>{new Date(r.createdAt).toLocaleString('pt-BR')}</td>
                      <td><strong>{r.passengerName || 'Passageiro'}</strong></td>
                      <td>{r.driverName ? <span>🚗 {r.driverName}</span> : <span style={{color:'#f59e0b'}}>Aguardando...</span>}</td>
                      <td>{r.vehicleType === 'moto' ? '🏍️ Moto' : '🚗 Carro'}</td>
                      <td><strong style={{color:'#00E676'}}>R$ {safeNum(r.price).toFixed(2)}</strong></td>
                      <td>{safeNum(r.distanceKm).toFixed(1)} km</td>
                      <td><span className={`ap-status ap-status-${(r.status || '').toLowerCase()}`}>{r.status}</span></td>
                      <td>
                        <button className="ap-btn-sm ap-btn-blue" onClick={() => setSelectedRide(r)}>Detalhes</button>
                        {(r.status === 'PENDING' || r.status === 'ACCEPTED') && (
                          <button className="ap-btn-sm ap-btn-danger" style={{marginLeft:6}} onClick={() => handleCancelRide(r.id)}>
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredOperations.length === 0 && (
                    <tr><td colSpan="8" className="ap-table-empty">Nenhuma operação encontrada com os filtros selecionados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MOTORISTAS & PRÉ-CADASTROS ── */}
        {tab === 'Motoristas' && (
          <div>
            <div className="ap-filters-bar" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <input
                className="ap-search"
                placeholder="🔍 Buscar por nome, e-mail, telefone, modelo ou placa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ minWidth: '240px', flex: 1 }}
              />

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className={`ap-btn-sm ${statusFilter === 'ALL' ? 'ap-btn-primary' : 'ap-btn-secondary'}`}
                  onClick={() => setStatusFilter('ALL')}
                >
                  Todos ({drivers.length})
                </button>
                <button
                  className={`ap-btn-sm ${statusFilter === 'PENDING' ? 'ap-btn-primary' : 'ap-btn-secondary'}`}
                  onClick={() => setStatusFilter('PENDING')}
                  style={pendingDriversCount > 0 ? { border: '1.5px solid #f59e0b', color: statusFilter === 'PENDING' ? '#000' : '#f59e0b' } : {}}
                >
                  ⏳ Pré-Cadastros Pendentes ({pendingDriversCount})
                </button>
                <button
                  className={`ap-btn-sm ${statusFilter === 'ACTIVE' ? 'ap-btn-primary' : 'ap-btn-secondary'}`}
                  onClick={() => setStatusFilter('ACTIVE')}
                >
                  ✅ Aprovados ({approvedDriversCount})
                </button>
                <button
                  className={`ap-btn-sm ${statusFilter === 'SUSPENDED' ? 'ap-btn-primary' : 'ap-btn-secondary'}`}
                  onClick={() => setStatusFilter('SUSPENDED')}
                >
                  ⛔ Suspensos ({drivers.filter(d => !d.isApproved).length})
                </button>
              </div>
            </div>

            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Motorista</th>
                    <th>Contato</th>
                    <th>Tipo / Veículo / Placa</th>
                    <th>Créditos</th>
                    <th>Saldo Royalties</th>
                    <th>Status de Aprovação</th>
                    <th>Ações de Credenciamento</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map(d => (
                    <tr key={d.id} style={!d.isApproved ? { background: 'rgba(245, 158, 11, 0.04)' } : {}}>
                      <td>
                        <strong>{d.name}</strong>
                        <div style={{fontSize:'0.75rem',color:'#71717a'}}>{d.email}</div>
                        <div style={{fontSize:'0.70rem',color:'#94a3b8'}}>Cadastrado em {new Date(d.createdAt).toLocaleDateString('pt-BR')}</div>
                      </td>
                      <td>
                        <div>{d.phone || '—'}</div>
                        {d.pixKey && <div style={{fontSize:'0.72rem',color:'#00E676'}}>PIX: {d.pixKey}</div>}
                      </td>
                      <td>
                        <div>{d.vehicleType === 'moto' ? '🏍️ Moto' : '🚗 Carro'}</div>
                        <strong>{d.carModel || 'Não informado'}</strong>
                        {d.carPlate && <div style={{fontSize:'0.75rem',color:'#94a3b8'}}>{d.carPlate} ({d.carColor || 'Cor —'})</div>}
                      </td>
                      <td><strong style={{color:'#3b82f6'}}>{safeNum(d.credits)}</strong></td>
                      <td><strong style={{color:'#00E676'}}>R$ {safeNum(d.balance).toFixed(2)}</strong></td>
                      <td>
                        {d.isApproved ? (
                          <span className="ap-badge ap-badge-green">✅ Aprovado para Estreia</span>
                        ) : (
                          <span className="ap-badge ap-badge-orange" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid #f59e0b' }}>
                            ⏳ Pré-Cadastro Pendente
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button className="ap-btn-sm ap-btn-blue" onClick={() => setSelectedDriver(d)}>
                            Ver Docs
                          </button>
                          
                          {!d.isApproved ? (
                            <button
                              className="ap-btn-sm ap-btn-success"
                              onClick={() => approveDriver(d.id, true)}
                              style={{ fontWeight: 800 }}
                            >
                              ✓ Aprovar Pré-Cadastro
                            </button>
                          ) : (
                            <button
                              className="ap-btn-sm ap-btn-danger"
                              onClick={() => approveDriver(d.id, false)}
                            >
                              Suspender
                            </button>
                          )}

                          <button
                            className="ap-btn-sm ap-btn-primary"
                            onClick={() => setCreditsModal(d)}
                          >
                            + Créditos
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredDrivers.length === 0 && (
                    <tr><td colSpan="7" className="ap-table-empty">Nenhum motorista encontrado com os filtros atuais.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PASSAGEIROS ── */}
        {tab === 'Passageiros' && (
          <div>
            <div className="ap-filters-bar">
              <input
                className="ap-search"
                placeholder="🔍 Buscar por nome, e-mail, telefone ou motorista vinculado..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Nome do Passageiro</th>
                    <th>E-mail</th>
                    <th>Telefone</th>
                    <th>Motorista Indicador (Vínculo)</th>
                    <th>Corridas Feitas</th>
                    <th>Data Cadastro</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPassengers.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.email}</td>
                      <td>{p.phone || '—'}</td>
                      <td>
                        {p.linkedDriverName ? (
                          <span style={{color:'#00E676',fontWeight:700}}>🚗 {p.linkedDriverName}</span>
                        ) : (
                          <span style={{color:'#71717a'}}>Orgânico (Sem vínculo)</span>
                        )}
                      </td>
                      <td><strong>{safeNum(p.ridesCompleted)}</strong></td>
                      <td>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <button className="ap-btn-sm ap-btn-blue" onClick={() => setSelectedPassenger(p)}>Detalhes</button>
                      </td>
                    </tr>
                  ))}
                  {filteredPassengers.length === 0 && (
                    <tr><td colSpan="7" className="ap-table-empty">Nenhum passageiro encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SUPORTE (CHAT & CHAMADOS EM TEMPO REAL) ── */}
        {tab === 'Suporte' && (
          <div className="ap-support-area" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', minHeight: '680px' }}>
            {/* COLUNA ESQUERDA: LISTA DE TICKETS */}
            <div style={{ background: '#0d121c', border: '1.5px solid #1f293d', borderRadius: '18px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 800 }}>
                  Chamados ({supportTickets.length})
                </h3>
                <button
                  onClick={load}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #1f293d', color: '#9ca3af', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  ↻ Atualizar
                </button>
              </div>

              {/* Filtros de Status */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                {['ALL', 'OPEN', 'RESOLVED'].map(st => (
                  <button
                    key={st}
                    onClick={() => setSupportFilter(st)}
                    style={{
                      flex: 1,
                      padding: '6px 4px',
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: supportFilter === st ? '1.5px solid #00E676' : '1px solid #1f293d',
                      background: supportFilter === st ? 'rgba(0,230,118,0.12)' : 'transparent',
                      color: supportFilter === st ? '#00E676' : '#9ca3af'
                    }}
                  >
                    {st === 'ALL' ? 'Todos' : st === 'OPEN' ? 'Abertos 🔴' : 'Resolvidos 🟢'}
                  </button>
                ))}
              </div>

              {/* Lista dos Chamados */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '580px', paddingRight: '4px' }}>
                {supportTickets
                  .filter(t => {
                    if (supportFilter === 'OPEN') return t.status !== 'RESOLVED';
                    if (supportFilter === 'RESOLVED') return t.status === 'RESOLVED';
                    return true;
                  })
                  .map(t => {
                    const isSelected = activeSupportTicket?.id === t.id;
                    const isDriver = t.userRole === 'DRIVER';
                    const isResolved = t.status === 'RESOLVED';

                    return (
                      <div
                        key={t.id}
                        onClick={() => setActiveSupportTicket(t)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '14px',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(0,230,118,0.08)' : 'rgba(255,255,255,0.02)',
                          border: isSelected ? '1.5px solid #00E676' : '1px solid #1f293d',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            padding: '2px 8px',
                            borderRadius: '100px',
                            background: isDriver ? 'rgba(0,230,118,0.15)' : 'rgba(59,130,246,0.15)',
                            color: isDriver ? '#00E676' : '#60a5fa',
                            border: `1px solid ${isDriver ? 'rgba(0,230,118,0.3)' : 'rgba(59,130,246,0.3)'}`
                          }}>
                            {isDriver ? '🚗 MOTORISTA' : '👤 PASSAGEIRO'}
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: isResolved ? '#10b981' : '#f59e0b'
                          }}>
                            {isResolved ? '✓ Resolvido' : '● Aberto'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>
                          {t.userName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#00E676', fontWeight: 700, marginBottom: '4px' }}>
                          [{t.category}] {t.subject}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.message}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '6px', textAlign: 'right' }}>
                          {new Date(t.updatedAt || t.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    );
                  })}
                {supportTickets.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 10px', fontSize: '0.85rem' }}>
                    Nenhum chamado de suporte aberto até o momento.
                  </div>
                )}
              </div>
            </div>

            {/* COLUNA DIREITA: JANELA DO CHAT AO VIVO */}
            {activeSupportTicket ? (
              <div style={{ background: '#0d121c', border: '1.5px solid #1f293d', borderRadius: '18px', display: 'flex', flexDirection: 'column', height: '680px' }}>
                {/* Header do Chat */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #1f293d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: activeSupportTicket.userRole === 'DRIVER' ? '#00E676' : '#3b82f6',
                      color: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.1rem'
                    }}>
                      {activeSupportTicket.userRole === 'DRIVER' ? '🚗' : '👤'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 800 }}>
                          {activeSupportTicket.userName}
                        </h4>
                        <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>({activeSupportTicket.userEmail})</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#00E676', fontWeight: 700 }}>
                        Protocolo: #{activeSupportTicket.id.substring(0, 8).toUpperCase()} • Categoria: {activeSupportTicket.category}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {activeSupportTicket.status !== 'RESOLVED' ? (
                      <button
                        onClick={() => handleUpdateTicketStatus('RESOLVED')}
                        style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', padding: '6px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        ✓ Marcar como Resolvido
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateTicketStatus('OPEN')}
                        style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', color: '#f59e0b', padding: '6px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        ↺ Reabrir Chamado
                      </button>
                    )}
                  </div>
                </div>

                {/* Histórico das Mensagens */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {supportMessages.map((msg, idx) => {
                    const isSupport = msg.senderRole === 'SUPPORT' || msg.senderName?.includes('Suporte');
                    return (
                      <div
                        key={msg.id || idx}
                        style={{
                          alignSelf: isSupport ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isSupport ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: isSupport ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isSupport ? 'linear-gradient(135deg, #059669, #00E676)' : '#1a2333',
                          color: isSupport ? '#000' : '#f8fafc',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          lineHeight: 1.45,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 900, marginBottom: '4px', opacity: isSupport ? 0.8 : 0.6 }}>
                            {isSupport ? '🛡️ Equipe Zomp (Você)' : activeSupportTicket.userName}
                          </div>
                          {msg.text}
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    );
                  })}
                  {supportMessages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '60px 20px' }}>
                      Nenhuma mensagem trocada neste chamado ainda.
                    </div>
                  )}
                </div>

                {/* Respostas Rápidas */}
                <div style={{ padding: '8px 16px', borderTop: '1px solid #1f293d', background: 'rgba(255,255,255,0.01)', display: 'flex', gap: '6px', overflowX: 'auto' }}>
                  {[
                    'Olá! Recebemos sua mensagem e já estamos verificando.',
                    'Seu cadastro foi validado com sucesso! Seja bem-vindo à Zomp.',
                    'Créditos concedidos em sua conta. Pode verificar na sua carteira.',
                    'Chamado resolvido com sucesso! Qualquer dúvida conte conosco.'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendAdminReply(preset)}
                      style={{
                        whiteSpace: 'nowrap',
                        padding: '6px 12px',
                        borderRadius: '100px',
                        border: '1px solid #27272a',
                        background: '#111827',
                        color: '#cbd5e1',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ {preset}
                    </button>
                  ))}
                </div>

                {/* Caixa de Texto & Envio */}
                <div style={{ padding: '14px 18px', borderTop: '1px solid #1f293d', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={adminReplyText}
                    onChange={(e) => setAdminReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendAdminReply();
                    }}
                    placeholder="Digite sua resposta para o usuário..."
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #27272a',
                      background: '#111827',
                      color: '#fff',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                  <button
                    disabled={isSendingReply || !adminReplyText.trim()}
                    onClick={() => handleSendAdminReply()}
                    style={{
                      background: adminReplyText.trim() ? '#00E676' : '#27272a',
                      color: adminReplyText.trim() ? '#000' : '#71717a',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      fontWeight: 900,
                      fontSize: '0.9rem',
                      cursor: adminReplyText.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isSendingReply ? 'Enviando...' : '➤ Enviar'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: '#0d121c', border: '1.5px solid #1f293d', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.95rem' }}>
                👈 Selecione um chamado na lista ao lado para abrir o chat ao vivo.
              </div>
            )}
          </div>
        )}

        {/* ── CONFIGURAÇÕES ── */}
        {tab === 'Configurações' && config && (
          <div className="ap-config-area">
            <div className="ap-config-header">
              <div>
                <h3>Configurações Globais do Zomp</h3>
                <p style={{color:'#71717a',fontSize:'0.85rem'}}>Altere preços por km, regras de fidelidade, limites e parâmetros do sistema em tempo real.</p>
              </div>
              <button className="ap-btn ap-btn-primary" onClick={saveConfig}>💾 Salvar Todas as Alterações</button>
            </div>

            {/* CHAVE MASTER: LIBERAÇÃO DO MODO ONLINE / ESTREIA */}
            <div style={{
              background: config?.isAppLive 
                ? 'linear-gradient(135deg, rgba(0, 230, 118, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)' 
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.2) 100%)',
              border: config?.isAppLive ? '2px solid #00E676' : '2px solid #f59e0b',
              borderRadius: '20px',
              padding: '22px 24px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: config?.isAppLive ? '0 8px 30px rgba(0, 230, 118, 0.25)' : '0 8px 30px rgba(245, 158, 11, 0.15)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.6rem' }}>{config?.isAppLive ? '🟢' : '🔒'}</span>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: 900 }}>
                    Chave Geral: Permitir Motoristas Ficarem Online
                  </h3>
                  <span style={{
                    background: config?.isAppLive ? '#00E676' : '#f59e0b',
                    color: '#000',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {config?.isAppLive ? '● ONLINE LIBERADO (AO VIVO)' : '● BLOQUEADO (PRÉ-CADASTRO)'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', maxWidth: '720px', lineHeight: '1.5' }}>
                  {config?.isAppLive 
                    ? '✓ Os motoristas podem deslizar / clicar em "Ficar Online" e receber solicitações de corridas dos passageiros em tempo real.'
                    : `⚠️ Modo Pré-Cadastro ativo: Todos os motoristas que tentarem ficar online verão o aviso oficial: "Aguarde nossa estreia em ${config?.launchDate ? new Date(config.launchDate + 'T12:00:00').toLocaleDateString('pt-BR') : '01/11/2026'}. Enquanto isso, faça um tour pelo app para conhecer e indicar para outros motoristas parceiros."`}
                </p>
              </div>

              {/* Botão Slide / Toggle Master */}
              <button
                type="button"
                onClick={toggleAppLaunch}
                style={{
                  background: config?.isAppLive 
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                    : 'linear-gradient(135deg, #00E676, #00C853)',
                  color: config?.isAppLive ? '#fff' : '#000',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  padding: '14px 24px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease'
                }}
              >
                <span>{config?.isAppLive ? '🔒 Bloquear Modo Online (Pré-Cadastro)' : '🚀 LIGAR CHAVE: Liberar Modo Online'}</span>
              </button>
            </div>

            {configGroups.map((group, gi) => (
              <div key={gi} className="ap-config-section">
                <h4 className="ap-config-section-title">{group.title}</h4>
                <div className="ap-config-grid">
                  {group.fields.map(f => (
                    <div key={f.key} className="ap-form-group">
                      <label>{f.label}</label>
                      <input
                        type={f.type}
                        step={f.step || 'any'}
                        value={config[f.key] ?? ''}
                        onChange={e => setConfig({ ...config, [f.key]: e.target.value })}
                        placeholder={f.prefix || ''}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{marginTop:'24px',textAlign:'right'}}>
              <button className="ap-btn ap-btn-primary" onClick={saveConfig}>💾 Salvar Todas as Alterações</button>
            </div>
          </div>
        )}

        {/* ── FUNDO DE ROYALTIES ── */}
        {tab === 'Fundo' && fund && (
          <div className="ap-fund-area">
            <div className="ap-fund-total">
              <span className="ap-fund-label">Saldo Total do Fundo de Dividendos</span>
              <strong className="ap-fund-val">R$ {safeNum(fund.total).toFixed(2)}</strong>
              <span className="ap-fund-sub">{safeNum(fund.driverCount)} motoristas ativos acumulando royalties de suas redes</span>
            </div>

            {fund.topDrivers && fund.topDrivers.length > 0 && (
              <div className="ap-table-wrap">
                <div style={{padding:'20px 24px',borderBottom:'1px solid #27272a'}}>
                  <h3>🏆 Ranking: Top Motoristas por Saldo de Royalties</h3>
                </div>
                <table className="ap-table">
                  <thead>
                    <tr>
                      <th>Posição</th>
                      <th>Nome do Motorista</th>
                      <th>Saldo Atual Acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fund.topDrivers.map((d, i) => (
                      <tr key={i}>
                        <td><strong>#{i + 1}</strong></td>
                        <td><strong>{d.name}</strong></td>
                        <td><strong style={{color:'#00E676',fontSize:'1.1rem'}}>R$ {safeNum(d.balance).toFixed(2)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── SAQUES ── */}
        {tab === 'Saques' && (
          <div className="ap-withdrawals">
            <div className="ap-filters-bar">
              <input
                className="ap-search"
                placeholder="🔍 Buscar por motorista, e-mail ou chave PIX..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select className="ap-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="ALL">Todos os Saques</option>
                <option value="PENDING">Apenas Pendentes</option>
                <option value="APPROVED">Aprovados</option>
                <option value="REJECTED">Rejeitados</option>
              </select>
            </div>

            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Motorista</th>
                    <th>E-mail</th>
                    <th>Chave PIX</th>
                    <th>Valor do Saque</th>
                    <th>Status</th>
                    <th>Data Solicitação</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWithdrawals.map(w => (
                    <tr key={w.id}>
                      <td><strong>{w.userName || '—'}</strong></td>
                      <td>{w.userEmail || '—'}</td>
                      <td><code style={{color:'#00E676',background:'#1f2937',padding:'3px 8px',borderRadius:6}}>{w.pixKey || '—'}</code></td>
                      <td><strong style={{color:'#fff',fontSize:'1.05rem'}}>R$ {safeNum(w.amount).toFixed(2)}</strong></td>
                      <td><span className={`ap-status ap-status-${(w.status || 'pending').toLowerCase()}`}>{w.status || 'PENDING'}</span></td>
                      <td>{new Date(w.createdAt).toLocaleString('pt-BR')}</td>
                      <td>
                        {w.status === 'PENDING' && (
                          <div style={{display:'flex',gap:'6px'}}>
                            <button className="ap-btn-sm ap-btn-success" onClick={() => handleWithdrawalAction(w.id, 'APPROVED')}>
                              ✓ Aprovar PIX
                            </button>
                            <button className="ap-btn-sm ap-btn-danger" onClick={() => handleWithdrawalAction(w.id, 'REJECTED')}>
                              ✕ Rejeitar & Estornar
                            </button>
                          </div>
                        )}
                        {w.status !== 'PENDING' && (
                          <span style={{color:'#71717a',fontSize:'0.8rem'}}>Processado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredWithdrawals.length === 0 && (
                    <tr><td colSpan="7" className="ap-table-empty">Nenhuma solicitação de saque encontrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DOCUMENTAÇÃO ── */}
        {tab === 'Documentação' && (
          <div className="ap-docs">
            <h2>📖 Manual Operacional e Regras do Zomp</h2>
            <div className="ap-docs-grid">
              <div className="ap-doc-card">
                <h3>🚗 1. Motoristas & Aprovação</h3>
                <p>O cadastro de motoristas requer validação da CNH e CRLV do veículo. No painel de motoristas, clique em "Ver" para inspecionar os documentos em alta definição antes de aprovar.</p>
              </div>
              <div className="ap-doc-card">
                <h3>💎 2. Sistema de Royalties (R$ 0,30)</h3>
                <p>Sempre que um passageiro vinculado a um motorista completa uma corrida, o sistema credita automaticamente R$ 0,30 na carteira de royalties do motorista indicador.</p>
              </div>
              <div className="ap-doc-card">
                <h3>💳 3. Solicitações de Saque (PIX)</h3>
                <p>Os motoristas solicitam o resgate de royalties diretamente no aplicativo. Na aba "Saques", você pode aprovar a transferência ou rejeitar (o que devolve o saldo automaticamente ao motorista).</p>
              </div>
              <div className="ap-doc-card">
                <h3>⚙️ 4. Gestão de Tarifas e KM</h3>
                <p>As tarifas por KM e valores mínimos para Carro e Moto podem ser alterados em tempo real na aba "Configurações", sem necessidade de reiniciar servidores.</p>
              </div>
              <div className="ap-doc-card">
                <h3>📡 5. Monitoramento de Operações</h3>
                <p>A aba de operações atualiza a cada 8 segundos para mostrar corridas solicitadas, motoristas alocados, valores cobrados e rotas percorridas.</p>
              </div>
              <div className="ap-doc-card">
                <h3>🛡️ 6. Preço Imbatível</h3>
                <p>A plataforma valida capturas de tela dos concorrentes (Uber/99) e aplica descontos progressivos automáticos de R$ 2,00 a R$ 3,00 para garantir a preferência do passageiro.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL DE DETALHES DO MOTORISTA ── */}
        {selectedDriver && (
          <div className="ap-modal-overlay" onClick={() => setSelectedDriver(null)}>
            <div className="ap-modal" onClick={e => e.stopPropagation()}>
              <div className="ap-modal-header">
                <h2>{selectedDriver.name}</h2>
                <button className="ap-modal-close" onClick={() => setSelectedDriver(null)}>×</button>
              </div>
              <div className="ap-modal-content">
                <div className="ap-driver-info-grid">
                  <div className="ap-info-item"><span className="ap-info-lbl">E-mail</span><span className="ap-info-val">{selectedDriver.email}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Telefone</span><span className="ap-info-val">{selectedDriver.phone || '—'}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Chave PIX</span><span className="ap-info-val">{selectedDriver.pixKey || '—'}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Veículo</span><span className="ap-info-val">{selectedDriver.carModel || '—'} ({selectedDriver.carColor || '—'})</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Placa</span><span className="ap-info-val">{selectedDriver.carPlate || '—'}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Código QR / Indicação</span><span className="ap-info-val">{selectedDriver.qrCode || '—'}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Créditos Ativos</span><span className="ap-info-val" style={{color:'#3b82f6',fontWeight:800}}>{safeNum(selectedDriver.credits)}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Saldo Royalties</span><span className="ap-info-val" style={{color:'#00E676',fontWeight:800}}>R$ {safeNum(selectedDriver.balance).toFixed(2)}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Avaliação Média</span><span className="ap-info-val">⭐ {safeNum(selectedDriver.rating, 5).toFixed(1)}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Corridas Aceitas</span><span className="ap-info-val">{safeNum(selectedDriver.ridesAccepted)}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Corridas Perdidas</span><span className="ap-info-val">{safeNum(selectedDriver.ridesMissed)}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Corridas Concluídas</span><span className="ap-info-val">{safeNum(selectedDriver.ridesCompleted)}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Passageiros Vinculados</span><span className="ap-info-val" style={{color:'#00E676',fontWeight:800}}>{safeNum(selectedDriver.linkedPassengers)} clientes</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Status Atual</span><span className="ap-info-val">{selectedDriver.isApproved ? '✅ Aprovado e Ativo' : '⛔ Suspenso'}</span></div>
                </div>

                {(selectedDriver.photo || selectedDriver.cnh || selectedDriver.crlv) && (
                  <div className="ap-docs-section">
                    <h4>Documentação & Fotos Enviadas</h4>
                    <div className="ap-docs-grid">
                      {selectedDriver.photo && (
                        <div className="ap-img-box" onClick={() => window.open(selectedDriver.photo, '_blank')}>
                          <span>Foto de Perfil (Toque para expandir)</span>
                          <img src={selectedDriver.photo} alt="Foto de Perfil" />
                        </div>
                      )}
                      {selectedDriver.cnh && (
                        <div className="ap-img-box" onClick={() => window.open(selectedDriver.cnh, '_blank')}>
                          <span>CNH (Toque para expandir)</span>
                          <img src={selectedDriver.cnh} alt="CNH" />
                        </div>
                      )}
                      {selectedDriver.crlv && (
                        <div className="ap-img-box" onClick={() => window.open(selectedDriver.crlv, '_blank')}>
                          <span>CRLV (Toque para expandir)</span>
                          <img src={selectedDriver.crlv} alt="CRLV" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="ap-driver-actions">
                  <button className="ap-btn ap-btn-primary" onClick={() => { setCreditsModal(selectedDriver); setSelectedDriver(null) }}>
                    + Adicionar Créditos
                  </button>
                  <button className="ap-btn ap-btn-secondary" onClick={() => handleResetStats(selectedDriver.id)}>
                    Resetar Estatísticas
                  </button>
                  <button
                    className={`ap-btn ${selectedDriver.isApproved ? 'ap-btn-danger' : 'ap-btn-success'}`}
                    onClick={() => { approveDriver(selectedDriver.id, !selectedDriver.isApproved); setSelectedDriver(null) }}
                    style={{ fontWeight: 800 }}
                  >
                    {selectedDriver.isApproved ? '⛔ Suspender Motorista' : '✓ Aprovar Pré-Cadastro (Liberar p/ Estreia)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL DE DETALHES DO PASSAGEIRO ── */}
        {selectedPassenger && (
          <div className="ap-modal-overlay" onClick={() => setSelectedPassenger(null)}>
            <div className="ap-modal" onClick={e => e.stopPropagation()}>
              <div className="ap-modal-header">
                <h2>{selectedPassenger.name} (Passageiro)</h2>
                <button className="ap-modal-close" onClick={() => setSelectedPassenger(null)}>×</button>
              </div>
              <div className="ap-modal-content">
                <div className="ap-driver-info-grid">
                  <div className="ap-info-item"><span className="ap-info-lbl">E-mail</span><span className="ap-info-val">{selectedPassenger.email}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Telefone</span><span className="ap-info-val">{selectedPassenger.phone || '—'}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Motorista Indicador</span><span className="ap-info-val" style={{color:'#00E676',fontWeight:700}}>{selectedPassenger.linkedDriverName || 'Orgânico'}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Corridas Concluídas</span><span className="ap-info-val">{safeNum(selectedPassenger.ridesCompleted)}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Data de Cadastro</span><span className="ap-info-val">{new Date(selectedPassenger.createdAt).toLocaleDateString('pt-BR')}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL DE CORRIDA ── */}
        {selectedRide && (
          <div className="ap-modal-overlay" onClick={() => setSelectedRide(null)}>
            <div className="ap-modal" onClick={e => e.stopPropagation()}>
              <div className="ap-modal-header">
                <h2>Corrida #{selectedRide.id?.slice(0,8)}</h2>
                <button className="ap-modal-close" onClick={() => setSelectedRide(null)}>×</button>
              </div>
              <div className="ap-modal-content">
                <div className="ap-driver-info-grid">
                  <div className="ap-info-item"><span className="ap-info-lbl">Passageiro</span><span className="ap-info-val">{selectedRide.passengerName || '—'}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Motorista</span><span className="ap-info-val">{selectedRide.driverName || 'Aguardando...'}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Origem</span><span className="ap-info-val">{selectedRide.origin || '—'}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Destino</span><span className="ap-info-val">{selectedRide.destination || '—'}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Distância</span><span className="ap-info-val">{safeNum(selectedRide.distanceKm).toFixed(1)} km</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Veículo</span><span className="ap-info-val">{selectedRide.vehicleType === 'moto' ? '🏍️ Moto' : '🚗 Carro'}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Valor Cobrado</span><span className="ap-info-val" style={{color:'#00E676',fontSize:'1.3rem',fontWeight:800}}>R$ {safeNum(selectedRide.price).toFixed(2)}</span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Status</span><span className="ap-info-val"><span className={`ap-status ap-status-${(selectedRide.status || '').toLowerCase()}`}>{selectedRide.status}</span></span></div>
                  <div className="ap-info-item"><span className="ap-info-lbl">Data e Hora</span><span className="ap-info-val">{new Date(selectedRide.createdAt).toLocaleString('pt-BR')}</span></div>
                </div>

                {(selectedRide.status === 'PENDING' || selectedRide.status === 'ACCEPTED') && (
                  <div style={{marginTop:'20px',textAlign:'right'}}>
                    <button className="ap-btn ap-btn-danger" onClick={() => handleCancelRide(selectedRide.id)}>
                      ✕ Cancelar Esta Corrida
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL DE ADICIONAR CRÉDITOS ── */}
        {creditsModal && (
          <div className="ap-modal-overlay" onClick={() => { setCreditsModal(null); setCreditsAmount('') }}>
            <div className="ap-modal" onClick={e => e.stopPropagation()}>
              <div className="ap-modal-header">
                <h2>Adicionar Créditos — {creditsModal.name}</h2>
                <button className="ap-modal-close" onClick={() => { setCreditsModal(null); setCreditsAmount('') }}>×</button>
              </div>
              <div className="ap-modal-content">
                <p style={{marginBottom:'16px',color:'#a1a1aa'}}>
                  Créditos atuais do motorista: <strong style={{color:'#fff',fontSize:'1.1rem'}}>{safeNum(creditsModal.credits)}</strong>
                </p>
                <div className="ap-form-group">
                  <label>Quantidade de Créditos a Inserir</label>
                  <input
                    type="number"
                    value={creditsAmount}
                    onChange={e => setCreditsAmount(e.target.value)}
                    placeholder="Ex: 50 ou 100"
                    autoFocus
                  />
                </div>
                <div style={{display:'flex',gap:'10px',marginTop:'20px',justifyContent:'flex-end'}}>
                  <button className="ap-btn ap-btn-secondary" onClick={() => { setCreditsModal(null); setCreditsAmount('') }}>Cancelar</button>
                  <button className="ap-btn ap-btn-primary" onClick={handleAddCredits}>✓ Confirmar Créditos</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
