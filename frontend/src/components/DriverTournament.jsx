import { useState, useEffect, useMemo } from 'react'
import { getTournamentData } from '../services/api'
import './DriverTournament.css'

export default function DriverTournament({ onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [simExtra, setSimExtra] = useState(0)
  const [filter, setFilter] = useState('ALL')
  const [mainTab, setMainTab] = useState('CLASSIFICATORIA') // 'CLASSIFICATORIA' | 'ESTRATEGIA' | 'RANKING' | 'REGRAS'

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getTournamentData().then(d => {
      if (mounted) {
        setData(d)
        setLoading(false)
      }
    }).catch(() => {
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  const driver = data?.driver || {}
  const phase = data?.phase || {}
  const rides = driver.rides || 0
  const classificationGoal = 15
  const isClassified = rides >= classificationGoal
  const ridesRemaining = Math.max(0, classificationGoal - rides)
  const progressPercent = Math.min(100, Math.round((rides / classificationGoal) * 100))

  // Simulação de corridas extras
  const simulated = useMemo(() => {
    if (!data || !data.driver) return null
    const myRides = data.driver.rides + simExtra
    const gaps = { ...data.driver.gaps }
    gaps.toTop30 = Math.max(0, (gaps.rides30th || 0) - myRides + 1)
    gaps.toTop20 = Math.max(0, (gaps.rides20th || 0) - myRides + 1)
    gaps.toTop3 = Math.max(0, (gaps.rides3rd || 0) - myRides + 1)
    gaps.toTop1 = Math.max(0, (gaps.rides1st || 0) - myRides + 1)

    // Recalcular posição simulada
    let simPosition = data.driver.position
    if (data.leaderboard) {
      const sorted = [...data.leaderboard].sort((a, b) => b.rides - a.rides)
      let pos = 1
      for (const entry of sorted) {
        if (entry.isCurrentUser) continue
        if (entry.rides >= myRides) pos++
        else break
      }
      simPosition = pos
    }

    let simTip = ''
    if (simPosition <= 3) {
      simTip = `🏆 Com +${simExtra} corridas você ficaria no TOP 3 (#${simPosition}º)! Disputando o Carro de R$ 100 Mil!`
    } else if (simPosition <= 20) {
      simTip = `🔥 Com +${simExtra} corridas você ficaria em #${simPosition}º (Faixa PIX R$ 3.000)!`
    } else if (simPosition <= 30) {
      simTip = `📱 Com +${simExtra} corridas você ficaria em #${simPosition}º (Faixa Smartphone Samsung)!`
    } else {
      simTip = `💪 Com +${simExtra} corridas você ficaria em #${simPosition}º. Ainda faltam ${gaps.toTop30} para o Top 30.`
    }

    return { myRides, gaps, simPosition, simTip }
  }, [data, simExtra])

  // Filtrar leaderboard
  const filteredLeaderboard = useMemo(() => {
    if (!data?.leaderboard) return []
    if (filter === 'ALL') return data.leaderboard
    if (filter === 'CAR') return data.leaderboard.filter(e => e.position <= 3)
    if (filter === 'PIX') return data.leaderboard.filter(e => e.position >= 4 && e.position <= 20)
    if (filter === 'PHONE') return data.leaderboard.filter(e => e.position >= 21 && e.position <= 30)
    return data.leaderboard
  }, [data, filter])

  function getPrizeTag(position) {
    if (position <= 3) return { label: '🚗 Carro R$100k', className: 'car' }
    if (position <= 20) return { label: '💰 PIX R$3k', className: 'pix' }
    if (position <= 30) return { label: '📱 Samsung', className: 'phone' }
    return null
  }

  function getPosClass(position) {
    if (position === 1) return 'gold'
    if (position === 2) return 'silver'
    if (position === 3) return 'bronze'
    return ''
  }

  function getPosEmoji(position) {
    if (position === 1) return '🥇'
    if (position === 2) return '🥈'
    if (position === 3) return '🥉'
    return `#${position}`
  }

  if (loading) {
    return (
      <div className="tournament-screen">
        <div className="tourn-header">
          <button className="tourn-back-btn" onClick={onClose}>←</button>
          <div className="tourn-header-info">
            <h2 className="tourn-header-title">🏆 Torneio Zomp</h2>
            <p className="tourn-header-sub">Carregando dados do torneio...</p>
          </div>
        </div>
        <div className="tourn-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px', animation: 'pulseLive 1.5s ease-in-out infinite' }}>🏆</div>
            <p style={{ fontSize: '1rem', fontWeight: 800, color: '#64748b' }}>Carregando Torneio Zomp...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="tournament-screen">
        <div className="tourn-header">
          <button className="tourn-back-btn" onClick={onClose}>←</button>
          <div className="tourn-header-info">
            <h2 className="tourn-header-title">🏆 Torneio Zomp</h2>
          </div>
        </div>
        <div className="tourn-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📡</div>
            <p style={{ fontSize: '1rem', fontWeight: 800, color: '#64748b' }}>Não foi possível carregar os dados do torneio.</p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Verifique sua conexão e tente novamente.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tournament-screen">
      {/* HEADER */}
      <div className="tourn-header">
        <button className="tourn-back-btn" onClick={onClose}>←</button>
        <div className="tourn-header-info">
          <h2 className="tourn-header-title">🏆 Torneio Zomp</h2>
          <p className="tourn-header-sub">{data.month} {data.year} • Carro R$ 100 Mil, PIX e Celulares</p>
        </div>
        <span className={`tourn-phase-badge ${isClassified ? 'torneio' : 'classificatoria'}`}>
          {isClassified ? '✅ CLASSIFICADO' : '📋 CLASSIFICATÓRIA'}
        </span>
      </div>

      {/* NAVEGAÇÃO DE ABAS SUPERIOR */}
      <div style={{
        display: 'flex',
        background: '#090d16',
        borderBottom: '1.5px solid rgba(255,255,255,0.08)',
        padding: '6px 12px',
        gap: '6px',
        overflowX: 'auto'
      }}>
        {[
          { key: 'CLASSIFICATORIA', label: '🎯 Minha Classificação', badge: isClassified ? '15/15' : `${rides}/15` },
          { key: 'ESTRATEGIA', label: '💡 Estratégia de Ouro', highlight: true },
          { key: 'RANKING', label: '🏆 Ranking & Prêmios' },
          { key: 'REGRAS', label: '📖 3 Etapas' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setMainTab(t.key)}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: mainTab === t.key ? '1.5px solid #00E676' : '1px solid transparent',
              background: mainTab === t.key 
                ? 'rgba(0, 230, 118, 0.15)' 
                : t.highlight ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255,255,255,0.04)',
              color: mainTab === t.key ? '#00E676' : t.highlight ? '#f59e0b' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{t.label}</span>
            {t.badge && (
              <span style={{
                background: isClassified ? '#00E676' : '#3b82f6',
                color: '#000',
                padding: '2px 6px',
                borderRadius: '6px',
                fontSize: '0.65rem',
                fontWeight: 900
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="tourn-body">

        {/* ── ABA 1: CLASSIFICAÇÃO INDIVIDUAL (META DE 15 CORRIDAS) ── */}
        {mainTab === 'CLASSIFICATORIA' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* CARD MASTER DA REGRA CLASSIFICATÓRIA */}
            <div style={{
              background: '#0d1526',
              border: isClassified ? '2px solid #00E676' : '2px solid #3b82f6',
              borderRadius: '20px',
              padding: '24px 20px',
              boxShadow: isClassified ? '0 10px 30px rgba(0, 230, 118, 0.25)' : '0 10px 30px rgba(0,0,0,0.6)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Selo Topo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{
                  background: isClassified ? '#00E676' : '#3b82f6',
                  color: '#000000',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  padding: '5px 12px',
                  borderRadius: '100px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px'
                }}>
                  {isClassified ? '✓ VAGA GARANTIDA NO TORNEIO' : '📋 1ª ETAPA — CLASSIFICATÓRIA INDIVIDUAL'}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 800 }}>
                  Etapa 1: até dia 15
                </span>
              </div>

              {/* Título & Mensagem Didática */}
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', margin: '0 0 10px', lineHeight: '1.3' }}>
                {isClassified ? '🎉 Parabéns! Você Está Classificado!' : '🎯 Você Não Disputa com Ninguém Nesta Fase!'}
              </h3>

              <p style={{ fontSize: '0.94rem', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 20px', fontWeight: 600 }}>
                {isClassified
                  ? 'Você já atingiu as 15 corridas pela Zomp e carimbou sua vaga oficial para a Etapa 2 (Mata-Mata / Chaveamento dos Prêmios)! Continue acelerando para acumular mais bônus e royalties.'
                  : 'Nesta fase classificatória você disputa apenas contra você mesmo! Não há concorrência com outros motoristas: basta completar 15 corridas concluídas pela Zomp até o dia 15 para carimbar sua vaga no Torneio Oficial.'}
              </p>

              {/* Progresso de Corridas */}
              <div style={{
                background: '#070b14',
                border: '1.5px solid #1e293b',
                borderRadius: '16px',
                padding: '18px 16px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff' }}>
                    Seu Progresso: <strong style={{ color: '#00E676', fontSize: '1.25rem' }}>{rides}</strong> de 15 corridas
                  </span>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: isClassified ? '#00E676' : '#60a5fa' }}>
                    {progressPercent}%
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div style={{ width: '100%', height: '16px', background: '#1e293b', borderRadius: '100px', overflow: 'hidden', padding: '2px' }}>
                  <div style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: isClassified 
                      ? 'linear-gradient(90deg, #00E676, #00C853)' 
                      : 'linear-gradient(90deg, #3b82f6, #00E676)',
                    borderRadius: '100px',
                    transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                  }} />
                </div>

                {/* Texto de Status */}
                <div style={{ marginTop: '12px', fontSize: '0.88rem', color: isClassified ? '#00E676' : '#f59e0b', fontWeight: 800, textAlign: 'center' }}>
                  {isClassified 
                    ? '🏆 Meta Batida! Você já está no chaveamento dos R$ 100 Mil!' 
                    : `⚠️ Faltam apenas ${ridesRemaining} corrida(s) para carimbar sua vaga!`}
                </div>
              </div>

              {/* Botão de Atalho para Estratégia */}
              <button
                onClick={() => setMainTab('ESTRATEGIA')}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '13px',
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                }}
              >
                💡 Ver Dica de Ouro: Como Bater as 15 Corridas Rápido
              </button>
            </div>

            {/* RESUMO DAS 3 PREMIAÇÕES */}
            <div className="tourn-prizes-grid">
              <div className="tourn-prize-card gold">
                <div className="tourn-prize-card-icon">🚗</div>
                <div className="tourn-prize-card-range">1º ao 3º Lugar</div>
                <div className="tourn-prize-card-value">Carro de R$ 100.000</div>
              </div>
              <div className="tourn-prize-card green">
                <div className="tourn-prize-card-icon">💰</div>
                <div className="tourn-prize-card-range">4º ao 20º Lugar</div>
                <div className="tourn-prize-card-value">R$ 3.000 PIX</div>
              </div>
              <div className="tourn-prize-card blue">
                <div className="tourn-prize-card-icon">📱</div>
                <div className="tourn-prize-card-range">21º ao 30º Lugar</div>
                <div className="tourn-prize-card-value">Smartphone Samsung</div>
              </div>
            </div>

          </div>
        )}

        {/* ── ABA 2: ESTRATÉGIA DE OURO (PUXAR PASSAGEIROS DA CONCORRÊNCIA) ── */}
        {mainTab === 'ESTRATEGIA' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              border: '2px solid #f59e0b',
              borderRadius: '20px',
              padding: '22px 18px',
              boxShadow: '0 10px 30px rgba(245, 158, 11, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '2rem' }}>💡</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#f59e0b' }}>
                    Estratégia de Ouro aos Motoristas
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>
                    Como bater suas 15 corridas e multiplicar seus ganhos imediatamente
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: '1.6', fontWeight: 600, margin: '12px 0 18px' }}>
                Você não precisa esperar corridas caírem do céu! Você pode usar a força da concorrência a seu favor trazendo clientes diários para a Zomp com vantagens reais para o passageiro e para você:
              </p>

              {/* 4 Passos Didáticos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ background: '#3b82f6', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0 }}>
                    1
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.92rem', color: '#fff', fontWeight: 800 }}>
                      Aceite a corrida na concorrência (Uber, 99 ou InDrive)
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.45' }}>
                      Vá até o passageiro normalmente como você já faz no seu dia a dia.
                    </p>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ background: '#f59e0b', color: '#000', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0 }}>
                    2
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.92rem', color: '#fff', fontWeight: 800 }}>
                      Mostre que na Zomp o valor fica mais barato
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.45' }}>
                      Abra o simulador da Zomp e mostre ao passageiro: como a Zomp não cobra 30% a 40% de comissão, a corrida para ele sai com preço mais justo e você ganha mais!
                    </p>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ background: '#00E676', color: '#000', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0 }}>
                    3
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.92rem', color: '#fff', fontWeight: 800 }}>
                      Convide o passageiro a cancelar lá e chamar pela Zomp
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.45' }}>
                      Peça para ele cancelar a viagem no outro app e pedir direto pelo Zomp (ou ler seu QR Code de motorista parceiro).
                    </p>
                  </div>
                </div>

                <div style={{ background: 'rgba(0, 230, 118, 0.08)', border: '1.5px solid #00E676', borderRadius: '14px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ background: '#00E676', color: '#000', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem', flexShrink: 0 }}>
                    ★
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', color: '#00E676', fontWeight: 900 }}>
                      Lucro Triplo para Você!
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                      <li><strong>Taxa Fixa de R$ 1,50:</strong> Quase 100% do valor da corrida fica no seu bolso!</li>
                      <li><strong>+R$ 0,30 de Royalties:</strong> O passageiro fica vinculado ao seu perfil para sempre. Toda viagem que ele fizer pela Zomp no futuro gera R$ 0,30 na sua conta!</li>
                      <li><strong>+1 Corrida no Torneio:</strong> Você avança para bater as 15 da classificação e disputa o Carro de R$ 100 Mil!</li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>

            <button
              onClick={() => setMainTab('CLASSIFICATORIA')}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #00E676, #00C853)',
                color: '#000',
                border: 'none',
                borderRadius: '14px',
                padding: '14px',
                fontSize: '0.94rem',
                fontWeight: 900,
                cursor: 'pointer'
              }}
            >
              ✓ Entendido! Voltar para Meu Progresso
            </button>

          </div>
        )}

        {/* ── ABA 3: RANKING & SIMULADOR (ETAPAS 2 E 3) ── */}
        {mainTab === 'RANKING' && (
          <div>
            {/* DRIVER POSITION CARD */}
            <div className="tourn-driver-card">
              <div className="tourn-driver-header">
                <div>
                  <div className="tourn-driver-pos-big">
                    {simExtra > 0 ? `#${simulated.simPosition}` : `#${driver.position || '—'}`}
                  </div>
                  <div className="tourn-driver-pos-label">Sua Posição no Ranking Geral</div>
                </div>
                <div className="tourn-driver-rides-box">
                  <div className="tourn-driver-rides-num">
                    {simExtra > 0 ? simulated.myRides : driver.rides}
                  </div>
                  <div className="tourn-driver-rides-label">
                    Corridas {simExtra > 0 ? '(Simulação)' : ''}
                  </div>
                </div>
              </div>

              {/* Progress to Top 30 */}
              {((simExtra > 0 ? simulated.simPosition : driver.position) > 30) && (
                <div className="tourn-progress-wrap">
                  <div className="tourn-progress-labels">
                    <span className="tourn-progress-left">Você: {simExtra > 0 ? simulated.myRides : driver.rides} corridas</span>
                    <span className="tourn-progress-right">Top 30: {driver.gaps?.rides30th || 0} corridas</span>
                  </div>
                  <div className="tourn-progress-bar">
                    <div className="tourn-progress-fill" style={{ width: `${Math.min(100, Math.round(((simExtra > 0 ? simulated.myRides : driver.rides) / (driver.gaps?.rides30th || 1)) * 100))}%` }} />
                  </div>
                </div>
              )}

              {/* Progress to Top 3 */}
              {((simExtra > 0 ? simulated.simPosition : driver.position) <= 30) && ((simExtra > 0 ? simulated.simPosition : driver.position) > 3) && (
                <div className="tourn-progress-wrap">
                  <div className="tourn-progress-labels">
                    <span className="tourn-progress-left">Você: {simExtra > 0 ? simulated.myRides : driver.rides} corridas</span>
                    <span className="tourn-progress-right">Top 3: {driver.gaps?.rides3rd || 0} corridas</span>
                  </div>
                  <div className="tourn-progress-bar">
                    <div className="tourn-progress-fill gold" style={{ width: `${Math.min(100, Math.round(((simExtra > 0 ? simulated.myRides : driver.rides) / (driver.gaps?.rides3rd || 1)) * 100))}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* SMART TIP */}
            <div className={`tourn-smart-tip ${driver.position > 30 ? 'warning' : ''}`} style={{ marginBottom: '16px' }}>
              <span className="tourn-smart-tip-icon">
                {driver.position <= 3 ? '🏆' : driver.position <= 30 ? '💡' : '🎯'}
              </span>
              <div className="tourn-smart-tip-text">
                {simExtra > 0 ? simulated.simTip : data.smartTip}
              </div>
            </div>

            {/* SIMULATOR */}
            <div className="tourn-simulator" style={{ marginBottom: '16px' }}>
              <div className="tourn-sim-title">📊 Simulador de Projeção de Ranking</div>
              <div className="tourn-sim-btns">
                {[0, 5, 10, 15, 20, 30].map(n => (
                  <button
                    key={n}
                    className={`tourn-sim-btn ${simExtra === n ? 'active' : ''}`}
                    onClick={() => setSimExtra(n)}
                  >
                    {n === 0 ? 'Atual' : `+${n}`}
                  </button>
                ))}
              </div>
              {simExtra > 0 && simulated && (
                <div className="tourn-sim-result">
                  {simulated.simTip}
                </div>
              )}
            </div>

            {/* FILTER TABS */}
            <div className="tourn-filter-tabs">
              {[
                { key: 'ALL', label: `Todos (${data.leaderboard?.length || 30})` },
                { key: 'CAR', label: '🚗 Carros (Top 3)' },
                { key: 'PIX', label: '💰 PIX R$3k (4º-20º)' },
                { key: 'PHONE', label: '📱 Samsung (21º-30º)' }
              ].map(tab => (
                <button
                  key={tab.key}
                  className={`tourn-filter-tab ${filter === tab.key ? 'active' : ''}`}
                  onClick={() => setFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* LEADERBOARD TABLE */}
            <div className="tourn-table-wrap">
              <div className="tourn-table-header">
                <span>#</span>
                <span>Motorista</span>
                <span style={{ textAlign: 'center' }}>Corridas</span>
                <span style={{ textAlign: 'center' }}>Prêmio</span>
              </div>
              {filteredLeaderboard.map(entry => {
                const prize = getPrizeTag(entry.position)
                const isMe = entry.isCurrentUser
                return (
                  <div
                    key={entry.id}
                    className={`tourn-table-row ${isMe ? 'highlight' : ''} ${entry.position <= 3 ? 'top3' : ''}`}
                  >
                    <span className={`tourn-pos ${getPosClass(entry.position)}`}>
                      {getPosEmoji(entry.position)}
                    </span>
                    <span className={`tourn-name ${isMe ? 'is-me' : ''}`}>
                      {isMe ? `⭐ ${entry.name} (Você)` : entry.name}
                    </span>
                    <span className="tourn-rides">{entry.rides}</span>
                    <span>
                      {prize && (
                        <span className={`tourn-prize-tag ${prize.className}`}>
                          {prize.label}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── ABA 4: REGULAMENTO & AS 3 ETAPAS ── */}
        {mainTab === 'REGRAS' && (
          <div className="tourn-rules-section">
            <div className="tourn-rules-title">📋 Regulamento Oficial do Torneio Zomp</div>

            <div className="tourn-rule-step">
              <div className="tourn-rule-num step1">1</div>
              <div className="tourn-rule-content">
                <h4>1ª Etapa — Classificatória Individual (Dia 1 ao 15)</h4>
                <p>Nesta etapa inicial você <strong>não disputa com nenhum motorista</strong>, apenas consigo mesmo! Basta concluir <strong>15 corridas pela Zomp</strong> para garantir automaticamente sua vaga no Torneio Oficial.</p>
              </div>
            </div>

            <div className="tourn-rule-step">
              <div className="tourn-rule-num step2">2</div>
              <div className="tourn-rule-content">
                <h4>2ª Etapa — Torneio Mata-Mata (Dia 16 ao 25)</h4>
                <p>Todos os motoristas classificados entram na disputa ao vivo do ranking. Cada corrida concluída conta pontos para subir de posição rumo ao Top 30.</p>
              </div>
            </div>

            <div className="tourn-rule-step">
              <div className="tourn-rule-num step3">3</div>
              <div className="tourn-rule-content">
                <h4>3ª Etapa — A Grande Final & Premiação dos 30 Melhores</h4>
                <p>Encerramento oficial e entrega das premiações aos 30 melhores motoristas do mês:</p>
                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                  <div>🥇 <strong>1º ao 3º Lugar:</strong> Carro 0km no valor de R$ 100.000,00!</div>
                  <div>💰 <strong>4º ao 20º Lugar:</strong> R$ 3.000,00 via PIX direto na conta!</div>
                  <div>📱 <strong>21º ao 30º Lugar:</strong> Smartphone Samsung novinho!</div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
