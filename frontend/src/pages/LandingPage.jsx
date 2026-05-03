import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { TrendingUp, User, Shield, Zap, Gift, Smartphone, CheckCircle, XCircle, ChevronDown, ArrowRight } from 'lucide-react'
import './LandingPage.css'

/* ── Count-up animation ── */
function CountUp({ target, prefix = '', suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const ref = React.useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target, duration])
  return <span ref={ref}>{prefix}{count.toLocaleString('pt-BR')}{suffix}</span>
}

/* ── Countdown até 30/06/2026 ── */
function Countdown() {
  const target = new Date('2026-06-30T23:59:59-03:00')
  const [diff, setDiff] = useState(target - new Date())
  useEffect(() => {
    const t = setInterval(() => setDiff(target - new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const pad = n => String(n).padStart(2, '0')
  return (
    <div className="lp-countdown">
      <p className="lp-cd-label">⏳ Pré-cadastro de motoristas encerra em:</p>
      <div className="lp-cd-boxes">
        <div className="lp-cd-box"><span className="lp-cd-num">{d}</span><span className="lp-cd-unit">dias</span></div>
        <span className="lp-cd-sep">:</span>
        <div className="lp-cd-box"><span className="lp-cd-num">{pad(h)}</span><span className="lp-cd-unit">horas</span></div>
        <span className="lp-cd-sep">:</span>
        <div className="lp-cd-box"><span className="lp-cd-num">{pad(m)}</span><span className="lp-cd-unit">min</span></div>
        <span className="lp-cd-sep">:</span>
        <div className="lp-cd-box"><span className="lp-cd-num">{pad(s)}</span><span className="lp-cd-unit">seg</span></div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [passengers, setPassengers] = useState(400)

  // Simulation Logic: 2 rides/week per passenger, 4 weeks/month, R$ 0.30 royalty
  const monthlyPassive = passengers * 2 * 4 * 0.30
  const quarterlyPassive = monthlyPassive * 3
  const yearlyPassive = monthlyPassive * 12

  const fadeUp = { hidden: { y: 30, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } } }
  const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } }

  const handleCta = async () => {
    // Attempt PWA Install
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt = null;
    }
    navigate('/motorista/cadastro')
  }

  return (
    <div className="lp-root">
      <div className="lp-ambient a1" /><div className="lp-ambient a2" />

      {/* ── NAVBAR ── */}
      <nav className="lp-nav">
        <img src="/logo.svg" alt="Zomp" className="lp-nav-logo" />
        <div className="lp-nav-links">
          <button onClick={() => navigate('/motorista')}>Parceria</button>
          <button onClick={() => document.getElementById('royalties-sec')?.scrollIntoView({ behavior: 'smooth' })}>Renda Passiva</button>
        </div>
      </nav>

      {/* ── HERO BANNER ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg">
          <img src="/zomp_driver_realistic.png" alt="" className="lp-hero-photo" />
          <div className="lp-hero-overlay" />
        </div>

        <div className="lp-hero-content">
          <motion.div className="lp-badge" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            💎 Invista no seu Futuro
          </motion.div>

          <motion.h1 className="lp-hero-h1" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
            Sua Renda Passiva.<br />Construa seu<br /><span className="lp-gold-text">Patrimônio Direcional.</span>
          </motion.h1>

          <motion.p className="lp-hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }}>
            A Zomp não é apenas um app de transporte. É um ecossistema de investimento para você.
            Garanta sua fatia do mercado com <strong>royalties recorrentes</strong> de cada cliente que você trouxer para a rede.
          </motion.p>

          <motion.div 
            className="lp-reflection-box"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <p className="lp-reflection-text">
              "Para que rodar na Uber ou 99 se ao chegar em casa seus ganhos param? <span className="lp-reflection-highlight">Onde está a lógica nisso?</span>"
            </p>
          </motion.div>

          <motion.div className="lp-hero-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            <button className="lp-cta-btn lp-cta-lg" onClick={handleCta}>
              Ativar minha Renda Passiva →
            </button>
          </motion.div>

          {/* Countdown */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
            <Countdown />
          </motion.div>

          <motion.div className="lp-vagas-alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
            <span className="lp-dot" />
            <span>Fase de Expansão: Credenciamento de Motoristas no Rio de Janeiro</span>
          </motion.div>
        </div>

        <motion.div className="lp-scroll-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
          <ChevronDown size={18} /> <span>Explore o modelo de negócios</span> <ChevronDown size={18} />
        </motion.div>
      </section>

      {/* ── ENTRADA ── */}
      <section className="lp-entry-section">
        <motion.div className="lp-entry-grid" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.div className="lp-entry-card lp-entry-driver" style={{ gridColumn: '1 / -1', maxWidth: '600px', margin: '0 auto' }} variants={fadeUp} onClick={handleCta}>
            <div className="lp-entry-badge">💎 Única no Brasil</div>
            <div className="lp-entry-icon"><TrendingUp size={32} /></div>
            <h3>Renda Passiva de Verdade</h3>
            <p>
              Ganhe dinheiro com cada corrida que seus passageiros fizerem, <br/>
              <strong>mesmo quando você não estiver dirigindo.</strong>
            </p>
            <div className="lp-entry-pill">Royalties de Passageiros</div>
            <div className="lp-entry-btn">Iniciar Onboarding Agora <ArrowRight size={18} /></div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── COMO FUNCIONA O ONBOARDING ── */}
      <section className="lp-how-section" id="royalties-sec">
        <motion.div className="lp-section-tag" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          📋 Como Ativar seus Royalties
        </motion.div>
        <motion.h2 className="lp-section-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Somos a única que permite ganhar<br /><span className="lp-accent">mesmo sem estar dirigindo.</span>
        </motion.h2>
        <motion.p className="lp-section-sub" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Nosso objetivo é ter os melhores parceiros. O processo é simples e direto.
          Siga os passos abaixo para garantir sua Renda Passiva vinda de passageiros.
        </motion.p>
        <motion.div className="lp-how-grid" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {[
            { n: '01', title: 'Pré-Cadastro Rápido', desc: 'Crie sua conta na plataforma utilizando seu e-mail e crie uma senha segura de acesso.' },
            { n: '02', title: 'Envio de Documentação', desc: 'Acesse o aplicativo (via navegador) e envie fotos nítidas da sua CNH, CRLV do veículo e uma foto de perfil.' },
            { n: '03', title: 'Aprovação Administrativa', desc: 'Nossa equipe irá verificar seus documentos no painel de controle. Após a liberação, você estará apto a dirigir e lucrar.' },
          ].map((s, i) => (
            <motion.div key={i} className="lp-how-step" variants={fadeUp}>
              <div className="lp-how-num">{s.n}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── SIMULADOR ── */}
      <section className="lp-sim-section">
        <div className="lp-sim-wrap">
          <div className="lp-sim-left">
            <motion.div className="lp-section-tag lp-tag-vibrant" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              💰 Simulado de Ganhos
            </motion.div>
            <motion.h2 className="lp-section-title lp-left-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              Alavancagem de Ganhos<br /><span className="lp-accent">sem aumento de jornada.</span>
            </motion.h2>

            <motion.div className="lp-calc-table" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <div className="lp-simulator-header">
                <span>Clientes na sua Rede: <strong>{passengers}</strong></span>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={passengers}
                  onChange={(e) => setPassengers(parseInt(e.target.value))}
                  className="lp-slider"
                />
              </div>

              <div className="lp-calc-header"><span>Métrica Operacional</span><span>Valor Estimado</span></div>
              <div className="lp-calc-row"><span>Clientes Ativos na Rede</span><strong>{passengers}</strong></div>
              <div className="lp-calc-row"><span>Frequência Semanal Média</span><strong>2 viagens</strong></div>
              <div className="lp-calc-row"><span>Royalty por Operação</span><strong className="lp-accent">R$ 0,30</strong></div>
              <div className="lp-calc-divider" />
              <div className="lp-calc-row"><span>Volume de Viagens/Mês</span><strong>{(passengers * 2 * 4).toLocaleString('pt-BR')}</strong></div>
              <div className="lp-calc-row lp-calc-sub"><span>Rendimento Mensal Passivo</span><strong className="lp-accent">R$ {monthlyPassive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
              <div className="lp-calc-divider" />
              <div className="lp-calc-row lp-calc-total">
                <span>💰 Acúmulo para Saque Trimestral</span>
                <strong className="lp-gold-val">R$ {quarterlyPassive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
            </motion.div>

            <motion.p className="lp-sim-disclaimer" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              * Projeções baseadas em dados históricos de mobilidade urbana. Ganhos reais dependem da conversão e retenção da sua rede.
            </motion.p>
            <motion.button className="lp-cta-btn lp-cta-lg" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} onClick={handleCta}>
              Iniciar Construção de Ativos →
            </motion.button>
          </div>

          <motion.div className="lp-sim-right" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <img src="/zomp_driver_network.png" alt="Zomp Business Model" className="lp-sim-img" />
            <div className="lp-sim-pill">
              <span className="lp-sim-pill-val">+R$ {yearlyPassive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / ano</span>
              <span className="lp-sim-pill-lbl">Renda Extra Passiva Estimada</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── POR QUE A ZOMP É DIFERENTE ── */}
      <section className="lp-why-section">
        <motion.h2 className="lp-section-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Vantagem Competitiva Zomp
        </motion.h2>
        <motion.p className="lp-section-sub" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Diferente das plataformas convencionais de gig economy, a Zomp opera em um modelo de ganho real, transformando você em um ponto de lucro central.
        </motion.p>

        <motion.div className="lp-compare-grid" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {/* ZOMP */}
          <motion.div className="lp-compare-zomp" variants={fadeUp}>
            <div className="lp-compare-brand zomp-brand">ZOMP MOBILIDADE</div>
            <ul className="lp-compare-list">
              {[
                'Taxa Operacional Fixa e Transparente',
                'Royalties de Rede (R$ 0,30 por viagem)',
                'Patrimônio Digital Vinculado (2 anos)',
                'Liquidação Trimestral de Dividendos',
                'Sistema Anti-Concorrência (Preço Imbatível)',
                'Suporte Corporativo Prioritário',
              ].map((item, i) => (
                <li key={i}><CheckCircle size={16} className="lp-check" /><span>{item}</span></li>
              ))}
            </ul>
            <div className="lp-compare-footer-zomp">💎 O Modelo mais Lucrativo do Brasil</div>
          </motion.div>

          {/* OUTROS */}
          <motion.div className="lp-compare-other" variants={fadeUp}>
            <div className="lp-compare-brand other-brand">MODELO TRADICIONAL</div>
            <ul className="lp-compare-list">
              {[
                'Taxas Variáveis e Abusivas',
                'Sem Participação nos Ganhos de Rede',
                'Renda Interrompida ao Parar o Veículo',
                'Sem Vínculo com a Base de Clientes',
                'Preços Arbitrários e Desfavoráveis',
                'Suporte Automatizado e Ineficiente',
              ].map((item, i) => (
                <li key={i}><XCircle size={16} className="lp-x" /><span>{item}</span></li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </section>

      <section className="lp-wallet-section">
        <div className="lp-wallet-wrap">
          <motion.div className="lp-wallet-img-wrap" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <img src="/zomp_driver_realistic.png" alt="Motorista Zomp" className="lp-wallet-img" />
          </motion.div>
          <motion.div className="lp-wallet-text" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.div className="lp-section-tag" variants={fadeUp}>💳 Carteira Zomp — Exemplo Estimado</motion.div>
            <motion.h2 className="lp-section-title lp-left-title" variants={fadeUp}>
              R$ 2.880 na conta<br /><span className="lp-accent">a cada 3 meses</span>
            </motion.h2>
            <motion.p className="lp-section-sub lp-left-sub" variants={fadeUp}>
              Sem dirigir uma corrida sequer. Esse é o poder de ter 400 clientes vinculados fazendo 2 corridas por semana na Zomp. Enquanto você descansa, R$ 0,30 por corrida vai direto pra sua carteira.
            </motion.p>
            <motion.div className="lp-wallet-stats" variants={fadeUp}>
              <div className="lp-wstat"><span className="lp-wstat-val">R$ 960</span><span className="lp-wstat-lbl">por mês</span></div>
              <div className="lp-wstat"><span className="lp-wstat-val">R$ 2.880</span><span className="lp-wstat-lbl">por trimestre</span></div>
              <div className="lp-wstat"><span className="lp-wstat-val">R$ 11.520</span><span className="lp-wstat-lbl">ao ano</span></div>
            </motion.div>
            <motion.p className="lp-sim-disclaimer" variants={fadeUp}>
              * Projeção estimada de exemplo. Ganhos reais dependem da atividade da sua rede.
            </motion.p>
            <motion.button className="lp-cta-btn lp-cta-lg" variants={fadeUp} onClick={handleCta}>
              Abrir minha Carteira Zomp →
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-features-section">
        <motion.h2 className="lp-section-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>Por que escolher a Zomp?</motion.h2>
        <motion.div className="lp-features-grid" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {[
            { icon: <Gift size={26} />, title: 'Royalties Reais', desc: 'R$ 0,30 por corrida de cada cliente indicado. Acumula 24h por dia, 7 dias por semana.' },
            { icon: <Shield size={26} />, title: 'Segurança Total', desc: 'Monitoramento em tempo real e suporte humanizado 24h por dia.' },
            { icon: <Zap size={26} />, title: 'Preço Imbatível', desc: 'Cobrimos qualquer preço da concorrência e ainda damos desconto adicional.' },
            { icon: <Smartphone size={26} />, title: 'App Premium', desc: 'Interface fluida, GPS em tempo real e experiência mobile de alto nível.' },
          ].map((f, i) => (
            <motion.div key={i} className="lp-feat-card" variants={fadeUp}>
              <div className="lp-feat-icon">{f.icon}</div>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section className="lp-stats-section">
        <motion.div className="lp-stats-grid" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.div className="lp-stat" variants={fadeUp}><span className="lp-stat-val"><CountUp target={5000} suffix="+" /></span><span className="lp-stat-lbl">Vagas no RJ</span></motion.div>
          <motion.div className="lp-stat" variants={fadeUp}><span className="lp-stat-val">R$ 0,30</span><span className="lp-stat-lbl">Royalty por Corrida</span></motion.div>
          <motion.div className="lp-stat" variants={fadeUp}><span className="lp-stat-val">R$ 2.880</span><span className="lp-stat-lbl">Saque Trimestral Est.</span></motion.div>
          <motion.div className="lp-stat" variants={fadeUp}><span className="lp-stat-val">2 anos</span><span className="lp-stat-lbl">Vínculo Garantido</span></motion.div>
        </motion.div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="lp-final-cta">
        <motion.div className="lp-final-wrap" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp}>Vagas limitadas.<br /><span className="lp-accent">Garanta a sua agora.</span></motion.h2>
          <motion.p variants={fadeUp}>Seja um dos primeiros a garantir Royalties na Zomp no Rio de Janeiro e construa sua renda passiva enquanto outros ficam pra trás.</motion.p>
          <Countdown />
          <motion.button className="lp-cta-btn lp-cta-xl" variants={fadeUp} onClick={handleCta}>
            🚀 Fazer meu Pré-Cadastro Gratuito
          </motion.button>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-content">
          <img src="/logo.svg" alt="Zomp" className="lp-footer-logo" />
          <div className="lp-footer-info">
            <p>© 2026 Zomp Mobilidade Tecnológica. Todos os direitos reservados.</p>
            <p className="lp-footer-tagline">Infraestrutura Tecnológica para Mobilidade de Alto Impacto.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
