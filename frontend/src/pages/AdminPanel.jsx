import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminPanel.css'

const API = 'https://zomp-api.onrender.com/api'

function api(path, opts = {}) {
  const token = localStorage.getItem('zomp_token')
  return fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...opts
  }).then(r => r.json())
}

const tabs = ['Dashboard', 'Motoristas', 'Passageiros', 'Vínculos', 'Configurações', 'Fundo', 'Saques']

export default function AdminPanel() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('Dashboard')
  const [stats, setStats] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [passengers, setPassengers] = useState([])
  const [config, setConfig] = useState(null)
  const [fund, setFund] = useState(null)
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [linkPassId, setLinkPassId] = useState('')
  const [linkDrvId, setLinkDrvId] = useState('')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'Dashboard') setStats(await api('/admin/stats'))
      if (tab === 'Motoristas' || tab === 'Vínculos') setDrivers(await api('/admin/drivers'))
      if (tab === 'Passageiros' || tab === 'Vínculos') setPassengers(await api('/admin/passengers'))
      if (tab === 'Configurações') setConfig(await api('/admin/config'))
      if (tab === 'Fundo') setFund(await api('/admin/royalty-fund'))
      if (tab === 'Saques') setWithdrawals(await api('/admin/withdrawals'))
    } catch (e) { showToast('Erro ao carregar dados', 'error') }
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  const approveDriver = async (id, val) => {
    await api(`/admin/drivers/${id}/approve`, { method: 'PUT', body: JSON.stringify({ isApproved: val }) })
    showToast(val ? 'Motorista aprovado!' : 'Motorista suspenso')
    load()
  }

  const linkPassenger = async () => {
    if (!linkPassId || !linkDrvId) return showToast('Informe passageiro e motorista', 'error')
    const r = await api('/admin/link', { method: 'POST', body: JSON.stringify({ passengerId: linkPassId, driverId: linkDrvId }) })
    if (r.error) showToast(r.error, 'error')
    else { showToast('Vínculo criado!'); load() }
  }

  const unlinkPassenger = async (pid) => {
    if (!window.confirm('Desvincular este passageiro?')) return
    await api(`/admin/link/${pid}`, { method: 'DELETE' })
    showToast('Vínculo removido')
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
            <button key={t} className={`ap-nav-btn ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setSearch('') }}>
              {t === 'Dashboard' && '📊'} {t === 'Motoristas' && '🚗'} {t === 'Passageiros' && '👤'}
              {t === 'Vínculos' && '🔗'} {t === 'Configurações' && '⚙️'} {t === 'Fundo' && '💰'} {t === 'Saques' && '💳'}
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
            <span className="ap-admin-badge">Admin</span>
            <button className="ap-refresh" onClick={load}>↻ Atualizar</button>
          </div>
        </div>

        {loading && <div className="ap-loading">Carregando...</div>}

        {/* ── DASHBOARD ── */}
        {tab === 'Dashboard' && stats && (
          <div className="ap-dashboard">
            <div className="ap-rules-box">
              <h3>📋 Regras de Negócio do Sistema</h3>
              <div className="ap-rules-grid">
                <div className="ap-rule"><span className="ap-rule-icon">🔗</span><div><strong>Vínculo 1º (36 meses)</strong><p>Passageiro fica vinculado ao motorista que o indicou via QR Code ou que fez sua primeira corrida. Válido por 36 meses.</p></div></div>
                <div className="ap-rule"><span className="ap-rule-icon">🔄</span><div><strong>Renovação (24 meses)</strong><p>Após os 36 meses, o passageiro fica livre. Na próxima corrida, o motorista que aceitar cria um novo vínculo de 24 meses.</p></div></div>
                <div className="ap-rule"><span className="ap-rule-icon">💰</span><div><strong>Royalty por corrida</strong><p>R$ {stats.config?.royaltyPerRide?.toFixed(2)} creditado ao motorista vinculado a cada corrida concluída do passageiro.</p></div></div>
                <div className="ap-rule"><span className="ap-rule-icon">📈</span><div><strong>Limite mensal</strong><p>Se um passageiro fizer mais de {stats.config?.royaltyMonthlyLimit} corridas no mês, o royalty das corridas excedentes vai ao Fundo Coletivo.</p></div></div>
                <div className="ap-rule"><span className="ap-rule-icon">👥</span><div><strong>Limite por motorista</strong><p>Cada motorista pode ter no máximo {stats.config?.maxPassengersPerDriver} passageiros vinculados à sua conta simultaneamente.</p></div></div>
                <div className="ap-rule"><span className="ap-rule-icon">🏦</span><div><strong>Saque trimestral</strong><p>Motoristas podem solicitar saque do saldo acumulado a cada 3 meses.</p></div></div>
              </div>
            </div>

            <div className="ap-stats-grid">
              <div className="ap-stat-card"><span className="ap-stat-val">{stats.totalDrivers}</span><span className="ap-stat-lbl">Motoristas</span></div>
              <div className="ap-stat-card"><span className="ap-stat-val">{stats.totalPassengers}</span><span className="ap-stat-lbl">Passageiros</span></div>
              <div className="ap-stat-card"><span className="ap-stat-val">{stats.completedRides}</span><span className="ap-stat-lbl">Corridas Concluídas</span></div>
              <div className="ap-stat-card"><span className="ap-stat-val">{stats.pendingWithdrawals}</span><span className="ap-stat-lbl">Saques Pendentes</span></div>
              <div className="ap-stat-card ap-stat-green"><span className="ap-stat-val">R$ {Number(stats.totalRoyaltiesInWallets).toFixed(2)}</span><span className="ap-stat-lbl">Royalties nas Carteiras</span></div>
              <div className="ap-stat-card ap-stat-gold"><span className="ap-stat-val">R$ {Number(stats.royaltyFundBalance).toFixed(2)}</span><span className="ap-stat-lbl">Fundo Coletivo</span></div>
            </div>
          </div>
        )}

        {/* ── MOTORISTAS ── */}
        {tab === 'Motoristas' && (
          <div>
            <input className="ap-search" placeholder="Buscar motorista..." value={search} onChange={e => setSearch(e.target.value)} />
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Nome</th><th>Email</th><th>Veículo</th><th>Passageiros</th><th>Corridas</th><th>Saldo</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {filteredDrivers.map(d => (
                    <tr key={d.id}>
                      <td>{d.name}</td>
                      <td className="ap-td-email">{d.email}</td>
                      <td>{d.carPlate ? `${d.carModel} · ${d.carPlate}` : '—'}</td>
                      <td>
                        <button className="ap-link-btn" onClick={() => setSelectedDriver(selectedDriver?.id === d.id ? null : d)}>
                          {d.linkedPassengers}/{d.referralsMade?.length || 0} vinc.
                        </button>
                      </td>
                      <td>{d.completedRides}</td>
                      <td>R$ {Number(d.balance).toFixed(2)}</td>
                      <td><span className={`ap-badge ${d.isApproved ? 'ap-badge-green' : 'ap-badge-red'}`}>{d.isApproved ? 'Aprovado' : 'Pendente'}</span></td>
                      <td>
                        <button className={`ap-btn-sm ${d.isApproved ? 'ap-btn-danger' : 'ap-btn-success'}`} onClick={() => approveDriver(d.id, !d.isApproved)}>
                          {d.isApproved ? 'Suspender' : 'Aprovar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedDriver && (
              <div className="ap-detail-box">
                <h3>👥 Passageiros vinculados a: {selectedDriver.name}</h3>
                <table className="ap-table">
                  <thead><tr><th>Passageiro</th><th>Email</th><th>Tipo vínculo</th><th>Expira em</th><th>Ação</th></tr></thead>
                  <tbody>
                    {selectedDriver.passengers?.map(p => (
                      <tr key={p.id}>
                        <td>{p.referred?.name}</td>
                        <td>{p.referred?.email}</td>
                        <td>{p.isRenewed ? '24m renovado' : '36m 1º vínculo'}</td>
                        <td>{new Date(p.expiresAt).toLocaleDateString('pt-BR')}</td>
                        <td><button className="ap-btn-sm ap-btn-danger" onClick={() => unlinkPassenger(p.referred.id)}>Desvincular</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                <thead><tr><th>Nome</th><th>Email</th><th>Corridas</th><th>Status Vínculo</th><th>Motorista Vinculado</th><th>Tipo</th><th>Expira</th><th>Ação</th></tr></thead>
                <tbody>
                  {filteredPassengers.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td className="ap-td-email">{p.email}</td>
                      <td>{p.completedRides}</td>
                      <td>
                        <span className={`ap-badge ${p.bindingStatus === 'active' ? 'ap-badge-green' : p.bindingStatus === 'expired' ? 'ap-badge-yellow' : 'ap-badge-gray'}`}>
                          {p.bindingStatus === 'active' ? 'Ativo' : p.bindingStatus === 'expired' ? 'Expirado' : 'Livre'}
                        </span>
                      </td>
                      <td>{p.linkedDriver?.name || '—'}</td>
                      <td>{p.bindingStatus !== 'free' ? p.bindingType : '—'}</td>
                      <td>{p.bindingExpiresAt ? new Date(p.bindingExpiresAt).toLocaleDateString('pt-BR') : '—'}</td>
                      <td>{p.bindingStatus !== 'free' && <button className="ap-btn-sm ap-btn-danger" onClick={() => unlinkPassenger(p.id)}>Desvincular</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── VÍNCULOS ── */}
        {tab === 'Vínculos' && (
          <div>
            <div className="ap-link-box">
              <h3>🔗 Vincular Passageiro a Motorista Manualmente</h3>
              <p className="ap-link-desc">Use este formulário para criar ou corrigir vínculos manualmente. O vínculo manual segue a regra de <strong>36 meses</strong> (1º vínculo).</p>
              <div className="ap-link-form">
                <div className="ap-form-group">
                  <label>Passageiro</label>
                  <select value={linkPassId} onChange={e => setLinkPassId(e.target.value)}>
                    <option value="">Selecione o passageiro...</option>
                    {passengers.map(p => <option key={p.id} value={p.id}>{p.name} — {p.email} {p.bindingStatus === 'active' ? '(vinculado)' : '(livre)'}</option>)}
                  </select>
                </div>
                <div className="ap-form-group">
                  <label>Motorista</label>
                  <select value={linkDrvId} onChange={e => setLinkDrvId(e.target.value)}>
                    <option value="">Selecione o motorista...</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name} — {d.linkedPassengers}/700 passageiros</option>)}
                  </select>
                </div>
                <button className="ap-btn-primary" onClick={linkPassenger}>Criar Vínculo</button>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIGURAÇÕES ── */}
        {tab === 'Configurações' && config && (
          <div className="ap-config-grid">
            <div className="ap-config-section">
              <h3>💵 Precificação por Km</h3>
              <div className="ap-form-row">
                <div className="ap-form-group"><label>Preço/km — Carro (R$)</label><input type="number" step="0.01" value={config.pricePerKmCar} onChange={e => setConfig({ ...config, pricePerKmCar: e.target.value })} /></div>
                <div className="ap-form-group"><label>Preço/km — Moto (R$)</label><input type="number" step="0.01" value={config.pricePerKmMoto} onChange={e => setConfig({ ...config, pricePerKmMoto: e.target.value })} /></div>
                <div className="ap-form-group"><label>Tarifa mín. — Carro (R$)</label><input type="number" step="0.01" value={config.minFareCar} onChange={e => setConfig({ ...config, minFareCar: e.target.value })} /></div>
                <div className="ap-form-group"><label>Tarifa mín. — Moto (R$)</label><input type="number" step="0.01" value={config.minFareMoto} onChange={e => setConfig({ ...config, minFareMoto: e.target.value })} /></div>
              </div>
            </div>
            <div className="ap-config-section">
              <h3>🤝 Royalties</h3>
              <div className="ap-form-row">
                <div className="ap-form-group"><label>Royalty por corrida (R$)</label><input type="number" step="0.01" value={config.royaltyPerRide} onChange={e => setConfig({ ...config, royaltyPerRide: e.target.value })} /></div>
                <div className="ap-form-group"><label>Limite mensal (corridas)</label><input type="number" value={config.royaltyMonthlyLimit} onChange={e => setConfig({ ...config, royaltyMonthlyLimit: e.target.value })} /><small>Acima deste número → fundo coletivo</small></div>
                <div className="ap-form-group"><label>Máx. passageiros/motorista</label><input type="number" value={config.maxPassengersPerDriver} onChange={e => setConfig({ ...config, maxPassengersPerDriver: e.target.value })} /></div>
              </div>
            </div>
            <div className="ap-config-section">
              <h3>🔗 Duração dos Vínculos</h3>
              <div className="ap-form-row">
                <div className="ap-form-group"><label>1º Vínculo (meses)</label><input type="number" value={config.bindingMonthsFirst} onChange={e => setConfig({ ...config, bindingMonthsFirst: e.target.value })} /><small>Via QR Code ou 1ª corrida</small></div>
                <div className="ap-form-group"><label>Renovação (meses)</label><input type="number" value={config.bindingMonthsRenew} onChange={e => setConfig({ ...config, bindingMonthsRenew: e.target.value })} /><small>Após expirar o 1º vínculo</small></div>
              </div>
            </div>
            <button className="ap-btn-primary ap-btn-save" onClick={saveConfig}>💾 Salvar Configurações</button>
          </div>
        )}

        {/* ── FUNDO ── */}
        {tab === 'Fundo' && fund && (
          <div>
            <div className="ap-fund-total">
              <span>💰 Saldo do Fundo Coletivo</span>
              <strong>R$ {Number(fund.total).toFixed(2)}</strong>
            </div>
            <p className="ap-fund-desc">Este fundo acumula royalties de passageiros que excedem {stats?.config?.royaltyMonthlyLimit || 8} corridas/mês. Pode ser distribuído como incentivo entre motoristas ou mantido em reserva.</p>
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Data</th><th>Motivo</th><th>Valor</th><th>ID Corrida</th></tr></thead>
                <tbody>
                  {fund.entries.map(e => (
                    <tr key={e.id}>
                      <td>{new Date(e.createdAt).toLocaleString('pt-BR')}</td>
                      <td>{e.reason === 'passenger_over_monthly_limit' ? '🔢 Passageiro acima do limite mensal' : e.reason}</td>
                      <td className="ap-td-green">+ R$ {Number(e.amount).toFixed(2)}</td>
                      <td className="ap-td-sm">{e.fromRideId?.slice(0, 8)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SAQUES ── */}
        {tab === 'Saques' && (
          <div>
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Motorista</th><th>Email</th><th>Placa</th><th>Valor</th><th>Solicitado em</th><th>Ações</th></tr></thead>
                <tbody>
                  {withdrawals.length === 0 && <tr><td colSpan={6} style={{textAlign:'center', padding:'32px', color:'#64748b'}}>Nenhum saque pendente</td></tr>}
                  {withdrawals.map(w => (
                    <tr key={w.id}>
                      <td>{w.user?.name}</td>
                      <td className="ap-td-email">{w.user?.email}</td>
                      <td>{w.user?.carPlate || '—'}</td>
                      <td><strong>R$ {Number(w.amount).toFixed(2)}</strong></td>
                      <td>{new Date(w.requestedAt).toLocaleString('pt-BR')}</td>
                      <td>
                        <button className="ap-btn-sm ap-btn-success" onClick={() => handleWithdrawal(w.id, 'APPROVED')}>✅ Aprovar</button>
                        <button className="ap-btn-sm ap-btn-danger" style={{marginLeft:8}} onClick={() => handleWithdrawal(w.id, 'REJECTED')}>❌ Rejeitar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
