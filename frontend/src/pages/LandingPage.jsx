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
  const fadeUp = { hidden: { y: 30, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } } }
  const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } }

  return (
    <div className="lp-root">
      <div className="lp-ambient a1" /><div className="lp-ambient a2" />

      {/* ── NAVBAR ── */}
      <nav className="lp-nav">
        <img src="/logo.svg" alt="Zomp" className="lp-nav-logo" />
        <div className="lp-nav-links">
          <button onClick={() => navigate('/motorista')}>Motorista</button>
          <button onClick={() => navigate('/passageiro')}>Passageiro</button>
          <button onClick={() => document.getElementById('royalties-sec')?.scrollIntoView({ behavior: 'smooth' })}>Royalties</button>
        </div>
        <button className="lp-cta-btn" onClick={() => navigate('/motorista/cadastro')}>Fazer pré-cadastro</button>
      </nav>

      {/* ── HERO BANNER ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg">
          <img src="/zomp_driver_realistic.png" alt="" className="lp-hero-photo" />
          <div className="lp-hero-overlay" />
        </div>

        <div className="lp-hero-content">
          <motion.div className="lp-badge" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            🚀 Exclusivo Rio de Janeiro
          </motion.div>

          <motion.h1 className="lp-hero-h1" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
            Pare de trabalhar<br />só <span className="lp-accent">para o app.</span><br />Trabalhe para<br /><span className="lp-gold-text">você mesmo.</span>
          </motion.h1>

          <motion.p className="lp-hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }}>
            Além do que você ganha por corrida, receba <strong>R$ 0,30</strong> por cada corrida
            dos passageiros vinculados à sua conta — mesmo quando está descansando.
          </motion.p>

          <motion.div className="lp-hero-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            <button className="lp-cta-btn lp-cta-lg" onClick={() => navigate('/motorista/cadastro')}>
              Quero ser Motorista Parceiro →
            </button>
            <button className="lp-ghost-btn" onClick={() => navigate('/passageiro')}>
              Sou Passageiro
            </button>
          </motion.div>

          {/* Countdown */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
            <Countdown />
          </motion.div>

          <motion.div className="lp-vagas-alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
            <span className="lp-dot" />
            <span>Vagas limitadas — apenas cadastro de motoristas até 30 de junho</span>
          </motion.div>
        </div>

        <motion.div className="lp-scroll-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
          <ChevronDown size={18} /> <span>Veja o quanto você pode ganhar</span> <ChevronDown size={18} />
        </motion.div>
      </section>

      {/* ── ENTRADA ── */}
      <section className="lp-entry-section">
        <motion.div className="lp-entry-grid" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.div className="lp-entry-card lp-entry-driver" variants={fadeUp} onClick={() => navigate('/motorista')}>
            <div className="lp-entry-badge">⭐ Recomendado</div>
            <div className="lp-entry-icon"><TrendingUp size={32} /></div>
            <h3>Motorista Parceiro</h3>
            <p>Seja um <strong>sócio da plataforma</strong>. Ganhe por corrida <em>e</em> acumule renda passiva de <strong>R$ 0,30</strong> por cada corrida da sua rede indicada.</p>
            <div className="lp-entry-pill">💰 Renda passiva real</div>
            <div className="lp-entry-btn">Começar a Lucrar <ArrowRight size={18} /></div>
          </motion.div>
          <motion.div className="lp-entry-card" variants={fadeUp} onClick={() => navigate('/passageiro')}>
            <div className="lp-entry-icon"><User size={32} /></div>
            <h3>Passageiro</h3>
            <p>
              Peça seu motorista favorito para <strong>indicar você no app Zomp</strong> e aproveite o 
              sistema de <strong>Preço Imbatível</strong>: mostre o preço do Uber ou 99 e a Zomp garante 
              um valor mais baixo com desconto adicional direto na corrida.
            </p>
            <div className="lp-entry-pill-alt">🏷️ Menor preço garantido</div>
            <div className="lp-entry-btn-alt">Viajar Agora <ArrowRight size={18} /></div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── ROYALTIES HOW-IT-WORKS ── */}
      <section className="lp-how-section" id="royalties-sec">
        <motion.div className="lp-section-tag" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          💡 Como funciona a renda passiva
        </motion.div>
        <motion.h2 className="lp-section-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Seu dinheiro trabalhando<br /><span className="lp-accent">enquanto você descansa</span>
        </motion.h2>
        <motion.p className="lp-section-sub" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Cada passageiro que você indicar fica vinculado à sua conta por <strong>5 anos</strong>.
          A cada corrida que ele fizer, R$ 0,30 cai direto na sua carteira Zomp.
        </motion.p>
        <motion.div className="lp-how-grid" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {[
            { n: '01', title: 'Você indica um passageiro', desc: 'Compartilhe seu QR Code exclusivo ou link de cadastro com quem você quiser.' },
            { n: '02', title: 'Ele fica vinculado por 5 anos', desc: 'Toda vez que esse passageiro pedir uma corrida na Zomp, R$ 0,30 é creditado para você automaticamente.' },
            { n: '03', title: 'Você saca a cada 3 meses', desc: 'O saldo acumula na sua carteira Zomp e fica disponível para saque trimestral.' },
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
            <motion.div className="lp-section-tag" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              📊 Simulação de Ganhos — Valores Estimados de Exemplo
            </motion.div>
            <motion.h2 className="lp-section-title lp-left-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              400 passageiros.<br /><span className="lp-accent">2 corridas por semana.</span><br />Veja o resultado.
            </motion.h2>

            <motion.div className="lp-calc-table" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <div className="lp-calc-header"><span>Parâmetro</span><span>Valor</span></div>
              <div className="lp-calc-row"><span>Passageiros vinculados</span><strong>400</strong></div>
              <div className="lp-calc-row"><span>Corridas/semana por passageiro</span><strong>2 (ida + volta)</strong></div>
              <div className="lp-calc-row"><span>Royalty por corrida</span><strong className="lp-accent">R$ 0,30</strong></div>
              <div className="lp-calc-divider" />
              <div className="lp-calc-row"><span>Total de corridas/semana</span><strong>800</strong></div>
              <div className="lp-calc-row"><span>Total de corridas/mês</span><strong>3.200</strong></div>
              <div className="lp-calc-row lp-calc-sub"><span>Royalties por mês</span><strong className="lp-accent">R$ 960,00</strong></div>
              <div className="lp-calc-divider" />
              <div className="lp-calc-row lp-calc-total">
                <span>💰 Saque a cada 3 meses</span>
                <strong className="lp-gold-val"><CountUp target={2880} prefix="R$ " suffix=",00" duration={2000} /></strong>
              </div>
            </motion.div>

            <motion.p className="lp-sim-disclaimer" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              * Valores estimados de exemplo. Resultados reais variam conforme a atividade da sua rede.
            </motion.p>
            <motion.div className="lp-sim-footnote" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              ✅ Isso é só a renda passiva. O que você ganha dirigindo vem por cima disso.
            </motion.div>
            <motion.button className="lp-cta-btn lp-cta-lg" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} onClick={() => navigate('/motorista/cadastro')}>
              Quero construir minha rede →
            </motion.button>
          </div>

          <motion.div className="lp-sim-right" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <img src="/zomp_driver_network.png" alt="Rede de royalties Zomp" className="lp-sim-img" />
            <p className="lp-img-caption">* Ilustração de exemplo com 400 passageiros vinculados</p>
            <div className="lp-sim-pill">
              <span className="lp-sim-pill-val">+R$ 2.880</span>
              <span className="lp-sim-pill-lbl">saque trimestral estimado de royalties</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── POR QUE A ZOMP É DIFERENTE ── */}
      <section className="lp-why-section">
        <motion.h2 className="lp-section-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Por que a Zomp é diferente?
        </motion.h2>
        <motion.p className="lp-section-sub" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Enquanto outros apps lucram com o seu tempo, a Zomp foi criada para que o motorista seja o verdadeiro beneficiado — com renda ativa e passiva ao mesmo tempo.
        </motion.p>

        <motion.div className="lp-compare-grid" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {/* ZOMP */}
          <motion.div className="lp-compare-zomp" variants={fadeUp}>
            <div className="lp-compare-brand zomp-brand">ZOMP</div>
            <ul className="lp-compare-list">
              {[
                'Taxa fixa por corrida — sem surpresas',
                'R$ 0,30 de royalty por cada corrida indicada',
                'Renda passiva acumulada na carteira',
                'Saque garantido a cada 3 meses',
                'Vínculo de 5 anos com seus passageiros',
                'Preço imbatível para os passageiros',
                'Você é sócio, não apenas prestador',
              ].map((item, i) => (
                <li key={i}><CheckCircle size={16} className="lp-check" /><span>{item}</span></li>
              ))}
            </ul>
            <div className="lp-compare-footer-zomp">🏆 Seu futuro financeiro começa aqui</div>
          </motion.div>

          {/* OUTROS */}
          <motion.div className="lp-compare-other" variants={fadeUp}>
            <div className="lp-compare-brand other-brand">UBER / 99</div>
            <ul className="lp-compare-list">
              {[
                'Taxas variáveis — sobem sem avisar',
                'Zero royalties por indicação',
                'Renda para quando você para de dirigir',
                'Nenhum saque de renda passiva',
                'Sem vínculo de longo prazo',
                'Preços nem sempre competitivos',
                'Você trabalha para o app lucrar',
              ].map((item, i) => (
                <li key={i}><XCircle size={16} className="lp-x" /><span>{item}</span></li>
              ))}
            </ul>
            <div className="lp-compare-footer-other">⏳ Seu tempo trocado por dinheiro</div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── MOTORISTA / CARTEIRA ── */}
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
              Sem dirigir uma corrida sequer. Esse é o poder de ter 400 passageiros fazendo 2 corridas por semana na Zomp. Enquanto você descansa, R$ 0,30 por corrida vai direto pra sua carteira.
            </motion.p>
            <motion.div className="lp-wallet-stats" variants={fadeUp}>
              <div className="lp-wstat"><span className="lp-wstat-val">R$ 960</span><span className="lp-wstat-lbl">por mês</span></div>
              <div className="lp-wstat"><span className="lp-wstat-val">R$ 2.880</span><span className="lp-wstat-lbl">por trimestre</span></div>
              <div className="lp-wstat"><span className="lp-wstat-val">R$ 11.520</span><span className="lp-wstat-lbl">ao ano</span></div>
            </motion.div>
            <motion.p className="lp-sim-disclaimer" variants={fadeUp}>
              * Projeção estimada de exemplo. Ganhos reais dependem da atividade da sua rede.
            </motion.p>
            <motion.button className="lp-cta-btn lp-cta-lg" variants={fadeUp} onClick={() => navigate('/motorista/cadastro')}>
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
            { icon: <Gift size={26} />, title: 'Royalties Reais', desc: 'R$ 0,30 por corrida de cada passageiro indicado. Acumula 24h por dia, 7 dias por semana.' },
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
          <motion.div className="lp-stat" variants={fadeUp}><span className="lp-stat-val">5 anos</span><span className="lp-stat-lbl">Vínculo Garantido</span></motion.div>
        </motion.div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="lp-final-cta">
        <motion.div className="lp-final-wrap" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp}>Vagas limitadas.<br /><span className="lp-accent">Garanta a sua agora.</span></motion.h2>
          <motion.p variants={fadeUp}>Seja um dos primeiros motoristas parceiros da Zomp no Rio de Janeiro e construa sua renda passiva enquanto outros ficam pra trás.</motion.p>
          <Countdown />
          <motion.button className="lp-cta-btn lp-cta-xl" variants={fadeUp} onClick={() => navigate('/motorista/cadastro')}>
            🚀 Fazer meu Pré-Cadastro Gratuito
          </motion.button>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <img src="/logo.svg" alt="Zomp" className="lp-footer-logo" />
        <p>© 2026 Zomp Mobilidade Tecnológica. Feito com ❤️ no Rio de Janeiro.</p>
      </footer>
    </div>
  )
}
