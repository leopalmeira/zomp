import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { Car, User, Shield, Zap, TrendingUp, ArrowRight, Gift, Smartphone, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import './LandingPage.css'

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

export default function LandingPage() {
  const navigate = useNavigate()

  const fadeUp = {
    hidden: { y: 40, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } }
  }
  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  }

  return (
    <div className="lp-root">
      {/* Ambient background */}
      <div className="lp-ambient a1" />
      <div className="lp-ambient a2" />
      <div className="lp-ambient a3" />

      {/* ── NAVBAR ── */}
      <nav className="lp-nav">
        <img src="/logo.svg" alt="Zomp" className="lp-nav-logo" />
        <div className="lp-nav-links">
          <button onClick={() => navigate('/motorista')}>Motorista</button>
          <button onClick={() => navigate('/passageiro')}>Passageiro</button>
          <button onClick={() => document.getElementById('royalties-section').scrollIntoView({ behavior: 'smooth' })}>Royalties</button>
        </div>
        <button className="lp-cta-btn" onClick={() => navigate('/motorista/cadastro')}>
          Quero ser Parceiro →
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <motion.div className="lp-hero-badge" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          🚀 Exclusivo Rio de Janeiro · Vagas Limitadas
        </motion.div>

        <motion.h1 className="lp-hero-h1" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
          Pare de trabalhar<br />só <span className="lp-accent">para o app.</span><br />Trabalhe para<br /><span className="lp-accent-gold">você mesmo.</span>
        </motion.h1>

        <motion.p className="lp-hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }}>
          Na Zomp, além do que você ganha por corrida, você recebe <strong>R$ 0,30</strong> por cada
          corrida dos passageiros vinculados à sua conta — mesmo quando está dormindo.
        </motion.p>

        <motion.div className="lp-hero-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }}>
          <button className="lp-cta-btn lp-cta-lg" onClick={() => navigate('/motorista/cadastro')}>
            Quero ser Motorista Parceiro →
          </button>
          <button className="lp-ghost-btn" onClick={() => navigate('/passageiro')}>
            Sou Passageiro
          </button>
        </motion.div>

        <motion.div className="lp-hero-stats" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1 }}>
          <div className="lp-hero-stat">
            <span className="lp-hero-stat-val">R$ 0,30</span>
            <span className="lp-hero-stat-lbl">por corrida indicada</span>
          </div>
          <div className="lp-hero-stat-divider" />
          <div className="lp-hero-stat">
            <span className="lp-hero-stat-val">5 anos</span>
            <span className="lp-hero-stat-lbl">de vínculo garantido</span>
          </div>
          <div className="lp-hero-stat-divider" />
          <div className="lp-hero-stat">
            <span className="lp-hero-stat-val">5.000</span>
            <span className="lp-hero-stat-lbl">vagas abertas no RJ</span>
          </div>
        </motion.div>

        <motion.div className="lp-scroll-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
          <ChevronDown size={20} />
          <span>Veja o quanto você pode ganhar</span>
          <ChevronDown size={20} />
        </motion.div>
      </section>

      {/* ── ENTRY CARDS ── */}
      <section className="lp-entry-section">
        <motion.div className="lp-entry-grid" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.div className="lp-entry-card lp-entry-driver" variants={fadeUp} onClick={() => navigate('/motorista')}>
            <div className="lp-entry-badge">⭐ Recomendado</div>
            <div className="lp-entry-icon"><TrendingUp size={36} /></div>
            <h3>Motorista Parceiro</h3>
            <p>Seja um <strong>sócio da plataforma</strong>. Ganhe por corrida <em>e</em> acumule renda passiva de R$ 0,30 por cada corrida da sua rede.</p>
            <div className="lp-entry-pill">💰 Renda passiva real</div>
            <div className="lp-entry-btn">Começar a Lucrar <ArrowRight size={18} /></div>
          </motion.div>

          <motion.div className="lp-entry-card" variants={fadeUp} onClick={() => navigate('/passageiro')}>
            <div className="lp-entry-icon"><User size={36} /></div>
            <h3>Passageiro</h3>
            <p>Viaje com <strong>preço imbatível</strong>. Se o Uber ou 99 estiver mais barato, a Zomp cobre e ainda dá mais desconto.</p>
            <div className="lp-entry-pill">🏷️ Menor preço garantido</div>
            <div className="lp-entry-btn">Viajar Agora <ArrowRight size={18} /></div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── ROYALTIES SECTION ── */}
      <section className="lp-royalties-section" id="royalties-section">
        <motion.div className="lp-section-tag" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          💡 Como funciona a renda passiva
        </motion.div>
        <motion.h2 className="lp-section-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Seu dinheiro trabalhando<br /><span className="lp-accent">enquanto você descansa</span>
        </motion.h2>
        <motion.p className="lp-section-sub" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Cada passageiro que você indicar fica vinculado à sua conta por <strong>5 anos</strong>. 
          A cada corrida que ele fizer — com qualquer motorista — R$ 0,30 cai direto na sua carteira Zomp.
        </motion.p>

        <div className="lp-how-grid">
          <motion.div className="lp-how-step" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="lp-how-num">01</div>
            <h4>Você indica um passageiro</h4>
            <p>Compartilhe seu QR Code exclusivo ou link de cadastro com amigos, família ou qualquer pessoa.</p>
          </motion.div>
          <motion.div className="lp-how-step" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="lp-how-num">02</div>
            <h4>Ele fica vinculado por 5 anos</h4>
            <p>Toda vez que esse passageiro pedir uma corrida na Zomp, o sistema registra e credita R$ 0,30 para você.</p>
          </motion.div>
          <motion.div className="lp-how-step" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="lp-how-num">03</div>
            <h4>Você saca a cada 3 meses</h4>
            <p>O saldo acumula na sua carteira Zomp e fica disponível para saque a cada trimestre.</p>
          </motion.div>
        </div>
      </section>

      {/* ── SIMULADOR / TABELA COMPARATIVA ── */}
      <section className="lp-sim-section">
        <div className="lp-sim-wrap">

          <div className="lp-sim-left">
            <motion.div className="lp-section-tag" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              📊 Simulação de Ganhos — Valores Estimados de Exemplo
            </motion.div>
            <motion.h2 className="lp-section-title lp-left-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              400 passageiros.<br /><span className="lp-accent">2 corridas por semana.</span><br />Veja o resultado.
            </motion.h2>

            {/* Tabela comparativa */}
            <motion.div className="lp-calc-table" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <div className="lp-calc-header">
                <span>📌 Parâmetro</span>
                <span>🔢 Valor</span>
              </div>
              <div className="lp-calc-row">
                <span>Passageiros vinculados</span>
                <strong>400</strong>
              </div>
              <div className="lp-calc-row">
                <span>Corridas por passageiro/semana</span>
                <strong>2 × <em>(ida + volta)</em></strong>
              </div>
              <div className="lp-calc-row">
                <span>Royalty por corrida</span>
                <strong className="lp-accent">R$ 0,30</strong>
              </div>
              <div className="lp-calc-divider" />
              <div className="lp-calc-row">
                <span>Corridas totais/semana</span>
                <strong>800</strong>
              </div>
              <div className="lp-calc-row">
                <span>Corridas totais/mês <em>(× 4 sem.)</em></span>
                <strong>3.200</strong>
              </div>
              <div className="lp-calc-row lp-calc-sub">
                <span>Royalties por mês</span>
                <strong className="lp-accent">R$ 960,00</strong>
              </div>
              <div className="lp-calc-divider" />
              <div className="lp-calc-row lp-calc-total">
                <span>💰 Saque a cada 3 meses</span>
                <strong className="lp-gold">
                  <CountUp target={2880} prefix="R$ " suffix=",00" duration={2000} />
                </strong>
              </div>
            </motion.div>

            <motion.p className="lp-sim-info" style={{marginBottom:'4px'}}>* Valores estimados de exemplo. Resultados reais variam conforme o número de corridas dos passageiros.</motion.p>
            <motion.div className="lp-sim-footnote" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              ✅ Isso é apenas renda de royalties. Seu ganho por corridas dirigidas <strong>vem por cima</strong>.
            </motion.div>

            <motion.button className="lp-cta-btn lp-cta-lg" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} onClick={() => navigate('/motorista/cadastro')}>
              Quero construir minha rede →
            </motion.button>
          </div>

          <motion.div className="lp-sim-right" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="lp-img-glow" />
            <img src="/zomp_driver_network.png" alt="Rede de royalties Zomp" className="lp-sim-img" />
            <p style={{fontSize:'0.72rem', color:'var(--txt2)', textAlign:'center', marginTop:'10px', fontStyle:'italic'}}>* Ilustração de exemplo com 400 passageiros vinculados</p>
            <div className="lp-sim-pill">
              <span className="lp-sim-pill-val">+R$ 2.880</span>
              <span className="lp-sim-pill-lbl">saque trimestral só de royalties</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── COMPARATIVO ZOMP vs CONCORRÊNCIA ── */}
      <section className="lp-compare-section">
        <motion.h2 className="lp-section-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Por que a Zomp é diferente?
        </motion.h2>
        <motion.div className="lp-compare-grid" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>

          <motion.div className="lp-compare-card lp-compare-zomp" variants={fadeUp}>
            <div className="lp-compare-logo">ZOMP</div>
            <ul className="lp-compare-list">
              <li><CheckCircle size={18} className="lp-check" /> Taxa fixa baixa por corrida</li>
              <li><CheckCircle size={18} className="lp-check" /> <strong>R$ 0,30 de royalty por corrida indicada</strong></li>
              <li><CheckCircle size={18} className="lp-check" /> Renda passiva acumulada</li>
              <li><CheckCircle size={18} className="lp-check" /> Saque trimestral garantido</li>
              <li><CheckCircle size={18} className="lp-check" /> Vínculo de 5 anos com passageiros</li>
              <li><CheckCircle size={18} className="lp-check" /> Preço imbatível para passageiros</li>
              <li><CheckCircle size={18} className="lp-check" /> Você é sócio da plataforma</li>
            </ul>
            <div className="lp-compare-footer lp-compare-footer-zomp">🏆 Seu futuro financeiro</div>
          </motion.div>

          <motion.div className="lp-compare-card lp-compare-other" variants={fadeUp}>
            <div className="lp-compare-logo lp-compare-logo-other">UBER / 99</div>
            <ul className="lp-compare-list">
              <li><XCircle size={18} className="lp-x" /> Taxas variáveis (sobem sem avisar)</li>
              <li><XCircle size={18} className="lp-x" /> Zero royalties por indicação</li>
              <li><XCircle size={18} className="lp-x" /> Renda para quando você para</li>
              <li><XCircle size={18} className="lp-x" /> Nenhum saque de passivo</li>
              <li><XCircle size={18} className="lp-x" /> Sem vínculo de longo prazo</li>
              <li><XCircle size={18} className="lp-x" /> Preços nem sempre competitivos</li>
              <li><XCircle size={18} className="lp-x" /> Você trabalha para o app</li>
            </ul>
            <div className="lp-compare-footer lp-compare-footer-other">⏳ Tempo trocado por dinheiro</div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── MOTORISTA COM CARTEIRA ── */}
      <section className="lp-wallet-section">
        <div className="lp-wallet-wrap">
          <motion.div className="lp-wallet-img-wrap" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="lp-img-glow lp-glow-gold" />
            <img src="/zomp_driver_wallet.png" alt="Motorista Zomp com saldo na carteira" className="lp-wallet-img" />
          </motion.div>
          <motion.div className="lp-wallet-text" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.div className="lp-section-tag" variants={fadeUp}>💳 Carteira Zomp — Exemplo Estimado</motion.div>
            <motion.h2 className="lp-section-title lp-left-title" variants={fadeUp}>
              R$ 2.880 caindo<br />na sua conta<br /><span className="lp-accent">a cada 3 meses</span>
            </motion.h2>
            <motion.p className="lp-section-sub" variants={fadeUp}>
              Sem dirigir uma corrida sequer. Esse é o poder de ter <strong>400 passageiros</strong> fazendo 
              2 corridas por semana na Zomp. Enquanto você dorme, almoça ou passa tempo com a família, 
              R$ 0,30 por corrida vai direto pra sua carteira.
            </motion.p>
            <motion.div className="lp-wallet-stats" variants={fadeUp}>
              <div className="lp-wstat">
                <span className="lp-wstat-val">R$ 960</span>
                <span className="lp-wstat-lbl">por mês de royalties</span>
              </div>
              <div className="lp-wstat">
                <span className="lp-wstat-val">R$ 2.880</span>
                <span className="lp-wstat-lbl">por trimestre (saque)</span>
              </div>
              <div className="lp-wstat">
                <span className="lp-wstat-val">R$ 11.520</span>
                <span className="lp-wstat-lbl">ao ano de renda passiva</span>
              </div>
            </motion.div>
            <motion.p style={{fontSize:'0.78rem', color:'var(--txt2)', fontStyle:'italic', marginBottom:'16px'}} variants={fadeUp}>
              * Projeção estimada de exemplo. Ganhos reais dependem da atividade da sua rede de passageiros.
            </motion.p>
            <motion.button className="lp-cta-btn lp-cta-lg" variants={fadeUp} onClick={() => navigate('/motorista/cadastro')}>
              Abrir minha Carteira Zomp →
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-features-section">
        <motion.h2 className="lp-section-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          Por que escolher a Zomp?
        </motion.h2>
        <motion.div className="lp-features-grid" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {[
            { icon: <Gift size={28} />, title: 'Royalties Reais', desc: 'R$ 0,30 por corrida de cada passageiro indicado. Acumula 24h por dia, 7 dias por semana.' },
            { icon: <Shield size={28} />, title: 'Segurança Total', desc: 'Monitoramento em tempo real e suporte humanizado 24h.' },
            { icon: <Zap size={28} />, title: 'Preço Imbatível', desc: 'Para os passageiros: cobrimos qualquer preço da concorrência e ainda damos desconto.' },
            { icon: <Smartphone size={28} />, title: 'App Nativo Premium', desc: 'Interface fluida, GPS em tempo real e experiência mobile de alto nível.' },
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
          <motion.div className="lp-stat" variants={fadeUp}>
            <span className="lp-stat-val"><CountUp target={5000} suffix="+" /></span>
            <span className="lp-stat-lbl">Vagas no RJ</span>
          </motion.div>
          <motion.div className="lp-stat" variants={fadeUp}>
            <span className="lp-stat-val">R$ 0,30</span>
            <span className="lp-stat-lbl">Royalty por Corrida</span>
          </motion.div>
          <motion.div className="lp-stat" variants={fadeUp}>
            <span className="lp-stat-val"><CountUp target={2880} prefix="R$ " suffix=",00" /></span>
            <span className="lp-stat-lbl">Saque Trimestral Potencial</span>
          </motion.div>
          <motion.div className="lp-stat" variants={fadeUp}>
            <span className="lp-stat-val">5 anos</span>
            <span className="lp-stat-lbl">Vínculo Garantido</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="lp-final-cta">
        <motion.div className="lp-final-wrap" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp}>Vagas limitadas.<br /><span className="lp-accent">Garanta a sua agora.</span></motion.h2>
          <motion.p variants={fadeUp}>Seja um dos primeiros motoristas parceiros da Zomp no Rio de Janeiro e construa sua renda passiva de royalties enquanto outros ficam pra trás.</motion.p>
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
