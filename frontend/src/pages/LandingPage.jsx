import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, User, Shield, Zap, Gift, Smartphone, CheckCircle, 
  XCircle, ChevronDown, ArrowRight, Car, Bike, FileText, Camera, 
  Check, X, Lock, Phone, CreditCard, AlertCircle, Sparkles 
} from 'lucide-react'
import { driverPreRegister, getPublicConfig } from '../services/api'
import './LandingPage.css'

/* ── Count-up animation ── */
function CountUp({ target = 5000, prefix = '', suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const ref = React.useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    let start = 0
    const finalTarget = Number(target) || 5000
    const step = finalTarget / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= finalTarget) { setCount(finalTarget); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target, duration])
  return <span ref={ref}>{prefix}{count.toLocaleString('pt-BR')}{suffix}</span>
}

/* ── Countdown com Data Fixa Configurável no Painel Admin ── */
function Countdown({ targetDate }) {
  const parseTarget = (val) => {
    if (!val) return new Date('2026-06-30T23:59:59-03:00')
    if (typeof val === 'string' && val.length === 10) {
      return new Date(`${val}T23:59:59-03:00`)
    }
    const d = new Date(val)
    return isNaN(d.getTime()) ? new Date('2026-06-30T23:59:59-03:00') : d
  }

  const [diff, setDiff] = useState(() => {
    const t = parseTarget(targetDate)
    return Math.max(0, t - new Date())
  })

  useEffect(() => {
    const newTarget = parseTarget(targetDate)
    setDiff(Math.max(0, newTarget - new Date()))

    const t = setInterval(() => {
      const remaining = Math.max(0, newTarget - new Date())
      setDiff(remaining)
    }, 1000)
    return () => clearInterval(t)
  }, [targetDate])

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
  const [passengers, setPassengers] = useState(1000)
  const [systemConfig, setSystemConfig] = useState({
    driverSlots: 5000,
    bindingMonthsFirst: 12,
    launchDate: '2026-06-30',
    royaltyPerRide: 0.30,
    pricePerCredit: 1.50
  })

  useEffect(() => {
    getPublicConfig().then(data => {
      if (data && !data.error) {
        setSystemConfig(prev => ({
          ...prev,
          ...data,
          driverSlots: data.driverSlots ? parseInt(data.driverSlots) : prev.driverSlots,
          bindingMonthsFirst: data.bindingMonthsFirst ? parseInt(data.bindingMonthsFirst) : prev.bindingMonthsFirst,
          launchDate: data.launchDate || data.preRegisterEndDate || prev.launchDate,
          royaltyPerRide: data.royaltyPerRide ? parseFloat(data.royaltyPerRide) : prev.royaltyPerRide
        }))
      }
    })
  }, [])

  const bindingYears = Math.max(1, Math.round((systemConfig.bindingMonthsFirst || 12) / 12))
  const bindingYearsText = `${bindingYears} ${bindingYears === 1 ? 'ano' : 'anos'}`

  // Estados do Modal de Pré-Cadastro do Motorista
  const [showPreRegisterModal, setShowPreRegisterModal] = useState(false)
  const [preRegStep, setPreRegStep] = useState(1)
  const [preRegLoading, setPreRegLoading] = useState(false)
  const [preRegError, setPreRegError] = useState('')
  const [preRegSuccess, setPreRegSuccess] = useState(false)
  const [registeredUser, setRegisteredUser] = useState(null)

  const [preRegForm, setPreRegForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    pixKey: '',
    vehicleType: 'car',
    carModel: '',
    carPlate: '',
    carColor: '',
    photo: null,
    photoPreview: null,
    cnh: null,
    cnhPreview: null,
    crlv: null,
    crlvPreview: null
  })

  // Converter arquivo para base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }

  const handleFileChange = async (e, field) => {
    const file = e.target.files[0]
    if (file) {
      const base64 = await fileToBase64(file)
      setPreRegForm(prev => ({
        ...prev,
        [field]: base64,
        [`${field}Preview`]: URL.createObjectURL(file)
      }))
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setPreRegForm(prev => ({ ...prev, [name]: value }))
  }

  const openPreRegister = () => {
    setPreRegError('')
    setPreRegSuccess(false)
    setPreRegStep(1)
    setShowPreRegisterModal(true)
  }

  const handlePreRegSubmit = async (e) => {
    if (e) e.preventDefault()
    setPreRegError('')
    setPreRegLoading(true)
    try {
      const payload = {
        name: preRegForm.name,
        email: preRegForm.email,
        password: preRegForm.password,
        phone: preRegForm.phone,
        pixKey: preRegForm.pixKey,
        vehicleType: preRegForm.vehicleType,
        carModel: preRegForm.carModel,
        carPlate: preRegForm.carPlate ? preRegForm.carPlate.toUpperCase().trim() : '',
        carColor: preRegForm.carColor,
        photo: preRegForm.photo,
        cnh: preRegForm.cnh,
        crlv: preRegForm.crlv
      }

      const res = await driverPreRegister(payload)
      setRegisteredUser(res.user)
      setPreRegSuccess(true)
    } catch (err) {
      setPreRegError(err.message || 'Erro ao enviar pré-cadastro. Verifique os dados.')
    } finally {
      setPreRegLoading(false)
    }
  }

  // Simulation Logic: 3 rides/week per passenger, 4 weeks/month, R$ 0.30 royalty
  const monthlyPassive = passengers * 3 * 4 * 0.30
  const yearlyPassive = monthlyPassive * 12

  const fadeUp = { hidden: { y: 30, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' } } }
  const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } }

  const handleCta = async () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt = null;
    }
    openPreRegister()
  }

  return (
    <div className="lp-root">
      <div className="lp-ambient a1" /><div className="lp-ambient a2" />

      {/* ── NAVBAR ── */}
      <nav className="lp-nav" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
        <img src="/logo.svg" alt="Zomp" className="lp-nav-logo" />
        <div className="lp-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <button onClick={() => document.getElementById('royalties-sec')?.scrollIntoView({ behavior: 'smooth' })}>Renda Passiva</button>
          <button onClick={() => navigate('/motorista')} style={{ color: 'var(--green)', fontSize: '0.85rem', background: 'rgba(151, 233, 0, 0.08)', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--green-dim)' }}>🚗 Entrar como Motorista</button>
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
            <span className="lp-text-white">POR QUE VOCÊ AINDA VAI FICAR</span><br />
            <span className="lp-text-green">FAZENDO CORRIDAS PELOS CONCORRENTES,</span><br />
            <span className="lp-text-red">QUE NÃO TE DÁ</span> <br/>
            <span className="lp-text-yellow">RENDA PASSIVA</span> <br/>
            <span className="lp-text-white">DE ROYALTIES TODOS OS DIAS?</span>
          </motion.h1>

          <motion.p className="lp-hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }}>
            No final do dia, você se cansa, o aplicativo lucra, e você começa do zero no dia seguinte.<br/>
            <strong className="lp-text-mude">MUDE ISSO. MUDE PARA A ZOMP!</strong>
          </motion.p>

          <motion.div 
            className="lp-reflection-box"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <p className="lp-reflection-text">
              "Para que rodar na Uber ou 99 se ao chegar em casa seus ganhos param? 
              <motion.span 
                className="lp-reflection-highlight"
                animate={{ 
                  scale: [1, 1.05, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                ONDE ESTÁ A LÓGICA NISSO?
              </motion.span>"
            </p>
          </motion.div>

          <motion.div className="lp-hero-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            <button className="lp-cta-btn lp-cta-lg" onClick={handleCta}>
              Ativar minha Renda Passiva →
            </button>
          </motion.div>

          {/* Countdown */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
            <Countdown targetDate={systemConfig.launchDate} />
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

      {/* ── ACESSO RÁPIDO MOTORISTA ── */}
      <section className="lp-entry-section">
        <div className="lp-entry-wrapper">
          <motion.div className="lp-section-tag lp-tag-vibrant" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            🚗 Plataforma do Motorista Zomp
          </motion.div>
          <motion.h2 className="lp-entry-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            Comece a dirigir e <span className="lp-accent">lucrar agora</span>
          </motion.h2>
          <motion.p className="lp-entry-subtitle" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            Chega de trabalhar apenas para enriquecer plataformas convencionais. Acesse o aplicativo do motorista parceiro, valide seus dados e comece a acumular royalties diários com a sua própria rede.
          </motion.p>
          
          <motion.div 
            className="lp-entry-grid"
            variants={stagger} 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true }}
          >
            {/* Card Motorista Principal */}
            <motion.div 
              className="lp-entry-card lp-entry-driver" 
              variants={fadeUp} 
              onClick={() => navigate('/motorista')}
            >
              <div className="lp-entry-header">
                <div className="lp-entry-badge">💎 Renda Passiva + Taxa Fixa</div>
                <div className="lp-entry-icon"><TrendingUp size={28} /></div>
              </div>
              <h3 className="lp-entry-card-title">App do Motorista Parceiro</h3>
              <p className="lp-entry-card-desc">
                Dirija com taxa fixa de apenas <strong>R$ 1,50 por corrida</strong> e receba <strong>R$ 0,30 de royalties</strong> em todas as viagens dos passageiros vinculados à sua rede.
              </p>
              <div className="lp-entry-features">
                <div className="lp-entry-feat-item">✓ Pagamento mensal via PIX</div>
                <div className="lp-entry-feat-item">✓ Mínimo de 65 corridas/semana</div>
                <div className="lp-entry-feat-item">✓ Sem taxas variáveis abusivas</div>
              </div>
              <div className="lp-entry-btn">
                <span>Acessar App do Motorista</span>
                <ArrowRight size={18} />
              </div>
            </motion.div>
          </motion.div>
        </div>
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
          <br/><strong>* Requisito: Completar no mínimo 65 corridas por semana para manter o direito aos Royalties.</strong>
          <br/><span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Os pagamentos de royalties são realizados mensalmente (a cada 30 dias) via PIX. O valor recebido depende da quantidade de clientes vinculados à sua carteira e da frequência de corridas deles.</span>
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

      {/* ── ESTRATÉGIA DE VINCULAÇÃO DE PASSAGEIROS ── */}
      <section className="lp-capture-section">
        <div className="lp-capture-wrap">
          <motion.div className="lp-section-tag lp-tag-gold" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            🚀 Estratégia de Captação & Fidelização
          </motion.div>
          <motion.h2 className="lp-section-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            Traga seus passageiros das outras plataformas<br /><span className="lp-accent">com Desconto Imbatível e garanta até 1.000 clientes</span>
          </motion.h2>
          <motion.p className="lp-section-sub" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            Você já transporta dezenas de passageiros todos os dias pela Uber, 99 ou Táxi. Na Zomp, você pode oferecer a eles a primeira viagem com um desconto imbatível. Ao realizarem a corrida com o seu QR Code/link, eles ficam vinculados a você por até {bindingYearsText}!
          </motion.p>

          <motion.div className="lp-capture-grid" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.div className="lp-capture-card" variants={fadeUp}>
              <div className="lp-cap-step">01</div>
              <div className="lp-cap-icon-box"><Sparkles size={26} /></div>
              <h4>Apresente o Desconto Imbatível</h4>
              <p>Durante a corrida na outra plataforma, mostre que a Zomp é até 25% mais em conta para o passageiro, sem preços dinâmicos abusivos e com suporte humano.</p>
            </motion.div>

            <motion.div className="lp-capture-card" variants={fadeUp}>
              <div className="lp-cap-step">02</div>
              <div className="lp-cap-icon-box"><Smartphone size={26} /></div>
              <h4>Realize a 1ª Corrida pela Zomp</h4>
              <p>O passageiro escaneia seu QR Code no veículo ou acessa seu link de indicação, cria sua conta em segundos e chama a primeira corrida com super desconto.</p>
            </motion.div>

            <motion.div className="lp-capture-card" variants={fadeUp}>
              <div className="lp-cap-step">03</div>
              <div className="lp-cap-icon-box"><Lock size={26} /></div>
              <h4>Passageiro Vinculado por {bindingYearsText}</h4>
              <p>A partir dessa primeira viagem, o cliente está vinculado à sua rede. Toda corrida futura que ele fizer — com você ou qualquer outro motorista — gera <strong>R$ {systemConfig.royaltyPerRide.toFixed(2).replace('.', ',')}</strong> pra você!</p>
            </motion.div>

            <motion.div className="lp-capture-card" variants={fadeUp}>
              <div className="lp-cap-step">04</div>
              <div className="lp-cap-icon-box"><TrendingUp size={26} /></div>
              <h4>Meta: 1.000 Passageiros</h4>
              <p>Indicando de 3 a 5 passageiros por dia, você atinge a meta de <strong>1.000 clientes vinculados</strong>. Com eles realizando em média <strong>3 pedidos por semana</strong> pela Zomp, você alcança até <strong>R$ 3.600,00/mês</strong> em royalties via PIX.</p>
            </motion.div>
          </motion.div>

          <motion.div className="lp-capture-highlight-box" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="lp-cap-hl-content">
              <div>
                <span className="lp-cap-badge">⚡ A Revolução do Motorista Parceiro</span>
                <h3>Transforme cada corrida passageira em um ativo que paga royalties</h3>
                <p>Nas outras plataformas o cliente desembarca e você volta à estaca zero. Na Zomp, cada passageiro fidelizado se transforma em renda passiva recorrente depositada na sua conta.</p>
              </div>
              <button className="lp-cta-btn lp-cta-lg" onClick={handleCta}>
                Garantir Minha Vaga de Motorista →
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SIMULADOR ── */}
      <section className="lp-sim-section">
        <div className="lp-sim-wrap">
          <div className="lp-sim-left">
            <motion.div className="lp-section-tag lp-tag-vibrant" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              💰 Simulador Oficial de Ganhos
            </motion.div>
            <motion.h2 className="lp-section-title lp-left-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              Alavancagem de Ganhos<br /><span className="lp-accent">com até 1.000 passageiros vinculados.</span>
            </motion.h2>

            <motion.div className="lp-calc-table" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <div className="lp-simulator-header">
                <div className="lp-sim-top-row">
                  <span className="lp-sim-slider-label">Passageiros na sua Rede:</span>
                  <span className="lp-sim-count-badge"><strong>{passengers}</strong> / 1.000</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={passengers}
                  onChange={(e) => setPassengers(parseInt(e.target.value))}
                  className="lp-slider"
                  aria-label="Quantidade de passageiros vinculados"
                />

                {/* Presets Rápidos */}
                <div className="lp-sim-presets">
                  <span className="lp-preset-title">Atalhos rápidos:</span>
                  <div className="lp-preset-btns">
                    {[100, 300, 500, 1000].map(val => (
                      <button
                        key={val}
                        type="button"
                        className={`lp-preset-btn ${passengers === val ? 'active' : ''}`}
                        onClick={() => setPassengers(val)}
                      >
                        {val === 1000 ? '⭐ 1.000 (Meta)' : `${val}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lp-calc-header"><span>Métrica Operacional</span><span>Valor Estimado</span></div>
              <div className="lp-calc-row"><span>Clientes Ativos na Rede</span><strong>{passengers.toLocaleString('pt-BR')}</strong></div>
              <div className="lp-calc-row"><span>Frequência Semanal Média</span><strong>3 viagens / semana</strong></div>
              <div className="lp-calc-row"><span>Royalty por Operação</span><strong className="lp-accent">R$ 0,30</strong></div>
              <div className="lp-calc-divider" />
              <div className="lp-calc-row"><span>Volume de Viagens / Mês</span><strong>{(passengers * 3 * 4).toLocaleString('pt-BR')} corridas</strong></div>
              <div className="lp-calc-row lp-calc-sub"><span>Rendimento Mensal Passivo</span><strong className="lp-accent">R$ {monthlyPassive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
              <div className="lp-calc-divider" />
              <div className="lp-calc-row lp-calc-total">
                <span>💰 Saque Disponível a cada 30 dias</span>
                <strong className="lp-gold-val">R$ {monthlyPassive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="lp-sim-notice-card">
                <div className="lp-notice-icon">📅</div>
                <div className="lp-notice-text">
                  <strong style={{ color: '#97E900' }}>Pagamento mensal (a cada 30 dias) via PIX.</strong> Para receber, é necessário completar no mínimo 65 corridas por semana. O valor é aproximado e depende da carteira de clientes vinculados a você.
                </div>
              </div>
            </motion.div>

            <motion.p className="lp-sim-disclaimer" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              * Valores aproximados baseados na média de 3 corridas/semana por passageiro. Ganhos reais creditados a cada 30 dias via PIX. Mínimo de 65 corridas/semana para ativar o recebimento.
            </motion.p>
            <motion.button className="lp-cta-btn lp-cta-lg" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} onClick={handleCta}>
              Iniciar Construção de Ativos →
            </motion.button>
          </div>

          <motion.div className="lp-sim-right" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <img src="/zomp_network_v5.png" alt="Modelo de Negócios Zomp" className="lp-sim-img" />
            <div className="lp-sim-pill">
              <span className="lp-sim-pill-val">+R$ {yearlyPassive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / ano</span>
              <span className="lp-sim-pill-lbl">Renda Extra Passiva Estimada ({passengers} passageiros)</span>
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
                `Royalties de Rede (R$ ${systemConfig.royaltyPerRide.toFixed(2).replace('.', ',')} por viagem)`,
                'Mínimo de 65 corridas/semana para manter Royalties',
                `Patrimônio Digital Vinculado (${bindingYearsText})`,
                'Saque de Royalties a cada 30 dias via PIX',
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
              Até R$ 3.600 na conta<br /><span className="lp-accent">todo mês (a cada 30 dias)</span>
            </motion.h2>
            <motion.p className="lp-section-sub lp-left-sub" variants={fadeUp}>
              Com 1.000 clientes vinculados fazendo 3 corridas por semana, R$ 0,30 por corrida vai direto pra sua carteira Zomp. O saque é liberado a cada 30 dias via PIX.
            </motion.p>
            <motion.div className="lp-wallet-stats" variants={fadeUp}>
              <div className="lp-wstat"><span className="lp-wstat-val">~R$ 3.600</span><span className="lp-wstat-lbl">por mês</span></div>
              <div className="lp-wstat"><span className="lp-wstat-val">~R$ 43.200</span><span className="lp-wstat-lbl">ao ano</span></div>
              <div className="lp-wstat"><span className="lp-wstat-val">65</span><span className="lp-wstat-lbl">corridas/semana mín.</span></div>
            </motion.div>
            <motion.p className="lp-sim-disclaimer" variants={fadeUp}>
              * Valores aproximados. O valor real depende da quantidade de clientes vinculados à sua carteira e da frequência de viagens deles. Mínimo de 65 corridas/semana para ativar o recebimento dos Royalties.
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
          <motion.div className="lp-stat" variants={fadeUp}><span className="lp-stat-val"><CountUp target={systemConfig.driverSlots} suffix="+" /></span><span className="lp-stat-lbl">Vagas no RJ</span></motion.div>
          <motion.div className="lp-stat" variants={fadeUp}><span className="lp-stat-val">R$ {systemConfig.royaltyPerRide.toFixed(2).replace('.', ',')}</span><span className="lp-stat-lbl">Royalty por Corrida</span></motion.div>
          <motion.div className="lp-stat" variants={fadeUp}><span className="lp-stat-val">~R$ 3.600</span><span className="lp-stat-lbl">Saque Mensal Est.</span></motion.div>
          <motion.div className="lp-stat" variants={fadeUp}><span className="lp-stat-val">{bindingYearsText}</span><span className="lp-stat-lbl">Vínculo Garantido</span></motion.div>
        </motion.div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="lp-final-cta">
        <motion.div className="lp-final-wrap" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp}>Vagas limitadas.<br /><span className="lp-accent">Garanta a sua agora.</span></motion.h2>
          <motion.p variants={fadeUp}>Seja um dos primeiros a garantir Royalties na Zomp no Rio de Janeiro e construa sua renda passiva enquanto outros ficam pra trás.</motion.p>
          <Countdown targetDate={systemConfig.launchDate} />
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

      {/* ── MODAL INTERATIVO DE PRÉ-CADASTRO COMPLETO ── */}
      <AnimatePresence>
        {showPreRegisterModal && (
          <div className="lp-modal-overlay" onClick={() => setShowPreRegisterModal(false)}>
            <motion.div
              className="lp-modal-card"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="lp-modal-head">
                <div>
                  <div className="lp-modal-badge">
                    <Sparkles size={13} />
                    <span>Pré-Cadastro Pioneiro RJ</span>
                  </div>
                  <h3 className="lp-modal-title">Credenciamento de Motorista</h3>
                </div>
                <button
                  type="button"
                  className="lp-modal-close"
                  onClick={() => setShowPreRegisterModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Se sucesso */}
              {preRegSuccess ? (
                <div className="lp-success-screen">
                  <div className="lp-success-icon-wrap">
                    <CheckCircle size={48} color="#00E676" />
                  </div>
                  <h3 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 900, marginBottom: '8px' }}>
                    Pré-Cadastro Enviado com Sucesso! 🚀
                  </h3>
                  <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '20px' }}>
                    Parabéns, <strong>{registeredUser?.name || preRegForm.name}</strong>! Seus dados e documentos foram enviados para o <strong>Painel de Controle da Zomp</strong>.
                  </p>

                  <div className="lp-success-info-box">
                    <div className="lp-s-row">
                      <span>Status do Cadastro:</span>
                      <strong style={{ color: '#f59e0b' }}>⏳ Aguardando Aprovação</strong>
                    </div>
                    <div className="lp-s-row">
                      <span>Vaga Garantida:</span>
                      <strong style={{ color: '#00E676' }}>Rio de Janeiro (Pioneiro)</strong>
                    </div>
                    <div className="lp-s-row">
                      <span>Veículo / Placa:</span>
                      <strong>{preRegForm.carModel} ({preRegForm.carPlate.toUpperCase()})</strong>
                    </div>
                    <div className="lp-s-row">
                      <span>Royalties por Corrida:</span>
                      <strong style={{ color: '#00E676' }}>R$ 0,30 por passageiro indicado</strong>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '14px 0 20px', lineHeight: '1.4' }}>
                    Nossa equipe de suporte validará sua documentação no painel. Assim que a grande estreia do app for liberada, você já estará pronto para faturar!
                  </p>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      className="lp-cta-btn lp-cta-modal"
                      onClick={() => navigate('/motorista/dashboard')}
                    >
                      Acessar Meu Painel Zomp →
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulário Multi-Passos */
                <div>
                  {/* Barra de Progresso */}
                  <div className="lp-modal-stepper">
                    {[
                      { step: 1, label: 'Acesso & Contato' },
                      { step: 2, label: 'Veículo' },
                      { step: 3, label: 'Documentação' },
                    ].map((s) => (
                      <div
                        key={s.step}
                        className={`lp-step-pill ${preRegStep === s.step ? 'active' : preRegStep > s.step ? 'done' : ''}`}
                        onClick={() => {
                          if (preRegStep > s.step) setPreRegStep(s.step)
                        }}
                      >
                        <span className="lp-step-num">{preRegStep > s.step ? '✓' : s.step}</span>
                        <span className="lp-step-lbl">{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {preRegError && (
                    <div className="lp-error-alert">
                      <AlertCircle size={16} />
                      <span>{preRegError}</span>
                    </div>
                  )}

                  {/* PASSO 1: Dados Pessoais e Acesso */}
                  {preRegStep === 1 && (
                    <div className="lp-form-step animate-fade-in">
                      <div className="lp-input-group">
                        <label>Nome Completo *</label>
                        <input
                          type="text"
                          name="name"
                          placeholder="Como no documento"
                          value={preRegForm.name}
                          onChange={handleInputChange}
                          className="lp-modal-input"
                          required
                        />
                      </div>

                      <div className="lp-input-grid-2">
                        <div className="lp-input-group">
                          <label>E-mail *</label>
                          <input
                            type="email"
                            name="email"
                            placeholder="seu@email.com"
                            value={preRegForm.email}
                            onChange={handleInputChange}
                            className="lp-modal-input"
                            required
                          />
                        </div>
                        <div className="lp-input-group">
                          <label>Senha de Acesso *</label>
                          <input
                            type="password"
                            name="password"
                            placeholder="Mínimo 6 dígitos"
                            value={preRegForm.password}
                            onChange={handleInputChange}
                            className="lp-modal-input"
                            required
                            minLength={6}
                          />
                        </div>
                      </div>

                      <div className="lp-input-grid-2">
                        <div className="lp-input-group">
                          <label>WhatsApp / Telefone *</label>
                          <input
                            type="tel"
                            name="phone"
                            placeholder="(21) 99999-9999"
                            value={preRegForm.phone}
                            onChange={handleInputChange}
                            className="lp-modal-input"
                            required
                          />
                        </div>
                        <div className="lp-input-group">
                          <label>Chave PIX (Para Repasses) *</label>
                          <input
                            type="text"
                            name="pixKey"
                            placeholder="CPF, Telefone ou E-mail"
                            value={preRegForm.pixKey}
                            onChange={handleInputChange}
                            className="lp-modal-input"
                            required
                          />
                        </div>
                      </div>

                      <div className="lp-modal-actions">
                        <button
                          type="button"
                          className="lp-cta-btn lp-cta-modal"
                          disabled={!preRegForm.name || !preRegForm.email || !preRegForm.password || !preRegForm.phone}
                          onClick={() => {
                            if (!preRegForm.name || !preRegForm.email || !preRegForm.password || !preRegForm.phone) {
                              setPreRegError('Por favor, preencha todos os campos obrigatórios.')
                              return
                            }
                            setPreRegError('')
                            setPreRegStep(2)
                          }}
                        >
                          Avançar para Dados do Veículo →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PASSO 2: Veículo */}
                  {preRegStep === 2 && (
                    <div className="lp-form-step animate-fade-in">
                      <div className="lp-input-group">
                        <label>Categoria de Transporte *</label>
                        <div className="lp-vehicle-selector">
                          <div
                            className={`lp-veh-card ${preRegForm.vehicleType === 'car' ? 'selected' : ''}`}
                            onClick={() => setPreRegForm(p => ({ ...p, vehicleType: 'car' }))}
                          >
                            <Car size={26} color={preRegForm.vehicleType === 'car' ? '#00E676' : '#94a3b8'} />
                            <div>
                              <strong>Carro</strong>
                              <small>Corridas e Conforto</small>
                            </div>
                          </div>

                          <div
                            className={`lp-veh-card ${preRegForm.vehicleType === 'moto' ? 'selected' : ''}`}
                            onClick={() => setPreRegForm(p => ({ ...p, vehicleType: 'moto' }))}
                          >
                            <Bike size={26} color={preRegForm.vehicleType === 'moto' ? '#00E676' : '#94a3b8'} />
                            <div>
                              <strong>Moto</strong>
                              <small>Rapidez e Economia</small>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="lp-input-group">
                        <label>Modelo do Veículo *</label>
                        <input
                          type="text"
                          name="carModel"
                          placeholder={preRegForm.vehicleType === 'moto' ? 'Ex: Honda CG 160 Fan' : 'Ex: Chevrolet Onix 1.0'}
                          value={preRegForm.carModel}
                          onChange={handleInputChange}
                          className="lp-modal-input"
                          required
                        />
                      </div>

                      <div className="lp-input-grid-2">
                        <div className="lp-input-group">
                          <label>Placa do Veículo *</label>
                          <input
                            type="text"
                            name="carPlate"
                            placeholder="ABC-1234 ou ABC1D23"
                            value={preRegForm.carPlate}
                            onChange={(e) => setPreRegForm(p => ({ ...p, carPlate: e.target.value.toUpperCase() }))}
                            className="lp-modal-input"
                            required
                          />
                        </div>
                        <div className="lp-input-group">
                          <label>Cor *</label>
                          <input
                            type="text"
                            name="carColor"
                            placeholder="Ex: Prata, Preto, Vermelho"
                            value={preRegForm.carColor}
                            onChange={handleInputChange}
                            className="lp-modal-input"
                          />
                        </div>
                      </div>

                      <div className="lp-modal-actions-between">
                        <button
                          type="button"
                          className="lp-btn-back"
                          onClick={() => setPreRegStep(1)}
                        >
                          ← Voltar
                        </button>
                        <button
                          type="button"
                          className="lp-cta-btn lp-cta-modal"
                          disabled={!preRegForm.carModel || !preRegForm.carPlate}
                          onClick={() => {
                            if (!preRegForm.carModel || !preRegForm.carPlate) {
                              setPreRegError('Informe o modelo e a placa do veículo.')
                              return
                            }
                            setPreRegError('')
                            setPreRegStep(3)
                          }}
                        >
                          Avançar para Documentação →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PASSO 3: Documentação */}
                  {preRegStep === 3 && (
                    <div className="lp-form-step animate-fade-in">
                      <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '14px' }}>
                        Envie fotos nítidas dos documentos para que a equipe aprove seu cadastro no Painel de Controle:
                      </p>

                      <div className="lp-upload-grid">
                        {/* Foto de Perfil */}
                        <div className="lp-upload-item">
                          <label className="lp-upload-lbl">📸 Foto de Perfil (Rosto)</label>
                          <input
                            type="file"
                            id="modal-photo"
                            accept="image/*"
                            hidden
                            onChange={(e) => handleFileChange(e, 'photo')}
                          />
                          <label htmlFor="modal-photo" className={`lp-upload-btn-box ${preRegForm.photo ? 'uploaded' : ''}`}>
                            {preRegForm.photoPreview ? (
                              <img src={preRegForm.photoPreview} alt="Perfil" className="lp-preview-thumb" />
                            ) : (
                              <Camera size={22} color="#94a3b8" />
                            )}
                            <span>{preRegForm.photo ? '✓ Foto Selecionada' : 'Toque para escolher foto'}</span>
                          </label>
                        </div>

                        {/* CNH */}
                        <div className="lp-upload-item">
                          <label className="lp-upload-lbl">🪪 Foto da CNH (Habilitação)</label>
                          <input
                            type="file"
                            id="modal-cnh"
                            accept="image/*"
                            hidden
                            onChange={(e) => handleFileChange(e, 'cnh')}
                          />
                          <label htmlFor="modal-cnh" className={`lp-upload-btn-box ${preRegForm.cnh ? 'uploaded' : ''}`}>
                            {preRegForm.cnhPreview ? (
                              <img src={preRegForm.cnhPreview} alt="CNH" className="lp-preview-thumb" />
                            ) : (
                              <FileText size={22} color="#94a3b8" />
                            )}
                            <span>{preRegForm.cnh ? '✓ CNH Selecionada' : 'Toque para escolher CNH'}</span>
                          </label>
                        </div>

                        {/* CRLV */}
                        <div className="lp-upload-item">
                          <label className="lp-upload-lbl">📄 Foto do CRLV (Doc. do Veículo)</label>
                          <input
                            type="file"
                            id="modal-crlv"
                            accept="image/*"
                            hidden
                            onChange={(e) => handleFileChange(e, 'crlv')}
                          />
                          <label htmlFor="modal-crlv" className={`lp-upload-btn-box ${preRegForm.crlv ? 'uploaded' : ''}`}>
                            {preRegForm.crlvPreview ? (
                              <img src={preRegForm.crlvPreview} alt="CRLV" className="lp-preview-thumb" />
                            ) : (
                              <FileText size={22} color="#94a3b8" />
                            )}
                            <span>{preRegForm.crlv ? '✓ CRLV Selecionado' : 'Toque para escolher CRLV'}</span>
                          </label>
                        </div>
                      </div>

                      <div className="lp-modal-actions-between" style={{ marginTop: '20px' }}>
                        <button
                          type="button"
                          className="lp-btn-back"
                          onClick={() => setPreRegStep(2)}
                          disabled={preRegLoading}
                        >
                          ← Voltar
                        </button>
                        <button
                          type="button"
                          className="lp-cta-btn lp-cta-modal"
                          onClick={handlePreRegSubmit}
                          disabled={preRegLoading}
                        >
                          {preRegLoading ? 'Enviando ao Painel...' : '🚀 Finalizar Pré-Cadastro'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
