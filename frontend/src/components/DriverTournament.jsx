import { useState, useEffect, useMemo } from 'react'
import { getTournamentData } from '../services/api'
import './DriverTournament.css'

export default function DriverTournament({ onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [simExtra, setSimExtra] = useState(0)
  const [filter, setFilter] = useState('ALL')

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

  const phase = data.phase || {}
  const driver = data.driver || {}
  const phaseClass = phase.phase === 'CLASSIFICATORIA' ? 'classificatoria' : phase.phase === 'TORNEIO' ? 'torneio' : 'aguardando'
  const progressTo30 = driver.gaps ? Math.min(100, Math.round((driver.rides / (driver.rides + driver.gaps.toTop30)) * 100)) : 0
  const progressTo3 = driver.gaps ? Math.min(100, Math.round((driver.rides / (driver.rides + driver.gaps.toTop3)) * 100)) : 0

  return (
    <div className="tournament-screen">
      {/* HEADER */}
      <div className="tourn-header">
        <button className="tourn-back-btn" onClick={onClose}>←</button>
        <div className="tourn-header-info">
          <h2 className="tourn-header-title">🏆 Torneio Zomp</h2>
          <p className="tourn-header-sub">{data.month} {data.year} • {data.totalParticipants} participantes</p>
        </div>
        <span className={`tourn-phase-badge ${phaseClass}`}>
          {phase.phase === 'TORNEIO' ? '🔴 AO VIVO' : phase.phase === 'CLASSIFICATORIA' ? '📋 Classif.' : '⏳ Encerrado'}
        </span>
      </div>

      <div className="tourn-body">
        {/* PHASE STATUS CARD */}
        <div className="tourn-phase-card">
          <div className="tourn-phase-label">
            {phase.phase === 'TORNEIO' ? '⚡ FASE ATIVA' : phase.phase === 'CLASSIFICATORIA' ? '📋 CLASSIFICATÓRIA' : '⏳ AGUARDANDO'}
          </div>
          <h3 className="tourn-phase-title">{phase.phaseLabel}</h3>
          <p className="tourn-phase-desc">{phase.phaseDescription}</p>
          <div className="tourn-countdown">
            <span className="tourn-countdown-num">{phase.daysLeft}</span>
            <span className="tourn-countdown-label">{phase.daysLeft === 1 ? 'dia restante' : 'dias restantes'}</span>
          </div>
        </div>

        {/* DRIVER POSITION CARD */}
        <div className="tourn-driver-card">
          <div className="tourn-driver-header">
            <div>
              <div className="tourn-driver-pos-big">
                {simExtra > 0 ? `#${simulated.simPosition}` : `#${driver.position || '—'}`}
              </div>
              <div className="tourn-driver-pos-label">Sua Posição no Ranking</div>
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

          {/* Progress to Top 3 (if already in top 30) */}
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
        <div className={`tourn-smart-tip ${driver.position > 30 ? 'warning' : ''}`}>
          <span className="tourn-smart-tip-icon">
            {driver.position <= 3 ? '🏆' : driver.position <= 30 ? '💡' : '🎯'}
          </span>
          <div className="tourn-smart-tip-text">
            {simExtra > 0 ? simulated.simTip : data.smartTip}
          </div>
        </div>

        {/* SIMULATOR */}
        <div className="tourn-simulator">
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

        {/* DICA DE CAPTAÇÃO */}
        <div className="tourn-captacao-tip">
          <div className="tourn-captacao-text">
            💡 <strong>Estratégia de Captação Rápida:</strong> Está fazendo uma corrida pela <strong>Uber, 99 ou InDriver</strong>? Convide o passageiro para usar a Zomp! Mostre que a corrida é geralmente <strong>mais barata pela Zomp</strong> e faça a viagem pelo nosso app. Você soma corridas no torneio e ainda conquista um novo passageiro para sua <strong>rede de royalties</strong>!
          </div>
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

        {/* DRIVER OUTSIDE TOP 30 HIGHLIGHT */}
        {driver.position > 30 && (
          <div className="tourn-outside-card">
            <div className="tourn-outside-pos">#{ driver.position }º</div>
            <div className="tourn-outside-text">
              Você está fora do Top 30. Faltam <strong>{driver.gaps?.toTop30}</strong> corridas para entrar na zona de premiação!
            </div>
          </div>
        )}

        {/* RULES SECTION */}
        <div className="tourn-rules-section">
          <div className="tourn-rules-title">📋 Regulamento do Torneio Zomp</div>

          <div className="tourn-rule-step">
            <div className="tourn-rule-num step1">1</div>
            <div className="tourn-rule-content">
              <h4>Fase Classificatória (Dia 1 ao 15)</h4>
              <p>Faça pelo menos <strong>15 corridas por dia</strong> em no mínimo <strong>10 dos 15 dias</strong> do período classificatório para garantir sua vaga no Torneio.</p>
            </div>
          </div>

          <div className="tourn-rule-step">
            <div className="tourn-rule-num step2">2</div>
            <div className="tourn-rule-content">
              <h4>Torneio Principal (Dia 16 ao 22)</h4>
              <p>Todos os classificados disputam o ranking durante <strong>7 dias</strong>. Quanto mais corridas concluídas, melhor sua posição!</p>
            </div>
          </div>

          <div className="tourn-rule-step">
            <div className="tourn-rule-num step3">3</div>
            <div className="tourn-rule-content">
              <h4>Premiação dos 30 Melhores — Todo Mês!</h4>
              <p>Os <strong>30 melhores colocados</strong> do ranking conquistam premiações reais todos os meses na Zomp.</p>
            </div>
          </div>
        </div>

        {/* PRIZES GRID */}
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
    </div>
  )
}
