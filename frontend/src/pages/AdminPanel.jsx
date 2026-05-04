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
  const [linkPassId, setLinkPassId] = useState('')

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

        {/* ── FINANCEIRO (ESTILO IRP) ── */}
        {tab === 'Financeiro' && stats && (
          <div className="ap-finance">
            <div className="ap-fin-grid">
              <div className="ap-fin-card">
                <span className="ap-fin-label">Faturamento Bruto (Créditos)</span>
                <strong className="ap-fin-val">R$ {stats.financials.grossRevenue.toFixed(2)}</strong>
                <span className="ap-fin-sub">Receita total via venda de créditos</span>
              </div>
              <div className="ap-fin-card">
                <span className="ap-fin-label">Custos & Impostos</span>
                <strong className="ap-fin-val" style={{color:'#ef4444'}}>- R$ {(stats.financials.taxes + stats.financials.serverFeesTotal).toFixed(2)}</strong>
                <span className="ap-fin-sub">10% Impostos + R$ 0,10/corrida Servidor</span>
              </div>
              <div className="ap-fin-card">
                <span className="ap-fin-label">Royalties Pagos</span>
                <strong className="ap-fin-val" style={{color:'#f59e0b'}}>- R$ {stats.financials.royaltiesTotal.toFixed(2)}</strong>
                <span className="ap-fin-sub">R$ 0,30 por corrida (Rede)</span>
              </div>
              <div className="ap-fin-card vibrant">
                <span className="ap-fin-label">Lucro Líquido Real</span>
                <strong className="ap-fin-val">R$ {stats.financials.netProfit.toFixed(2)}</strong>
                <span className="ap-fin-sub">Margem final de lucratividade</span>
              </div>
            </div>

            <div className="ap-irp-grid" style={{marginTop:32}}>
              <div className="ap-irp-card">
                <h3>📊 Demonstrativo de Receita (Últimos 15 dias)</h3>
                <div className="ap-irp-chart">
                  {stats.dailyStats?.map((d, i) => (
                    <div key={i} className="ap-irp-bar-wrap">
                      <div className="ap-irp-bar" style={{ height: `${Math.min(150, (Number(d.revenue) / (Math.max(...stats.dailyStats.map(x=>Number(x.revenue))) || 100)) * 150)}px` }}>
                         {Number(d.revenue) > 0 && <span className="ap-irp-bar-tip">R$ {Number(d.revenue).toFixed(0)}</span>}
                      </div>
                      <span className="ap-irp-bar-lbl">{d.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ap-irp-card ap-irp-center">
                <h3>🎯 Margem de Lucro</h3>
                <div className="ap-irp-circle">
                  <div className="ap-irp-circle-inner">
                    <span className="ap-irp-pct">{stats.grossMargin}%</span>
                    <span className="ap-irp-sub">Lucratividade</span>
                  </div>
                </div>
                <small style={{marginTop:12, opacity:0.6, fontSize:'0.7rem'}}>Retorno líquido real</small>
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
              <input className="ap-search" placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Motorista</th><th>Email</th><th>Vínculos</th><th>Status</th><th>Ações</th></tr></thead>
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
                      <td><span className="ap-badge-linked">{d.linkedPassengers || 0} passageiros</span></td>
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
                <div className="ap-modal" onClick={e => e.stopPropagation()} style={{maxWidth:'900px'}}>
                  <div className="ap-modal-header">
                    <h2>Ficha Completa: {selectedDriver.name}</h2>
                    <button className="ap-modal-close" onClick={() => setSelectedDriver(null)}>×</button>
                  </div>
                  <div className="ap-modal-content">
                    <div className="ap-doc-grid">
                      <div className="ap-doc-section">
                        <h4>👤 Dados Pessoais & Performance</h4>
                        <div className="ap-doc-item"><span>Email:</span><strong>{selectedDriver.email}</strong></div>
                        <div className="ap-doc-item"><span>Telefone:</span><strong>{selectedDriver.phone || 'Não informado'}</strong></div>
                        <div className="ap-doc-item"><span>Chave PIX:</span><strong>{selectedDriver.pixKey || 'Não informada'}</strong></div>
                        <div className="ap-doc-item"><span>Avaliação:</span><strong>⭐ {selectedDriver.rating?.toFixed(1)} ({selectedDriver.totalRatings} votos)</strong></div>
                        <div className="ap-doc-item"><span>Taxa de Aceitação:</span><strong>{selectedDriver.acceptanceRate}%</strong></div>
                        <div className="ap-doc-item"><span>Rede Vinculada:</span><strong>{selectedDriver.linkedPassengers || 0} Passageiros</strong></div>
                        <div className="ap-doc-item"><span>Total de Corridas:</span><strong>{selectedDriver.completedRides || 0}</strong></div>
                        <div className="ap-doc-item" style={{background:'rgba(151,233,0,0.05)', padding:'8px', borderRadius:'8px', marginTop:'8px'}}>
                          <span>Saldo de Créditos:</span>
                          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                            <strong>R$ {Number(selectedDriver.credits || 0).toFixed(2)}</strong>
                            <button className="ap-btn-sm ap-btn-success" onClick={() => {
                              const amt = prompt('Valor em créditos a adicionar (R$):', '10.00');
                              if (amt && !isNaN(amt)) {
                                api(`/admin/drivers/${selectedDriver.id}/add-credits`, {
                                  method: 'POST',
                                  body: JSON.stringify({ amount: parseFloat(amt) })
                                }).then(r => {
                                  showToast(r.message || 'Créditos adicionados');
                                  load();
                                  setSelectedDriver(null);
                                });
                              }
                            }}>+ Adicionar</button>
                          </div>
                        </div>
                      </div>
                      <div className="ap-doc-section">
                        <h4>🚗 Veículo</h4>
                        <div className="ap-doc-item"><span>Modelo:</span><strong>{selectedDriver.carModel || '—'}</strong></div>
                        <div className="ap-doc-item"><span>Cor:</span><strong>{selectedDriver.carColor || '—'}</strong></div>
                        <div className="ap-doc-item"><span>Placa:</span><strong>{selectedDriver.carPlate || '—'}</strong></div>
                      </div>
                    </div>

                    {/* Documentos com Imagens Reais */}
                    <h4 style={{marginTop:'24px',marginBottom:'16px',fontSize:'0.95rem'}}>📄 Documentos Enviados</h4>
                    <div className="ap-images-grid" style={{gridTemplateColumns:'repeat(3, 1fr)',gap:'16px'}}>
                      <div className="ap-img-box">
                        <span>Foto de Perfil</span>
                        {selectedDriver.photo ? (
                          <img src={selectedDriver.photo} alt="Perfil" style={{maxWidth:'100%',maxHeight:'220px',objectFit:'contain',borderRadius:'12px',cursor:'pointer',border:'2px solid rgba(255,255,255,0.1)'}} onClick={() => setLightbox(selectedDriver.photo)} />
                        ) : (
                          <div style={{padding:'40px',textAlign:'center',color:'#64748b',background:'rgba(255,255,255,0.03)',borderRadius:'12px',border:'1px dashed rgba(255,255,255,0.1)'}}>Não enviada</div>
                        )}
                      </div>
                      <div className="ap-img-box">
                        <span>CNH</span>
                        {selectedDriver.cnh ? (
                          <img src={selectedDriver.cnh} alt="CNH" style={{maxWidth:'100%',maxHeight:'220px',objectFit:'contain',borderRadius:'12px',cursor:'pointer',border:'2px solid rgba(255,255,255,0.1)'}} onClick={() => setLightbox(selectedDriver.cnh)} />
                        ) : (
                          <div style={{padding:'40px',textAlign:'center',color:'#64748b',background:'rgba(255,255,255,0.03)',borderRadius:'12px',border:'1px dashed rgba(255,255,255,0.1)'}}>Não enviada</div>
                        )}
                      </div>
                      <div className="ap-img-box">
                        <span>CRLV</span>
                        {selectedDriver.crlv ? (
                          <img src={selectedDriver.crlv} alt="CRLV" style={{maxWidth:'100%',maxHeight:'220px',objectFit:'contain',borderRadius:'12px',cursor:'pointer',border:'2px solid rgba(255,255,255,0.1)'}} onClick={() => setLightbox(selectedDriver.crlv)} />
                        ) : (
                          <div style={{padding:'40px',textAlign:'center',color:'#64748b',background:'rgba(255,255,255,0.03)',borderRadius:'12px',border:'1px dashed rgba(255,255,255,0.1)'}}>Não enviado</div>
                        )}
                      </div>
                    </div>

                    <div style={{marginTop:24,display:'flex',gap:'12px'}}>
                       <button className={`ap-btn-primary ${selectedDriver.isApproved ? '' : 'ap-btn-success'}`} style={{flex:1}} onClick={() => { approveDriver(selectedDriver.id, !selectedDriver.isApproved); setSelectedDriver(null) }}>
                         {selectedDriver.isApproved ? '🔴 Suspender Motorista' : '🟢 Aprovar e Ativar'}
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
                <thead><tr><th>Nome</th><th>Email</th><th>Vínculo</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {filteredPassengers.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.email}</td>
                      <td><span className="ap-badge-linked">{p.linkedDriverName || 'Orgânico'}</span></td>
                      <td><span className={`ap-status ap-status-approved`}>Ativo</span></td>
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
            {/* DATA DE ESTREIA GLOBAL */}
            <div className="ap-config-section" style={{ borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.03)' }}>
              <h3>🚀 Data de Estreia da Plataforma</h3>
              <p className="ap-section-desc">
                Esta é a data <strong>global</strong> em que todos os motoristas aprovados poderão começar a operar. Todos os motoristas verão esta data no app.
              </p>
              <div className="ap-form-row">
                <div className="ap-form-group">
                  <label>Data de Estreia</label>
                  <input type="date" value={config.launchDate ? String(config.launchDate).split('T')[0] : '2026-07-30'} onChange={e => setConfig({ ...config, launchDate: e.target.value })} />
                  <small>Visível para todos os motoristas cadastrados.</small>
                </div>
              </div>
            </div>

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
          <div>
            <div className="ap-fund-total"><span>Total Estimado a Pagar (Royalties)</span><strong>R$ {withdrawals.reduce((acc, w) => acc + Number(w.amount), 0).toFixed(2)}</strong></div>
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
        {/* Modal de Detalhes da Corrida */}
        {selectedRide && (
          <div className="ap-modal-overlay" onClick={() => setSelectedRide(null)}>
            <div className="ap-modal" onClick={e => e.stopPropagation()}>
              <div className="ap-modal-header">
                <h2>Detalhes da Operação #{selectedRide.id.slice(0, 8)}</h2>
                <button className="ap-modal-close" onClick={() => setSelectedRide(null)}>×</button>
              </div>
              <div className="ap-modal-content">
                <div className="ap-doc-grid">
                  <div className="ap-doc-section">
                    <h4>👤 Passageiro</h4>
                    <p><strong>Nome:</strong> {selectedRide.passengerName}</p>
                    <p><strong>Tel:</strong> {selectedRide.passengerPhone || '—'}</p>
                  </div>
                  <div className="ap-doc-section">
                    <h4>🚗 Motorista</h4>
                    <p><strong>Nome:</strong> {selectedRide.driverName || 'Ninguém aceitou'}</p>
                    <p><strong>Tel:</strong> {selectedRide.driverPhone || '—'}</p>
                  </div>
                </div>
                <div className="ap-config-section" style={{marginTop:20}}>
                  <h4>📡 Rota & Preço</h4>
                  <p><strong>Origem:</strong> {selectedRide.origin}</p>
                  <p><strong>Destino:</strong> {selectedRide.destination}</p>
                  <p style={{fontSize:'1.2rem', color:'var(--ap-green)', marginTop:10}}><strong>Valor Final: R$ {selectedRide.price.toFixed(2)}</strong></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox de Imagens */}
        {lightbox && (
          <div className="ap-lightbox" onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="Lightbox" />
          </div>
        )}

      </main>
    </div>
  )
}
