import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminPanel.css'

const API = import.meta.env.VITE_API_URL || 'https://zomp-api.onrender.com/api'

function api(path, opts = {}) {
  const token = localStorage.getItem('zomp_token')
  return fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...opts
  }).then(r => r.json())
}

function safeNum(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const tabs = ['Dashboard', 'Financeiro', 'Operações', 'Motoristas', 'Passageiros', 'Configurações', 'Fundo', 'Saques', 'Documentação']

export default function AdminPanel() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('Dashboard')
  const [stats, setStats] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [passengers, setPassengers] = useState([])
  const [operations, setOperations] = useState(null)
  const [config, setConfig] = useState(null)
  const [fund, setFund] = useState(null)
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedDriver, setSelectedDriver] = useState(null)
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
        const s = await api('/admin/stats')
        setStats(s)
        setOperations(await api('/admin/operations'))
      }
      if (tab === 'Financeiro') setStats(await api('/admin/stats'))
      if (tab === 'Operações') setOperations(await api('/admin/operations'))
      if (tab === 'Motoristas') setDrivers(await api('/admin/drivers'))
      if (tab === 'Passageiros') setPassengers(await api('/admin/passengers'))
      if (tab === 'Configurações') setConfig(await api('/admin/config'))
      if (tab === 'Fundo') setFund(await api('/admin/royalty-fund'))
      if (tab === 'Saques') setWithdrawals(await api('/admin/withdrawals'))
    } catch { showToast('Erro ao carregar dados', 'error') }
    setLoading(false)
  }, [tab])

  useEffect(() => {
    const initialLoad = setTimeout(load, 0)
    let interval
    if (tab === 'Operações' || tab === 'Dashboard') {
      interval = setInterval(load, 10000)
    }
    return () => {
      clearTimeout(initialLoad)
      clearInterval(interval)
    }
  }, [load, tab])

  const approveDriver = async (id, val) => {
    const r = await api(`/admin/users/${id}/approve`, { method: 'PUT', body: JSON.stringify({ isApproved: val }) })
    if (r.error) return showToast(r.error, 'error')
    showToast(val ? 'Motorista aprovado!' : 'Motorista suspenso')
    load()
  }

  const saveConfig = async () => {
    const r = await api('/admin/config', { method: 'PUT', body: JSON.stringify(config) })
    if (r.error) showToast(r.error, 'error')
    else showToast('Configurações salvas!')
  }

  const handleWithdrawal = async (id, status) => {
    const r = await api(`/admin/withdrawals/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })
    if (r.error) return showToast(r.error, 'error')
    showToast(status === 'APPROVED' ? 'Saque aprovado!' : 'Saque rejeitado')
    load()
  }

  const handleAddCredits = async () => {
    if (!creditsModal || !creditsAmount) return
    const r = await api(`/admin/users/${creditsModal.id}/credits`, { method: 'PUT', body: JSON.stringify({ amount: Number(creditsAmount) }) })
    if (r.error) return showToast(r.error, 'error')
    showToast(`${creditsAmount} créditos adicionados a ${creditsModal.name}!`)
    setCreditsModal(null)
    setCreditsAmount('')
    load()
  }

  const handleResetStats = async (id) => {
    const r = await api(`/admin/users/${id}/reset-stats`, { method: 'PUT' })
    if (r.error) return showToast(r.error, 'error')
    showToast('Estatísticas resetadas!')
    load()
  }

  const filteredDrivers = drivers.filter(d => d.name?.toLowerCase().includes(search.toLowerCase()) || d.email?.toLowerCase().includes(search.toLowerCase()))
  const filteredPassengers = passengers.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()))

  const configFields = [
    { key: 'pricePerKmCar', label: 'Preço por KM (Carro)', type: 'number', prefix: 'R$' },
    { key: 'pricePerKmMoto', label: 'Preço por KM (Moto)', type: 'number', prefix: 'R$' },
    { key: 'minFareCar', label: 'Tarifa Mínima (Carro)', type: 'number', prefix: 'R$' },
    { key: 'minFareMoto', label: 'Tarifa Mínima (Moto)', type: 'number', prefix: 'R$' },
    { key: 'royaltyPerRide', label: 'Royalty por Corrida', type: 'number', prefix: 'R$' },
    { key: 'royaltyMonthlyLimit', label: 'Limite Mensal de Royalty', type: 'number' },
    { key: 'maxPassengersPerDriver', label: 'Máx. Passageiros por Motorista', type: 'number' },
    { key: 'bindingMonthsFirst', label: 'Vínculo Inicial (meses)', type: 'number' },
    { key: 'bindingMonthsRenew', label: 'Renovação de Vínculo (meses)', type: 'number' },
    { key: 'autoSuspendMinAcceptance', label: 'Suspensão Automática (% Aceitação)', type: 'number' },
    { key: 'autoSuspendMinRating', label: 'Suspensão Automática (Avaliação Mín.)', type: 'number' },
    { key: 'pricePerCredit', label: 'Preço por Crédito', type: 'number', prefix: 'R$' },
    { key: 'launchDate', label: 'Data de Lançamento', type: 'date' },
  ]

  return (
    <div className="ap-root">
      {toast && <div className={`ap-toast ap-toast-${toast.type}`}>{toast.msg}</div>}

      <aside className="ap-sidebar">
        <div className="ap-brand">
          <img src="/logo.svg" alt="Zomp" className="ap-logo" />
          <span>Admin</span>
        </div>
        <nav className="ap-nav">
          {tabs.map(t => (
            <button key={t} className={`ap-nav-btn ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setSearch(''); setSelectedDriver(null) }}>
              {t === 'Dashboard' && '📊'} {t === 'Financeiro' && '💰'} {t === 'Operações' && '📡'}
              {t === 'Motoristas' && '🚗'} {t === 'Passageiros' && '👤'}
              {t === 'Configurações' && '⚙️'} {t === 'Fundo' && '💎'} {t === 'Saques' && '💳'}
              {t === 'Documentação' && '📖'}
              {' '}{t}
            </button>
          ))}
        </nav>
        <button className="ap-logout" onClick={() => { localStorage.clear(); navigate('/') }}>← Sair</button>
      </aside>

      <main className="ap-main">
        <div className="ap-topbar">
          <h1 className="ap-page-title">{tab}</h1>
          <div className="ap-topbar-right">
            <span className="ap-admin-badge">Sistema Live</span>
            <button className="ap-refresh" onClick={load}>↻ Atualizar</button>
          </div>
        </div>

        {loading && !operations && !stats && !drivers.length && !passengers.length && !config && !fund && !withdrawals.length && (
          <div className="ap-loading">Sincronizando dados...</div>
        )}

        {/* ── DASHBOARD ── */}
        {tab === 'Dashboard' && stats && (
          <div className="ap-dashboard">
            <div className="ap-stats-grid">
              <div className="ap-stat-card"><span className="ap-stat-val">{stats.totalDrivers}</span><span className="ap-stat-lbl">Motoristas Ativos</span></div>
              <div className="ap-stat-card"><span className="ap-stat-val">{stats.totalPassengers}</span><span className="ap-stat-lbl">Passageiros Totais</span></div>
              <div className="ap-stat-card ap-stat-blue"><span className="ap-stat-val">{stats.activeRidesCount || 0}</span><span className="ap-stat-lbl">Corridas em Tempo Real</span></div>
              <div className="ap-stat-card ap-stat-gold"><span className="ap-stat-val">R$ {safeNum(stats.royaltyFundBalance).toFixed(2)}</span><span className="ap-stat-lbl">Fundo Global</span></div>
            </div>

            <div className="ap-live-feed">
              <h3>📡 Fluxo de Operações Recentes</h3>
              {operations && operations.slice(0, 8).map(ride => (
                <div key={ride.id} className="ap-feed-item" onClick={() => setSelectedRide(ride)} style={{cursor:'pointer'}}>
                  <div className="ap-feed-icon">🚗</div>
                  <div className="ap-feed-body">
                    <strong>{ride.passengerName} → {ride.driverName || 'Aguardando...'}</strong>
                    <span>{(ride.origin || '').slice(0, 30)}...</span>
                  </div>
                  <div className="ap-feed-time">{new Date(ride.createdAt).toLocaleTimeString()}</div>
                </div>
              ))}
              {operations && operations.length === 0 && <p style={{color:'#a1a1aa',padding:'20px 0'}}>Nenhuma operação ainda.</p>}
            </div>

            <div className="ap-rules-box">
              <h3>📋 Visão Geral do Sistema</h3>
              <div className="ap-rules-grid">
                <div className="ap-rule">
                  <span className="ap-rule-icon">📈</span>
                  <div><strong>Volume de Operação</strong><p>Monitoramento ativo de {stats.totalRides} pedidos gerados na plataforma desde o início.</p></div>
                </div>
                <div className="ap-rule">
                  <span className="ap-rule-icon">🛡️</span>
                  <div><strong>Segurança de Dados</strong><p>Todos os documentos de motoristas e registros de corridas são criptografados e auditáveis.</p></div>
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
                <span className="ap-fin-label">Faturamento Bruto</span>
                <strong className="ap-fin-val">R$ {safeNum(stats.financials?.grossRevenue).toFixed(2)}</strong>
              </div>
              <div className="ap-fin-card">
                <span className="ap-fin-label">Custos (Taxas + Servidor)</span>
                <strong className="ap-fin-val" style={{color:'#ef4444'}}>- R$ {(safeNum(stats.financials?.taxes) + safeNum(stats.financials?.serverFeesTotal)).toFixed(2)}</strong>
              </div>
              <div className="ap-fin-card">
                <span className="ap-fin-label">Royalties Pagos</span>
                <strong className="ap-fin-val" style={{color:'#f59e0b'}}>- R$ {safeNum(stats.financials?.royaltiesTotal).toFixed(2)}</strong>
              </div>
              <div className="ap-fin-card vibrant">
                <span className="ap-fin-label">Lucro Líquido</span>
                <strong className="ap-fin-val">R$ {safeNum(stats.financials?.netProfit).toFixed(2)}</strong>
              </div>
            </div>
            <div className="ap-fin-detail">
              <h3>📊 Resumo Financeiro</h3>
              <div className="ap-fin-row"><span>Corridas Concluídas</span><strong>{stats.totalRides || 0}</strong></div>
              <div className="ap-fin-row"><span>Receita por Corrida (média)</span><strong>R$ {stats.totalRides ? (safeNum(stats.financials?.grossRevenue) / stats.totalRides).toFixed(2) : '0.00'}</strong></div>
              <div className="ap-fin-row"><span>Taxa de Servidor (R$ 0,10/corrida)</span><strong>R$ {safeNum(stats.financials?.serverFeesTotal).toFixed(2)}</strong></div>
              <div className="ap-fin-row"><span>Impostos Estimados (6%)</span><strong>R$ {safeNum(stats.financials?.taxes).toFixed(2)}</strong></div>
            </div>
          </div>
        )}

        {/* ── OPERAÇÕES ── */}
        {tab === 'Operações' && operations && (
          <div className="ap-operations">
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Data</th><th>Passageiro</th><th>Motorista</th><th>Valor</th><th>Distância</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {operations.map(r => (
                    <tr key={r.id}>
                      <td>{new Date(r.createdAt).toLocaleString('pt-BR')}</td>
                      <td>{r.passengerName || '—'}</td>
                      <td>{r.driverName || '—'}</td>
                      <td>R$ {safeNum(r.price).toFixed(2)}</td>
                      <td>{safeNum(r.distanceKm).toFixed(1)} km</td>
                      <td><span className={`ap-status ap-status-${(r.status || '').toLowerCase()}`}>{r.status}</span></td>
                      <td><button className="ap-btn-sm ap-btn-blue" onClick={() => setSelectedRide(r)}>Detalhes</button></td>
                    </tr>
                  ))}
                  {operations.length === 0 && <tr><td colSpan="7" style={{textAlign:'center',padding:'40px',color:'#71717a'}}>Nenhuma corrida registrada.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MOTORISTAS ── */}
        {tab === 'Motoristas' && (
          <div>
            <div className="ap-actions-row">
              <input className="ap-search" placeholder="Buscar motorista..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Motorista</th><th>Email</th><th>Veículo</th><th>Créditos</th><th>Avaliação</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {filteredDrivers.map(d => (
                    <tr key={d.id}>
                      <td>{d.name}</td>
                      <td>{d.email}</td>
                      <td>{d.carModel || '—'} {d.carPlate || ''}</td>
                      <td>{safeNum(d.credits)}</td>
                      <td>⭐ {safeNum(d.rating, 5).toFixed(1)}</td>
                      <td><span className={`ap-badge ${d.isApproved ? 'ap-badge-green' : 'ap-badge-red'}`}>{d.isApproved ? 'Ativo' : 'Suspenso'}</span></td>
                      <td>
                        <button className="ap-btn-sm ap-btn-blue" onClick={() => setSelectedDriver(d)}>Ver</button>
                        <button className={`ap-btn-sm ${d.isApproved ? 'ap-btn-danger' : 'ap-btn-success'}`} onClick={() => approveDriver(d.id, !d.isApproved)} style={{marginLeft:6}}>
                          {d.isApproved ? 'Suspender' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredDrivers.length === 0 && <tr><td colSpan="7" style={{textAlign:'center',padding:'40px',color:'#71717a'}}>Nenhum motorista encontrado.</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Modal de detalhes do motorista */}
            {selectedDriver && (
              <div className="ap-modal-overlay" onClick={() => setSelectedDriver(null)}>
                <div className="ap-modal" onClick={e => e.stopPropagation()}>
                  <div className="ap-modal-header">
                    <h2>{selectedDriver.name}</h2>
                    <button className="ap-modal-close" onClick={() => setSelectedDriver(null)}>×</button>
                  </div>
                  <div className="ap-modal-content">
                    <div className="ap-driver-info-grid">
                      <div className="ap-info-item"><span className="ap-info-lbl">Email</span><span className="ap-info-val">{selectedDriver.email}</span></div>
                      <div className="ap-info-item"><span className="ap-info-lbl">Telefone</span><span className="ap-info-val">{selectedDriver.phone || '—'}</span></div>
                      <div className="ap-info-item"><span className="ap-info-lbl">PIX</span><span className="ap-info-val">{selectedDriver.pixKey || '—'}</span></div>
                      <div className="ap-info-item"><span className="ap-info-lbl">Veículo</span><span className="ap-info-val">{selectedDriver.carModel || '—'} ({selectedDriver.carColor || '—'})</span></div>
                      <div className="ap-info-item"><span className="ap-info-lbl">Placa</span><span className="ap-info-val">{selectedDriver.carPlate || '—'}</span></div>
                      <div className="ap-info-item"><span className="ap-info-lbl">QR Code</span><span className="ap-info-val">{selectedDriver.qrCode || '—'}</span></div>
                      <div className="ap-info-item"><span className="ap-info-lbl">Créditos</span><span className="ap-info-val">{safeNum(selectedDriver.credits)}</span></div>
                      <div className="ap-info-item"><span className="ap-info-lbl">Royalties</span><span className="ap-info-val">R$ {safeNum(selectedDriver.balance).toFixed(2)}</span></div>
                      <div className="ap-info-item"><span className="ap-info-lbl">Avaliação</span><span className="ap-info-val">⭐ {safeNum(selectedDriver.rating, 5).toFixed(1)} ({safeNum(selectedDriver.totalRatings)} avaliações)</span></div>
                      <div className="ap-info-item"><span className="ap-info-lbl">Corridas Aceitas</span><span className="ap-info-val">{safeNum(selectedDriver.ridesAccepted)}</span></div>
                      <div className="ap-info-item"><span className="ap-info-lbl">Corridas Perdidas</span><span className="ap-info-val">{safeNum(selectedDriver.ridesMissed)}</span></div>
                      <div className="ap-info-item"><span className="ap-info-lbl">Corridas Concluídas</span><span className="ap-info-val">{safeNum(selectedDriver.ridesCompleted)}</span></div>
                      <div className="ap-info-item"><span className="ap-info-lbl">Passageiros Vinculados</span><span className="ap-info-val">{safeNum(selectedDriver.linkedPassengers)}</span></div>
                      <div className="ap-info-item"><span className="ap-info-lbl">Status</span><span className="ap-info-val">{selectedDriver.isApproved ? '✅ Ativo' : '⛔ Suspenso'}</span></div>
                    </div>

                    {(selectedDriver.cnh || selectedDriver.crlv) && (
                      <div className="ap-docs-section">
                        <h4>Documentos</h4>
                        <div className="ap-docs-grid">
                          {selectedDriver.cnh && (
                            <div className="ap-img-box" onClick={() => window.open(selectedDriver.cnh, '_blank')}>
                              <span>CNH</span>
                              <img src={selectedDriver.cnh} alt="CNH" />
                            </div>
                          )}
                          {selectedDriver.crlv && (
                            <div className="ap-img-box" onClick={() => window.open(selectedDriver.crlv, '_blank')}>
                              <span>CRLV</span>
                              <img src={selectedDriver.crlv} alt="CRLV" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="ap-driver-actions">
                      <button className="ap-btn ap-btn-primary" onClick={() => { setCreditsModal(selectedDriver); setSelectedDriver(null) }}>+ Adicionar Créditos</button>
                      <button className="ap-btn ap-btn-secondary" onClick={() => handleResetStats(selectedDriver.id)}>Resetar Estatísticas</button>
                      <button className={`ap-btn ${selectedDriver.isApproved ? 'ap-btn-danger' : 'ap-btn-success'}`} onClick={() => { approveDriver(selectedDriver.id, !selectedDriver.isApproved); setSelectedDriver(null) }}>
                        {selectedDriver.isApproved ? 'Suspender Motorista' : 'Ativar Motorista'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PASSAGEIROS ── */}
        {tab === 'Passageiros' && (
          <div>
            <input className="ap-search" placeholder="Buscar passageiro..." value={search} onChange={e => setSearch(e.target.value)} />
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Motorista Vinculado</th><th>Corridas</th><th>Cadastro</th></tr></thead>
                <tbody>
                  {filteredPassengers.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.email}</td>
                      <td>{p.phone || '—'}</td>
                      <td>{p.linkedDriverName || '—'}</td>
                      <td>{safeNum(p.ridesCompleted)}</td>
                      <td>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                  {filteredPassengers.length === 0 && <tr><td colSpan="6" style={{textAlign:'center',padding:'40px',color:'#71717a'}}>Nenhum passageiro encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CONFIGURAÇÕES ── */}
        {tab === 'Configurações' && config && (
          <div className="ap-config-area">
            <div className="ap-config-header">
              <h3>Configurações Globais da Plataforma</h3>
              <button className="ap-btn ap-btn-primary" onClick={saveConfig}>💾 Salvar Configurações</button>
            </div>
            <div className="ap-config-grid">
              {configFields.map(f => (
                <div key={f.key} className="ap-form-group">
                  <label>{f.label}</label>
                  <input
                    type={f.type}
                    value={config[f.key] ?? ''}
                    onChange={e => setConfig({ ...config, [f.key]: e.target.value })}
                    placeholder={f.prefix || ''}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FUNDO ── */}
        {tab === 'Fundo' && fund && (
          <div className="ap-fund-area">
            <div className="ap-fund-total">
              <span className="ap-fund-label">Saldo Total do Fundo de Royalties</span>
              <strong className="ap-fund-val">R$ {safeNum(fund.total).toFixed(2)}</strong>
              <span className="ap-fund-sub">{safeNum(fund.driverCount)} motoristas com saldo ativo</span>
            </div>
            {fund.topDrivers && fund.topDrivers.length > 0 && (
              <div className="ap-table-wrap">
                <h3>🏆 Top Motoristas por Royalty</h3>
                <table className="ap-table">
                  <thead><tr><th>Motorista</th><th>Saldo de Royalties</th></tr></thead>
                  <tbody>
                    {fund.topDrivers.map((d, i) => (
                      <tr key={i}><td>{d.name}</td><td>R$ {safeNum(d.balance).toFixed(2)}</td></tr>
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
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Motorista</th><th>Email</th><th>Chave PIX</th><th>Valor</th><th>Status</th><th>Data</th><th>Ações</th></tr></thead>
                <tbody>
                  {withdrawals.map(w => (
                    <tr key={w.id}>
                      <td>{w.userName || '—'}</td>
                      <td>{w.userEmail || '—'}</td>
                      <td>{w.pixKey || '—'}</td>
                      <td>R$ {safeNum(w.amount).toFixed(2)}</td>
                      <td><span className={`ap-status ap-status-${(w.status || 'pending').toLowerCase()}`}>{w.status || 'PENDING'}</span></td>
                      <td>{new Date(w.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td>
                        {w.status === 'PENDING' && (
                          <>
                            <button className="ap-btn-sm ap-btn-success" onClick={() => handleWithdrawal(w.id, 'APPROVED')}>✓ Aprovar</button>
                            <button className="ap-btn-sm ap-btn-danger" style={{marginLeft:6}} onClick={() => handleWithdrawal(w.id, 'REJECTED')}>✕ Rejeitar</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {withdrawals.length === 0 && <tr><td colSpan="7" style={{textAlign:'center',padding:'40px',color:'#71717a'}}>Nenhuma solicitação de saque.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DOCUMENTAÇÃO ── */}
        {tab === 'Documentação' && (
          <div className="ap-docs">
            <h2>Manual do Administrador</h2>
            <div className="ap-docs-grid">
              <div className="ap-doc-card">
                <h3>🚗 Motoristas</h3>
                <p>Aprove ou suspenda motoristas. Clique em "Ver" para ver detalhes completos, documentos, estatísticas e adicionar créditos manualmente.</p>
              </div>
              <div className="ap-doc-card">
                <h3>📡 Operações</h3>
                <p>Monitore todas as corridas em tempo real. Atualização automática a cada 10 segundos.</p>
              </div>
              <div className="ap-doc-card">
                <h3>💰 Financeiro</h3>
                <p>Visualize faturamento bruto, custos, royalties pagos e lucro líquido da plataforma.</p>
              </div>
              <div className="ap-doc-card">
                <h3>⚙️ Configurações</h3>
                <p>Altere tarifas, preço por km, valor do crédito, data de lançamento e limites do sistema em tempo real.</p>
              </div>
              <div className="ap-doc-card">
                <h3>💎 Fundo</h3>
                <p>Acompanhe o saldo total acumulado de royalties e os top motoristas por ganho.</p>
              </div>
              <div className="ap-doc-card">
                <h3>💳 Saques</h3>
                <p>Aprove ou rejeite solicitações de saque de royalties dos motoristas.</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Corrida */}
        {selectedRide && (
          <div className="ap-modal-overlay" onClick={() => setSelectedRide(null)}>
            <div className="ap-modal" onClick={e => e.stopPropagation()}>
              <div className="ap-modal-header">
                <h2>Corrida #{selectedRide.id?.slice(0,8)}</h2>
                <button className="ap-modal-close" onClick={() => setSelectedRide(null)}>×</button>
              </div>
              <div className="ap-modal-content">
                <div className="ap-info-item"><span className="ap-info-lbl">Passageiro</span><span className="ap-info-val">{selectedRide.passengerName || '—'}</span></div>
                <div className="ap-info-item"><span className="ap-info-lbl">Motorista</span><span className="ap-info-val">{selectedRide.driverName || '—'}</span></div>
                <div className="ap-info-item"><span className="ap-info-lbl">Origem</span><span className="ap-info-val">{selectedRide.origin || '—'}</span></div>
                <div className="ap-info-item"><span className="ap-info-lbl">Destino</span><span className="ap-info-val">{selectedRide.destination || '—'}</span></div>
                <div className="ap-info-item"><span className="ap-info-lbl">Distância</span><span className="ap-info-val">{safeNum(selectedRide.distanceKm).toFixed(1)} km</span></div>
                <div className="ap-info-item"><span className="ap-info-lbl">Veículo</span><span className="ap-info-val">{selectedRide.vehicleType === 'car' ? '🚗 Carro' : '🏍️ Moto'}</span></div>
                <div className="ap-info-item"><span className="ap-info-lbl">Valor</span><span className="ap-info-val" style={{color:'#97e900',fontSize:'1.3rem'}}>R$ {safeNum(selectedRide.price).toFixed(2)}</span></div>
                <div className="ap-info-item"><span className="ap-info-lbl">Status</span><span className="ap-info-val"><span className={`ap-status ap-status-${(selectedRide.status || '').toLowerCase()}`}>{selectedRide.status}</span></span></div>
                <div className="ap-info-item"><span className="ap-info-lbl">Data</span><span className="ap-info-val">{new Date(selectedRide.createdAt).toLocaleString('pt-BR')}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Adicionar Créditos */}
        {creditsModal && (
          <div className="ap-modal-overlay" onClick={() => { setCreditsModal(null); setCreditsAmount('') }}>
            <div className="ap-modal" onClick={e => e.stopPropagation()}>
              <div className="ap-modal-header">
                <h2>Adicionar Créditos — {creditsModal.name}</h2>
                <button className="ap-modal-close" onClick={() => { setCreditsModal(null); setCreditsAmount('') }}>×</button>
              </div>
              <div className="ap-modal-content">
                <p style={{marginBottom:'16px',color:'#a1a1aa'}}>Créditos atuais: <strong style={{color:'#fff'}}>{safeNum(creditsModal.credits)}</strong></p>
                <div className="ap-form-group">
                  <label>Quantidade de Créditos</label>
                  <input type="number" value={creditsAmount} onChange={e => setCreditsAmount(e.target.value)} placeholder="Ex: 100" autoFocus />
                </div>
                <div style={{display:'flex',gap:'8px',marginTop:'16px'}}>
                  <button className="ap-btn ap-btn-primary" onClick={handleAddCredits}>✓ Adicionar</button>
                  <button className="ap-btn ap-btn-secondary" onClick={() => { setCreditsModal(null); setCreditsAmount('') }}>Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
