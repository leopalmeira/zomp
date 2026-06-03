import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, BarChart3, Activity, Users2, Settings2, Library, ArrowUpRightSquare, GanttChartSquare, Contact2, ShieldCheck, HelpCircle, Zap, Globe2, Wallet, Lock } from 'lucide-react'
import './AdminPanel.css'


const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function api(path, opts = {}) {
  const token = localStorage.getItem('zomp_token')
  return fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...opts
  }).then(r => r.json())
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
  const [lightbox, setLightbox] = useState(null)

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
    } catch (e) { showToast('Erro ao carregar dados', 'error') }
    setLoading(false)
  }, [tab])

  useEffect(() => {
    load()
    let interval
    if (tab === 'Operações') {
      interval = setInterval(load, 10000)
    }
    return () => clearInterval(interval)
  }, [load, tab])

  const approveDriver = async (id, val) => {
    await api(`/admin/drivers/${id}/approve`, { method: 'PUT', body: JSON.stringify({ isApproved: val }) })
    showToast(val ? 'Motorista aprovado!' : 'Motorista suspenso')
    load()
  }

  const saveConfig = async () => {
    const r = await api('/admin/config', { method: 'PUT', body: JSON.stringify(config) })
    if (r.error) showToast(r.error, 'error')
    else showToast('Configurações salvas!')
  }

  const handleWithdrawal = async (id, status) => {
    await api(`/admin/withdrawals/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })
    showToast(status === 'APPROVED' ? 'Saque aprovado!' : 'Saque rejeitado')
    load()
  }

  const filteredDrivers = drivers.filter(d => d.name?.toLowerCase().includes(search.toLowerCase()) || d.email?.toLowerCase().includes(search.toLowerCase()))
  const filteredPassengers = passengers.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()))

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
              {t === 'Configurações' && '⚙️'} {t === 'Fundo' && '💰'} {t === 'Saques' && '💳'}
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

        {loading && !operations && <div className="ap-loading">Sincronizando dados...</div>}

        {/* ── DASHBOARD ── */}
        {tab === 'Dashboard' && stats && (
          <div className="ap-dashboard">
            <div className="ap-stats-grid">
              <div className="ap-stat-card"><span className="ap-stat-val">{stats.totalDrivers}</span><span className="ap-stat-lbl">Motoristas Ativos</span></div>
              <div className="ap-stat-card"><span className="ap-stat-val">{stats.totalPassengers}</span><span className="ap-stat-lbl">Passageiros Totais</span></div>
              <div className="ap-stat-card ap-stat-blue"><span className="ap-stat-val">{stats.activeRidesCount || 0}</span><span className="ap-stat-lbl">Corridas em Tempo Real</span></div>
              <div className="ap-stat-card ap-stat-gold"><span className="ap-stat-val">R$ {Number(stats.royaltyFundBalance).toFixed(2)}</span><span className="ap-stat-lbl">Fundo Global</span></div>
            </div>

            <div className="ap-live-feed">
              <h3>📡 Fluxo de Operações Recentes</h3>
              {operations && operations.slice(0, 5).map(ride => (
                <div key={ride.id} className="ap-feed-item" onClick={() => setSelectedRide(ride)} style={{cursor:'pointer'}}>
                  <div className="ap-feed-icon"><Activity size={18} /></div>
                  <div className="ap-feed-body">
                    <strong>{ride.passengerName} → {ride.driverName || 'Aguardando...'}</strong>
                    <span>{ride.origin.slice(0, 30)}...</span>
                  </div>
                  <div className="ap-feed-time">{new Date(ride.createdAt).toLocaleTimeString()}</div>
                </div>
              ))}
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
                <strong className="ap-fin-val">R$ {stats.financials.grossRevenue.toFixed(2)}</strong>
              </div>
              <div className="ap-fin-card">
                <span className="ap-fin-label">Custos</span>
                <strong className="ap-fin-val" style={{color:'#ef4444'}}>- R$ {(stats.financials.taxes + stats.financials.serverFeesTotal).toFixed(2)}</strong>
              </div>
              <div className="ap-fin-card">
                <span className="ap-fin-label">Royalties</span>
                <strong className="ap-fin-val" style={{color:'#f59e0b'}}>- R$ {stats.financials.royaltiesTotal.toFixed(2)}</strong>
              </div>
              <div className="ap-fin-card vibrant">
                <span className="ap-fin-label">Lucro Líquido</span>
                <strong className="ap-fin-val">R$ {stats.financials.netProfit.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* ── OPERAÇÕES ── */}
        {tab === 'Operações' && operations && (
          <div className="ap-operations">
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Data</th><th>Passageiro</th><th>Motorista</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {operations.map(r => (
                    <tr key={r.id}>
                      <td>{new Date(r.createdAt).toLocaleString('pt-BR')}</td>
                      <td>{r.passengerName}</td>
                      <td>{r.driverName || '—'}</td>
                      <td>R$ {r.price.toFixed(2)}</td>
                      <td><span className={`ap-status ap-status-${r.status.toLowerCase()}`}>{r.status}</span></td>
                      <td><button className="ap-btn-sm ap-btn-blue" onClick={() => setSelectedRide(r)}>Detalhes</button></td>
                    </tr>
                  ))}
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
                <thead><tr><th>Motorista</th><th>Email</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {filteredDrivers.map(d => (
                    <tr key={d.id}>
                      <td>{d.name}</td>
                      <td>{d.email}</td>
                      <td><span className={`ap-badge ${d.isApproved ? 'ap-badge-green' : 'ap-badge-red'}`}>{d.isApproved ? 'Ativo' : 'Suspenso'}</span></td>
                      <td>
                        <button className="ap-btn-sm ap-btn-blue" onClick={() => setSelectedDriver(d)}>Ver</button>
                        <button className={`ap-btn-sm ${d.isApproved ? 'ap-btn-danger' : 'ap-btn-success'}`} onClick={() => approveDriver(d.id, !d.isApproved)} style={{marginLeft:8}}>
                          {d.isApproved ? 'Suspender' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedDriver && (
              <div className="ap-modal-overlay" onClick={() => setSelectedDriver(null)}>
                <div className="ap-modal" onClick={e => e.stopPropagation()}>
                   <h2>{selectedDriver.name}</h2>
                   <button onClick={() => setSelectedDriver(null)}>Fechar</button>
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
                <thead><tr><th>Nome</th><th>Email</th></tr></thead>
                <tbody>
                  {filteredPassengers.map(p => (
                    <tr key={p.id}><td>{p.name}</td><td>{p.email}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CONFIGURAÇÕES ── */}
        {tab === 'Configurações' && config && (
          <div className="ap-config-grid">
            <button className="ap-btn-primary" onClick={saveConfig}>Salvar Configurações</button>
          </div>
        )}

        {/* ── FUNDO ── */}
        {tab === 'Fundo' && fund && (
          <div>
            <div className="ap-fund-total">Saldo: R$ {Number(fund.total).toFixed(2)}</div>
          </div>
        )}

        {/* ── SAQUES ── */}
        {tab === 'Saques' && (
          <div className="ap-withdrawals">
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Motorista</th><th>Valor</th><th>Ações</th></tr></thead>
                <tbody>
                  {withdrawals.map(w => (
                    <tr key={w.id}>
                      <td>{w.user?.name}</td>
                      <td>R$ {Number(w.amount).toFixed(2)}</td>
                      <td>
                        <button className="ap-btn-sm ap-btn-success" onClick={() => handleWithdrawal(w.id, 'APPROVED')}>Ok</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DOCUMENTAÇÃO ── */}
        {tab === 'Documentação' && (
          <div className="ap-docs">
            <h2>Manual do Administrador</h2>
            <p>Gerencie motoristas, passageiros e configurações financeiras por aqui.</p>
          </div>
        )}

        {/* Modal de Corrida */}
        {selectedRide && (
          <div className="ap-modal-overlay" onClick={() => setSelectedRide(null)}>
            <div className="ap-modal" onClick={e => e.stopPropagation()}>
               <h2>Corrida #{selectedRide.id.slice(0,8)}</h2>
               <p>Valor: R$ {selectedRide.price.toFixed(2)}</p>
               <button onClick={() => setSelectedRide(null)}>Fechar</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
