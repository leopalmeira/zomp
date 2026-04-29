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
  const [linkPassId, setLinkPassId] = useState('')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'Dashboard') setStats(await api('/admin/stats'))
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
      interval = setInterval(load, 10000) // Auto-refresh a cada 10s nas operações
    }
    return () => clearInterval(interval)
  }, [load, tab])

  const approveDriver = async (id, val) => {
    await api(`/admin/drivers/${id}/approve`, { method: 'PUT', body: JSON.stringify({ isApproved: val }) })
    showToast(val ? 'Motorista aprovado!' : 'Motorista suspenso')
    load()
  }

  // Vínculo manual removido - sistema agora é automático via QR ou 1ª corrida

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
              <div className="ap-stat-card"><span className="ap-stat-val">{stats.completedRides}</span><span className="ap-stat-lbl">Corridas Realizadas</span></div>
              <div className="ap-stat-card ap-stat-gold"><span className="ap-stat-val">R$ {Number(stats.royaltyFundBalance).toFixed(2)}</span><span className="ap-stat-lbl">Fundo Global</span></div>
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

        {/* ── FINANCEIRO (ESTILO IRP) ── */}
        {tab === 'Financeiro' && stats && (
          <div className="ap-finance">
            <div className="ap-stats-grid">
              <div className="ap-stat-card ap-stat-green">
                <span className="ap-stat-val">R$ {Number(stats?.totalRevenue || 0).toFixed(2)}</span>
                <span className="ap-stat-lbl">Receita Bruta Total</span>
              </div>
              <div className="ap-stat-card ap-stat-red">
                <span className="ap-stat-val">R$ {Number(stats?.totalRoyaltiesExpenses || 0).toFixed(2)}</span>
                <span className="ap-stat-lbl">Despesas c/ Royalties</span>
              </div>
              <div className="ap-stat-card ap-stat-blue">
                <span className="ap-stat-val">R$ {Number(stats?.netProfit || 0).toFixed(2)}</span>
                <span className="ap-stat-lbl">Lucro Líquido Real</span>
              </div>
            </div>

            <div className="ap-irp-grid">
              <div className="ap-irp-card">
                <h3>📊 Demonstrativo de Receita (Corridas + Créditos)</h3>
                <div className="ap-irp-chart">
                  {stats?.dailyStats?.map((d, i) => (
                    <div key={i} className="ap-irp-bar-wrap">
                      <div className="ap-irp-bar" style={{ height: `${Math.min(150, (d.revenue / 200) * 150)}px` }}>
                         {d.revenue > 0 && <span className="ap-irp-bar-tip">R$ {d.revenue.toFixed(0)}</span>}
                      </div>
                      <span className="ap-irp-bar-lbl">{d.date.slice(-2)}/{d.date.slice(5,7)}</span>
                    </div>
                  ))}
                  {(!stats?.dailyStats || stats.dailyStats.length === 0) && <div className="ap-no-data">Aguardando dados...</div>}
                </div>
              </div>

              <div className="ap-irp-card ap-irp-center">
                <h3>🎯 Margem de Lucro Líquida</h3>
                <div className="ap-irp-circle">
                  <div className="ap-irp-circle-inner">
                    <span className="ap-irp-pct">{stats?.grossMargin || 0}%</span>
                    <span className="ap-irp-sub">Lucratividade</span>
                  </div>
                </div>
                <small style={{marginTop:12, opacity:0.6, fontSize:'0.7rem'}}>Retorno sobre faturamento total</small>
              </div>

              <div className="ap-irp-card">
                <h3>💰 Saldo em Caixa (Disponível)</h3>
                <div className="ap-irp-balance">
                   <div className="ap-irp-bal-row"><span>Total Recebido:</span> <strong>R$ {(stats?.totalRevenue || 0).toFixed(2)}</strong></div>
                   <div className="ap-irp-bal-row"><span>Royalties Pagos:</span> <strong style={{color:'var(--ap-red)'}}>- R$ {(stats?.totalRoyaltiesExpenses || 0).toFixed(2)}</strong></div>
                   <div className="ap-irp-bal-row"><span>Saques Aprovados:</span> <strong style={{color:'var(--ap-red)'}}>- R$ {((stats?.netProfit || 0) - (stats?.companyBalance || 0)).toFixed(2)}</strong></div>
                   <div className="ap-irp-bal-total"><span>Saldo Líquido:</span> <strong>R$ {(stats?.companyBalance || 0).toFixed(2)}</strong></div>
                </div>
              </div>
            </div>

            <h3 style={{marginBottom:16, fontSize:'0.9rem', color:'var(--ap-txt2)'}}>💳 Gestão de Créditos de Motoristas</h3>
            <div className="ap-stats-mini-grid" style={{marginBottom:24}}>
              <div className="ap-mini-card">
                <span>Comprado Hoje</span>
                <strong>R$ {(stats?.creditStats?.day || 0).toFixed(2)}</strong>
                <small>Vendas Diárias</small>
              </div>
              <div className="ap-mini-card">
                <span>Comprado na Semana</span>
                <strong>R$ {(stats?.creditStats?.week || 0).toFixed(2)}</strong>
                <small>Ciclo Semanal</small>
              </div>
              <div className="ap-mini-card">
                <span>Comprado no Mês</span>
                <strong>R$ {(stats?.creditStats?.month || 0).toFixed(2)}</strong>
                <small>Volume Mensal</small>
              </div>
              <div className="ap-mini-card">
                <span>Preço do Crédito</span>
                <strong>R$ {(stats?.creditStats?.pricePerCredit || 1).toFixed(2)}</strong>
                <small>Valor p/ Motorista</small>
              </div>
            </div>

            <div className="ap-stats-mini-grid">
              <div className="ap-mini-card"><span>Contas a Pagar</span><strong>R$ 0,00</strong></div>
              <div className="ap-mini-card"><span>Fundo Global (Receber)</span><strong>R$ {(stats?.royaltyFundBalance || 0).toFixed(2)}</strong><small>Reserva Técnica</small></div>
              <div className="ap-mini-card"><span>Lucro Líquido</span><strong>{stats?.grossMargin || 0}%</strong></div>
              <div className="ap-mini-card"><span>Índice de Liquidez</span><strong>1.0</strong></div>
            </div>
          </div>
        )}

        {/* ── OPERAÇÕES ── */}
        {tab === 'Operações' && operations && (
          <div className="ap-operations">
            <div className="ap-stats-grid">
              <div className="ap-stat-card"><span className="ap-stat-val">{operations.pendingCount}</span><span className="ap-stat-lbl">Pedidos Pendentes</span></div>
              <div className="ap-stat-card ap-stat-green"><span className="ap-stat-val">{operations.activeCount}</span><span className="ap-stat-lbl">Corridas em Andamento</span></div>
              <div className="ap-stat-card"><span className="ap-stat-val">2</span><span className="ap-stat-lbl">Agendadas</span></div>
            </div>

            <h3>📡 Fluxo de Pedidos em Tempo Real</h3>
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Hora</th><th>Passageiro</th><th>Motorista</th><th>Status</th><th>Valor</th><th>Origem/Destino</th></tr></thead>
                <tbody>
                  {operations.recentRides.map(r => (
                    <tr key={r.id}>
                      <td>{new Date(r.createdAt).toLocaleTimeString('pt-BR')}</td>
                      <td>{r.passenger?.name}</td>
                      <td>{r.driver?.name || <span style={{opacity:0.5}}>Aguardando...</span>}</td>
                      <td><span className={`ap-badge ${r.status === 'COMPLETED' ? 'ap-badge-green' : r.status === 'PENDING' ? 'ap-badge-yellow' : 'ap-badge-blue'}`}>{r.status}</span></td>
                      <td>R$ {r.price?.toFixed(2)}</td>
                      <td className="ap-td-sm">{r.origin?.slice(0,15)}... → {r.destination?.slice(0,15)}...</td>
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
              <input className="ap-search" placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Motorista</th><th>Email</th><th>Avaliação</th><th>Aceitação</th><th>Corridas</th><th>Saldo</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {filteredDrivers.map(d => (
                    <tr key={d.id}>
                      <td>
                        <div className="ap-user-cell">
                          <img src={d.photo || 'https://via.placeholder.com/40'} className="ap-user-img" alt="" />
                          <span>{d.name}</span>
                        </div>
                      </td>
                      <td className="ap-td-email">{d.email}</td>
                      <td><span className="ap-star">⭐</span> {d.rating?.toFixed(1)} <small>({d.totalRatings})</small></td>
                      <td><span className={`ap-p-rate ${d.acceptanceRate < 70 ? 'low' : ''}`}>{d.acceptanceRate}%</span></td>
                      <td>{d.completedRides}</td>
                      <td>R$ {Number(d.balance).toFixed(2)}</td>
                      <td><span className={`ap-badge ${d.isApproved ? 'ap-badge-green' : 'ap-badge-red'}`}>{d.isApproved ? 'Aprovado' : 'Suspenso'}</span></td>
                      <td>
                        <div className="ap-btn-group">
                          <button className="ap-btn-sm ap-btn-blue" onClick={() => setSelectedDriver(d)}>Ver Detalhes</button>
                          <button className={`ap-btn-sm ${d.isApproved ? 'ap-btn-danger' : 'ap-btn-success'}`} onClick={() => approveDriver(d.id, !d.isApproved)}>
                            {d.isApproved ? 'Suspender' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal de Detalhes do Motorista */}
            {selectedDriver && (
              <div className="ap-modal-overlay" onClick={() => setSelectedDriver(null)}>
                <div className="ap-modal" onClick={e => e.stopPropagation()}>
                  <div className="ap-modal-header">
                    <h2>Ficha Completa: {selectedDriver.name}</h2>
                    <button className="ap-modal-close" onClick={() => setSelectedDriver(null)}>×</button>
                  </div>
                  <div className="ap-modal-content">
                    <div className="ap-doc-grid">
                      <div className="ap-doc-section">
                        <h4>👤 Dados Pessoais & Performance</h4>
                        <div className="ap-doc-item"><span>Email:</span><strong>{selectedDriver.email}</strong></div>
                        <div className="ap-doc-item"><span>Chave PIX:</span><strong>{selectedDriver.pixKey || 'Não informada'}</strong></div>
                        <div className="ap-doc-item"><span>Avaliação:</span><strong>⭐ {selectedDriver.rating?.toFixed(1)} ({selectedDriver.totalRatings} votos)</strong></div>
                        <div className="ap-doc-item"><span>Taxa de Aceitação:</span><strong>{selectedDriver.acceptanceRate}%</strong></div>
                        <div className="ap-doc-item"><span>Total de Corridas:</span><strong>{selectedDriver.completedRides}</strong></div>
                      </div>
                      <div className="ap-doc-section">
                        <h4>🚗 Veículo</h4>
                        <div className="ap-doc-item"><span>Modelo:</span><strong>{selectedDriver.carModel}</strong></div>
                        <div className="ap-doc-item"><span>Ano:</span><strong>{selectedDriver.carYear || '—'}</strong></div>
                        <div className="ap-doc-item"><span>Placa:</span><strong>{selectedDriver.carPlate}</strong></div>
                      </div>
                    </div>
                    <div className="ap-images-grid">
                      <div className="ap-img-box"><span>Foto de Perfil</span><img src={selectedDriver.photo || 'https://via.placeholder.com/150'} alt="Perfil" /></div>
                      <div className="ap-img-box"><span>CNH</span><img src={selectedDriver.cnh || 'https://via.placeholder.com/150?text=CNH'} alt="CNH" /></div>
                      <div className="ap-img-box"><span>CRLV</span><img src={selectedDriver.crlv || 'https://via.placeholder.com/150?text=CRLV'} alt="CRLV" /></div>
                    </div>
                    <div style={{marginTop:24}}>
                       <button className="ap-btn-primary" style={{width:'100%'}} onClick={() => window.open(`/api/user/income-report?year=2024&driverId=${selectedDriver.id}`, '_blank')}>📄 Gerar Informe de Rendimentos (Simulação)</button>
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
                <thead><tr><th>Nome</th><th>Email</th><th>Avaliação</th><th>Corridas</th><th>Status Vínculo</th><th>Motorista Vinculado</th><th>Ação</th></tr></thead>
                <tbody>
                  {filteredPassengers.map(p => (
                    <tr key={p.id}>
                      <td>{p.name} {p.completedRides === 0 && <span className="ap-badge-new">Novo</span>}</td>
                      <td className="ap-td-email">{p.email}</td>
                      <td>⭐ {p.rating?.toFixed(1) || '—'}</td>
                      <td>{p.completedRides}</td>
                      <td>
                        <span className={`ap-badge ${p.bindingStatus === 'active' ? 'ap-badge-green' : p.bindingStatus === 'expired' ? 'ap-badge-yellow' : 'ap-badge-gray'}`}>
                          {p.bindingStatus === 'active' ? 'Ativo' : p.bindingStatus === 'expired' ? 'Expirado' : 'Livre'}
                        </span>
                      </td>
                      <td>{p.linkedDriver?.name || '—'}</td>
                      <td>{p.bindingStatus !== 'free' && <button className="ap-btn-sm ap-btn-danger" onClick={() => unlinkPassenger(p.id)}>Desvincular</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CONFIGURAÇÕES ── */}
        {tab === 'Configurações' && config && (
          <div className="ap-config-grid">
            <div className="ap-config-section">
              <h3>💵 Configurações de Preço</h3>
              <div className="ap-form-row">
                <div className="ap-form-group"><label>KM Carro (R$)</label><input type="number" step="0.01" value={config.pricePerKmCar} onChange={e => setConfig({ ...config, pricePerKmCar: e.target.value })} /></div>
                <div className="ap-form-group"><label>KM Moto (R$)</label><input type="number" step="0.01" value={config.pricePerKmMoto} onChange={e => setConfig({ ...config, pricePerKmMoto: e.target.value })} /></div>
                <div className="ap-form-group"><label>Mínima Carro (R$)</label><input type="number" step="0.01" value={config.minFareCar} onChange={e => setConfig({ ...config, minFareCar: e.target.value })} /></div>
                <div className="ap-form-group"><label>Mínima Moto (R$)</label><input type="number" step="0.01" value={config.minFareMoto} onChange={e => setConfig({ ...config, minFareMoto: e.target.value })} /></div>
              </div>
            </div>

            <div className="ap-config-section ap-config-highlight">
              <h3>⭐ Sistema de Preço Imbatível (Anti-Concorrência)</h3>
              <p className="ap-section-desc">
                A Zomp garante o menor preço do mercado. O passageiro informa o valor visto na Uber ou 99 e o sistema aplica um desconto fixo de R$ 2,00. 
                <strong> Condição de Segurança:</strong> O sistema bloqueia descontos que resultem em um valor por KM abaixo do teto definido abaixo, protegendo a margem do motorista e a sustentabilidade da plataforma.
              </p>
              <div className="ap-form-row">
                <div className="ap-form-group">
                  <label>Teto Mínimo por KM (R$)</label>
                  <input type="number" step="0.01" value={config.minKmPriceImbativel} onChange={e => setConfig({ ...config, minKmPriceImbativel: e.target.value })} />
                  <small>Garante que o motorista nunca trabalhe abaixo do custo operacional.</small>
                </div>
                <div className="ap-form-group">
                  <label>Desconto Fixo (R$)</label>
                  <input type="number" step="0.01" value={config.discountImbativel} onChange={e => setConfig({ ...config, discountImbativel: e.target.value })} />
                  <small>Valor agressivo para conversão imediata do passageiro.</small>
                </div>
              </div>
            </div>

            <div className="ap-config-section" style={{ borderLeft: '4px solid #ef4444' }}>
              <h3>🚨 Regras de Governança & Suspensão Automática</h3>
              <p className="ap-section-desc">
                Para manter o padrão de excelência Zomp, motoristas são auditados em tempo real. 
                <strong> Suspensão:</strong> A conta é desativada automaticamente se os limites abaixo forem atingidos após um período de carência (3 avaliações ou 5 solicitações). 
                Contas suspensas exigem revisão manual do administrador para reativação.
              </p>
              <div className="ap-form-row">
                <div className="ap-form-group">
                  <label>Nota Mínima (1-5)</label>
                  <input type="number" step="0.1" min="1" max="5" value={config.autoSuspendMinRating} onChange={e => setConfig({ ...config, autoSuspendMinRating: e.target.value })} />
                  <small>Média de estrelas calculada pelas últimas 50 viagens.</small>
                </div>
                <div className="ap-form-group">
                  <label>Aceitação Mínima (%)</label>
                  <input type="number" step="1" min="0" max="100" value={config.autoSuspendMinAcceptance} onChange={e => setConfig({ ...config, autoSuspendMinAcceptance: e.target.value })} />
                  <small>Percentual de corridas aceitas vs. ignoradas/recusadas.</small>
                </div>
              </div>
            </div>

            <div className="ap-config-section" style={{ borderLeft: '4px solid #f59e0b' }}>
              <h3>🤝 Estrutura de Rede & Royalties com Prazo Definido</h3>
              <p className="ap-section-desc">
                O motorista Zomp ganha sobre sua rede de passageiros sob condições específicas. 
                <strong> Vínculo Orgânico:</strong> O primeiro motorista a transportar um novo passageiro (ou via QR Code) detém o vínculo por um prazo determinado (ex: 60 meses). 
                <strong> Comissionamento:</strong> Cada corrida gera um royalty fixo, respeitando os limites mensais e a validade do vínculo.
              </p>
              <div className="ap-form-row">
                <div className="ap-form-group">
                  <label>Valor p/ corrida (R$)</label>
                  <input type="number" step="0.01" value={config.royaltyPerRide} onChange={e => setConfig({ ...config, royaltyPerRide: e.target.value })} />
                </div>
                <div className="ap-form-group">
                  <label>Limite Mensal de Corridas/Passag.</label>
                  <input type="number" value={config.royaltyMonthlyLimit} onChange={e => setConfig({ ...config, royaltyMonthlyLimit: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="ap-config-section" style={{ borderLeft: '4px solid var(--ap-blue)' }}>
              <h3>💳 Sistema de Créditos Operacionais</h3>
              <p className="ap-section-desc">
                Defina o valor de venda de cada crédito para os motoristas parceiros. Os créditos são necessários para que o motorista possa aceitar novas corridas na plataforma.
              </p>
              <div className="ap-form-row">
                <div className="ap-form-group">
                  <label>Preço por Crédito (R$)</label>
                  <input type="number" step="0.01" value={config.pricePerCredit} onChange={e => setConfig({ ...config, pricePerCredit: e.target.value })} />
                  <small>Valor unitário cobrado via PIX na plataforma.</small>
                </div>
              </div>
            </div>
            <button className="ap-btn-primary" style={{marginTop:'20px', padding:'18px'}} onClick={saveConfig}>💾 Consolidar e Salvar Estrutura de Negócio</button>
          </div>
        )}

        {/* ── FUNDO ── */}
        {tab === 'Fundo' && fund && (
          <div>
            <div className="ap-fund-total"><span>Saldo do Fundo Global</span><strong>R$ {Number(fund.total).toFixed(2)}</strong></div>
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Data</th><th>Motivo</th><th>Valor</th><th>Vindo de</th></tr></thead>
                <tbody>
                  {fund.entries.map(e => (
                    <tr key={e.id}>
                      <td>{new Date(e.createdAt).toLocaleString('pt-BR')}</td>
                      <td>{e.reason}</td>
                      <td className="ap-td-green">+ R$ {Number(e.amount).toFixed(2)}</td>
                      <td>{e.fromRideId?.slice(0,8)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SAQUES ── */}
        {tab === 'Saques' && (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead><tr><th>Motorista</th><th>Valor</th><th>Solicitado em</th><th>Ações</th></tr></thead>
              <tbody>
                {withdrawals.length === 0 && <tr><td colSpan={4} style={{textAlign:'center', padding:'32px'}}>Sem saques pendentes</td></tr>}
                {withdrawals.map(w => (
                  <tr key={w.id}>
                    <td>{w.user?.name}</td>
                    <td>R$ {Number(w.amount).toFixed(2)}</td>
                    <td>{new Date(w.requestedAt).toLocaleString('pt-BR')}</td>
                    <td>
                      <button className="ap-btn-sm ap-btn-success" onClick={() => handleWithdrawal(w.id, 'APPROVED')}>Aprovar</button>
                      <button className="ap-btn-sm ap-btn-danger" style={{marginLeft:8}} onClick={() => handleWithdrawal(w.id, 'REJECTED')}>Recusar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── DOCUMENTAÇÃO DETALHADA ZOMP ── */}
        {tab === 'Documentação' && (
          <div className="ap-docs-container">
            <div className="ap-docs-header">
              <h2>📖 Enciclopédia Operacional & Manuais de Governança</h2>
              <p>Este guia centraliza toda a inteligência de negócios, fluxos técnicos e regras de compliance da plataforma Zomp.</p>
            </div>

            <div className="ap-docs-grid">
              <div className="ap-doc-card">
                <h3>🚗 Governança do Motorista (Parceiro)</h3>
                <div className="ap-doc-details">
                  <p><strong>Onboarding & Auditoria:</strong> O processo de entrada exige CNH (EAR) e CRLV. A aprovação é manual através da aba "Motoristas", onde o administrador verifica a autenticidade das fotos e documentos.</p>
                  <p><strong>Sistema de Auto-Suspensão:</strong> Auditoria em tempo real. Se a <strong>Nota &lt; {config?.autoSuspendMinRating || 4.0}</strong> ou a <strong>Taxa de Aceitação &lt; {config?.autoSuspendMinAcceptance || 50}%</strong>, a conta é suspensa. Reativação exige revisão.</p>
                  <p><strong>Radar de Pedidos:</strong> Para receber chamadas, o status deve ser 'Online'. A prioridade no despacho considera proximidade e rating acumulado.</p>
                </div>
              </div>

              <div className="ap-doc-card">
                <h3>👤 Inteligência de Rede (Passageiros)</h3>
                <div className="ap-doc-details">
                  <p><strong>Vínculo Vitalício de Rede:</strong> O passageiro fica vinculado ao motorista indicador por 60 meses. Este vínculo é gerado no primeiro transporte ou via QR Code.</p>
                  <p><strong>Mecânica Preço Imbatível:</strong> O sistema aplica <strong>R$ 2,00 de desconto</strong> sobre o valor informado da concorrência, respeitando o teto de <strong>R$ {config?.minKmPriceImbativel || 1.50}/km</strong>.</p>
                  <p><strong>Segurança & Ratings:</strong> Avaliações mútuas ao fim de cada viagem para manter a qualidade da rede.</p>
                </div>
              </div>

              <div className="ap-doc-card">
                <h3>💰 Regras Financeiras & Royalties</h3>
                <div className="ap-doc-details">
                  <p><strong>Fluxo de Royalties:</strong> R$ {config?.royaltyPerRide || 0.30} creditados ao motorista indicador, retirados da taxa da Zomp (sem custo para o motorista da viagem).</p>
                  <p><strong>Limite e Fundo Global:</strong> Teto de <strong>{config?.royaltyMonthlyLimit || 8} corridas bonificadas/mês</strong> por passageiro. Excedentes vão para o Fundo Global.</p>
                  <p><strong>Gestão de Saques:</strong> Liquidação via PIX conforme saldo disponível na Wallet do parceiro.</p>
                </div>
              </div>

              <div className="ap-doc-card">
                <h3>📡 Engenharia do Ciclo de Corrida</h3>
                <div className="ap-flow-steps">
                  <div className="ap-flow-step">
                    <strong>1. Precificação Dinâmica:</strong> Cálculo por KM: Carro (R$ {config?.pricePerKmCar || 2.0}/km) ou Moto (R$ {config?.pricePerKmMoto || 1.5}/km).
                  </div>
                  <div className="ap-flow-step">
                    <strong>2. Despacho Local:</strong> Notificação Socket para motoristas em um raio de até 10km.
                  </div>
                  <div className="ap-flow-step">
                    <strong>3. Multa de Cancelamento:</strong> Cancelamentos pelo passageiro após o aceite geram multa fixa de R$ 2,80.
                  </div>
                  <div className="ap-flow-step">
                    <strong>4. Liquidação Instantânea:</strong> Saldo creditado na carteira imediatamente após a conclusão da viagem.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
