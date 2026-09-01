import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, User, Shield, Zap, Gift, Smartphone, CheckCircle,
  XCircle, ChevronDown, ArrowRight, Car, Bike, FileText, Camera,
  Check, X, Lock, Phone, CreditCard, AlertCircle, Sparkles,
  Trophy, Flame, Award, Calendar, Target, Crown
} from 'lucide-react'
import { driverPreRegister, getPublicConfig } from '../services/api'
import './LandingPage.css'

/* ── Count-up animation ── */
function CountUp({ target = 3300, prefix = '', suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const ref = React.useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    let start = 0
    const finalTarget = Number(target) || 3300
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
    if (!val) return new Date('2026-11-01T23:59:59-03:00')
    if (typeof val === 'string' && val.length === 10) {
      return new Date(`${val}T23:59:59-03:00`)
    }
    const d = new Date(val)
    return isNaN(d.getTime()) ? new Date('2026-11-01T23:59:59-03:00') : d
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
      <div className="lp-cd-launch-badge">
        <span className="lp-cd-launch-icon">🚀</span>
        <span className="lp-cd-launch-txt">O APP ESTARÁ NO AR EM: <strong>01/11/2026</strong></span>
      </div>
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
    driverSlots: 3300,
    bindingMonthsFirst: 12,
    launchDate: '2026-11-01',
    royaltyPerRide: 0.30,
    pricePerCredit: 1.50
  })

  useEffect(() => {
    getPublicConfig().then(data => {
      if (data && !data.error) {
        setSystemConfig(prev => ({
          ...prev,
          ...data,
          driverSlots: data.driverSlots ? parseInt(data.driverSlots) : 3300,
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
      <nav className="lp-nav">
        <div className="lp-nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
          <img src="/logo.svg" alt="Zomp" className="lp-nav-logo" width="120" height="34" loading="eager" />
          <span className="lp-nav-driver-badge">PARCEIRO OFICIAL</span>
        </div>
        <div className="lp-nav-links">
          <button type="button" onClick={() => document.getElementById('royalties-sec')?.scrollIntoView({ behavior: 'smooth' })}>Renda Passiva</button>
          <button type="button" onClick={() => document.getElementById('torneios-sec')?.scrollIntoView({ behavior: 'smooth' })}>🏆 Torneios & Prêmios</button>
          <button type="button" onClick={() => navigate('/motorista')} className="lp-nav-driver-btn">🚗 Entrar como Motorista</button>
        </div>
      </nav>

      {/* ── HERO BANNER ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg">
          <img src="/zomp_driver_realistic.png" alt="Motorista Zomp" className="lp-hero-photo" width="1920" height="1080" loading="eager" decoding="async" />
          <div className="lp-hero-overlay" />
        </div>

        <div className="lp-hero-content">
          <motion.div className="lp-badge" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            💎 Invista no seu Futuro
          </motion.div>

          <motion.h1 className="lp-hero-h1" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <span className="lp-text-white">POR QUE VOCÊ AINDA VAI FICAR</span><br />
            <span className="lp-text-green">FAZENDO CORRIDAS PELOS CONCORRENTES,</span><br />
            <span className="lp-text-red">QUE NÃO TE DÁ</span> <br />
            <span className="lp-text-yellow">RENDA PASSIVA</span> <br />
            <span className="lp-text-white">DE ROYALTIES TODOS OS DIAS?</span>
          </motion.h1>

          <motion.p className="lp-hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }}>
            No final do dia, você se cansa, o aplicativo lucra, e você começa do zero no dia seguinte.<br />
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
          <motion.h2 className="lp-entry-title" initial={{ opacity: 1, y: 0 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }}>
            Comece a dirigir e <span className="lp-accent lp-accent-glow">lucrar agora</span>
          </motion.h2>
          <motion.p className="lp-entry-subtitle" initial={{ opacity: 1 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.1 }}>
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
          <br /><strong>* Requisito: Completar no mínimo 65 corridas por semana para manter o direito aos Royalties.</strong>
          <br /><span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Os pagamentos de royalties são realizados mensalmente (a cada 30 dias) via PIX. O valor recebido depende da quantidade de clientes vinculados à sua carteira e da frequência de corridas deles.</span>
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

      {/* ── COMO FUNCIONA A VINCULAÇÃO (1 AO 4 - MODELO TOTVS / OBJETIVO) ── */}
      <section className="lp-capture-section">
        <div className="lp-capture-wrap">
          <motion.div className="lp-section-tag lp-tag-gold" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            ⚡ Vinculação de Passageiros
          </motion.div>
          <motion.h2 className="lp-section-title" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            Como Funciona em 4 Passos
          </motion.h2>
          <motion.p className="lp-section-sub" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            Processo simples e automatizado para transformar passageiros em renda passiva recorrente.
          </motion.p>

          <motion.div className="lp-capture-grid" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.div className="lp-capture-card" variants={fadeUp}>
              <div className="lp-cap-step">01</div>
              <div className="lp-cap-icon-box"><Sparkles size={24} /></div>
              <h4>1. Apresentação</h4>
              <p>Apresente a tarifa com desconto imbatível da Zomp ao passageiro durante a corrida.</p>
            </motion.div>

            <motion.div className="lp-capture-card" variants={fadeUp}>
              <div className="lp-cap-step">02</div>
              <div className="lp-cap-icon-box"><Smartphone size={24} /></div>
              <h4>2. QR Code</h4>
              <p>O passageiro escaneia seu QR Code no carro e realiza a 1ª viagem com desconto exclusivo.</p>
            </motion.div>

            <motion.div className="lp-capture-card" variants={fadeUp}>
              <div className="lp-cap-step">03</div>
              <div className="lp-cap-icon-box"><Lock size={24} /></div>
              <h4>3. Vínculo de {bindingYearsText}</h4>
              <p>O cliente fica vinculado à sua carteira em todas as próximas viagens dele na plataforma.</p>
            </motion.div>

            <motion.div className="lp-capture-card" variants={fadeUp}>
              <div className="lp-cap-step">04</div>
              <div className="lp-cap-icon-box"><TrendingUp size={24} /></div>
              <h4>4. Royalties PIX</h4>
              <p>Receba R$ {systemConfig.royaltyPerRide.toFixed(2).replace('.', ',')} por corrida da sua base, creditado a cada 30 dias via PIX.</p>
            </motion.div>
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
            <img src="/zomp_network_v5.png" alt="Modelo de Negócios Zomp" className="lp-sim-img" width="800" height="600" loading="lazy" decoding="async" />
            <div className="lp-sim-pill">
              <span className="lp-sim-pill-val">+R$ {yearlyPassive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / ano</span>
              <span className="lp-sim-pill-lbl">Renda Extra Passiva Estimada ({passengers} passageiros)</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PROGRAMA DE TORNEIOS ZOMP (ESTILO CORPORATIVO TOTVS / ENTERPRISE) ── */}
      <section className="lp-tournament-section" id="torneios-sec">
        <div className="lp-tournament-wrap">
          {/* Header da Seção */}
          <div className="lp-tourn-header">
            <motion.div className="lp-section-tag lp-tag-tourn" initial={{ opacity: 0, y: -10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              🏆 Programa Oficial de Torneios Zomp
            </motion.div>
            <motion.h2 className="lp-section-title" initial={{ opacity: 1, y: 0 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              Na Zomp, dirigir pode levar você <span className="lp-accent lp-accent-glow">muito mais longe</span>
            </motion.h2>
            <motion.p className="lp-section-sub lp-tourn-sub" initial={{ opacity: 1 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              Todos os meses, os motoristas da Zomp terão a oportunidade de participar do <strong>Programa de Torneios Zomp</strong> e disputar grandes prêmios. O caminho começa na fase classificatória, com <strong>10 dias</strong> para completar no mínimo <strong>15 corridas</strong>. E o melhor: você pode <strong>convidar passageiros da Uber, 99 e InDriver</strong> durante suas corridas atuais para usar a Zomp — mostrando que o preço é geralmente mais barato — e assim somar pontos no torneio!
            </motion.p>
          </div>

          {/* PIPELINE VISUAL ESTRATÉGICO: 3 ETAPAS */}
          <div className="lp-tourn-pipeline">
            {/* ETAPA 1 */}
            <div className="lp-pipeline-step">
              <div className="lp-step-badge">
                <Calendar size={13} />
                <span>10 DIAS DE CLASSIFICAÇÃO</span>
              </div>
              <div className="lp-step-icon-wrap step-classificatoria">
                <Target size={28} />
              </div>
              <div className="lp-step-content">
                <span className="lp-step-tag">1ª ETAPA</span>
                <h3 className="lp-step-title">Fase Classificatória</h3>
                <div className="lp-step-meta-box">
                  <strong>🚗 Meta Obrigatória:</strong>
                  <p>Completar no mínimo <strong>15 corridas em 10 dias</strong> durante o período classificatório. Quanto mais corridas, melhor sua posição!</p>
                </div>
                <div className="lp-step-meta-box" style={{ marginTop: '8px', background: 'rgba(151, 233, 0, 0.06)', borderColor: 'rgba(151, 233, 0, 0.2)' }}>
                  <strong>💡 Dica: Convide passageiros durante a corrida!</strong>
                  <p>Está em uma corrida pela Uber, 99 ou InDriver? <strong>Convide o passageiro para usar a Zomp!</strong> Mostre que a corrida geralmente é <strong>mais barata pela Zomp</strong>, faça a viagem pelo app e ganhe pontos no Torneio. Cada passageiro que você traz fortalece sua posição e sua rede de royalties.</p>
                </div>
                <div className="lp-step-result">
                  <CheckCircle size={15} color="#97E900" />
                  <span>Atingiu a meta? <strong>Avança para a disputa!</strong></span>
                </div>
              </div>
            </div>

            <div className="lp-pipeline-arrow">
              <ArrowRight size={22} className="lp-arrow-icon" />
            </div>

            {/* ETAPA 2 */}
            <div className="lp-pipeline-step">
              <div className="lp-step-badge step-badge-hot">
                <Flame size={13} />
                <span>A DISPUTA COMEÇA</span>
              </div>
              <div className="lp-step-icon-wrap step-eliminatoria">
                <Flame size={28} />
              </div>
              <div className="lp-step-content">
                <span className="lp-step-tag">2ª ETAPA</span>
                <h3 className="lp-step-title">Fase Eliminatória</h3>
                <div className="lp-step-meta-box">
                  <strong>🔥 Disputa de Ranking:</strong>
                  <p>Os motoristas classificados seguem para a fase eliminatória, onde disputarão posições no <strong>Ranking do Torneio Zomp</strong>.</p>
                </div>
                <div className="lp-step-result">
                  <Crown size={15} color="#facc15" />
                  <span>Objetivo: <strong>Ficar entre os 30 melhores!</strong></span>
                </div>
              </div>
            </div>

            <div className="lp-pipeline-arrow">
              <ArrowRight size={22} className="lp-arrow-icon" />
            </div>

            {/* ETAPA 3 */}
            <div className="lp-pipeline-step step-featured">
              <div className="lp-step-badge step-badge-gold">
                <Trophy size={13} />
                <span>30 PREMIADOS / MÊS</span>
              </div>
              <div className="lp-step-icon-wrap step-premiacao">
                <Trophy size={28} />
              </div>
              <div className="lp-step-content">
                <span className="lp-step-tag">3ª ETAPA</span>
                <h3 className="lp-step-title">Premiação Mensal</h3>
                <div className="lp-step-meta-box">
                  <strong>🎁 Grandes Prêmios:</strong>
                  <p>E os melhores colocados conquistam: <strong>3 Carros</strong>, <strong>17 Prêmios de R$ 3.000 via PIX</strong> e <strong>10 Smartphones Samsung</strong>!</p>
                </div>
                <div className="lp-step-result">
                  <Sparkles size={15} color="#97E900" />
                  <span>Distribuição <strong>todos os meses!</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* GRID DE PREMIAÇÕES DETALHADAS */}
          <div className="lp-tourn-prizes-grid">
            {/* 1º, 2º e 3º LUGAR */}
            <div className="lp-prize-card lp-prize-gold">
              <div className="lp-prize-glow"></div>
              <div className="lp-prize-header">
                <span className="lp-prize-badge-rank rank-gold">🥇🥈🥉 1º, 2º e 3º LUGAR</span>
                <div className="lp-prize-icon-circle gold"><Car size={32} /></div>
              </div>
              <div className="lp-prize-main">
                <span className="lp-prize-sub">3 MOTORISTAS PREMIADOS</span>
                <h3 className="lp-prize-title">3 CARROS TODOS OS MESES</h3>
                <p className="lp-prize-desc">
                  Os três primeiros colocados do Torneio Zomp poderão receber <strong>um carro cada</strong>. O ápice do reconhecimento pelo seu desempenho e dedicação.
                </p>
              </div>
              <div className="lp-prize-footer">
                <span className="lp-prize-feat">✓ 1 Carro para cada um dos 3 primeiros colocados</span>
              </div>
            </div>

            {/* 4º AO 20º LUGAR */}
            <div className="lp-prize-card lp-prize-silver">
              <div className="lp-prize-header">
                <span className="lp-prize-badge-rank rank-silver">🏅 DO 4º AO 20º LUGAR</span>
                <div className="lp-prize-icon-circle silver"><TrendingUp size={32} /></div>
              </div>
              <div className="lp-prize-main">
                <span className="lp-prize-sub">17 MOTORISTAS PREMIADOS</span>
                <h3 className="lp-prize-title">R$ 3.000,00 VIA PIX</h3>
                <p className="lp-prize-desc">
                  Cada motorista classificado entre o 4º e o 20º lugar receberá <strong>R$ 3.000,00 via PIX</strong> direto na conta, somando-se aos seus ganhos diários e royalties.
                </p>
              </div>
              <div className="lp-prize-footer">
                <span className="lp-prize-feat">✓ Total de R$ 51.000,00 distribuídos via PIX todo mês</span>
              </div>
            </div>

            {/* 21º AO 30º LUGAR */}
            <div className="lp-prize-card lp-prize-bronze">
              <div className="lp-prize-header">
                <span className="lp-prize-badge-rank rank-bronze">📱 DO 21º AO 30º LUGAR</span>
                <div className="lp-prize-icon-circle bronze"><Smartphone size={32} /></div>
              </div>
              <div className="lp-prize-main">
                <span className="lp-prize-sub">10 MOTORISTAS PREMIADOS</span>
                <h3 className="lp-prize-title">SMARTPHONES SAMSUNG</h3>
                <p className="lp-prize-desc">
                  Os motoristas classificados entre o 21º e o 30º lugar receberão <strong>um smartphone Samsung</strong> no valor aproximado de R$ 1.000 cada.
                </p>
              </div>
              <div className="lp-prize-footer">
                <span className="lp-prize-feat">✓ 10 aparelhos Samsung novos entregues todo mês</span>
              </div>
            </div>
          </div>

          {/* BANNER TOTALIZADOR: 30 MOTORISTAS PREMIADOS */}
          <div className="lp-tourn-summary-bar">
            <div className="lp-summary-item">
              <span className="lp-sum-icon">🚗</span>
              <div>
                <strong>3 CARROS</strong>
                <small>1º, 2º e 3º Lugar</small>
              </div>
            </div>
            <div className="lp-summary-divider"></div>
            <div className="lp-summary-item">
              <span className="lp-sum-icon">💰</span>
              <div>
                <strong>17 PRÊMIOS DE R$ 3.000 PIX</strong>
                <small>Do 4º ao 20º Lugar</small>
              </div>
            </div>
            <div className="lp-summary-divider"></div>
            <div className="lp-summary-item">
              <span className="lp-sum-icon">📱</span>
              <div>
                <strong>10 SMARTPHONES SAMSUNG</strong>
                <small>Do 21º ao 30º Lugar</small>
              </div>
            </div>
            <div className="lp-summary-divider"></div>
            <div className="lp-summary-item highlight">
              <span className="lp-sum-icon">🏆</span>
              <div>
                <strong className="lp-accent">30 MOTORISTAS PREMIADOS</strong>
                <small>Todos os meses na Zomp</small>
              </div>
            </div>
          </div>

          {/* CARD DE CONVERSÃO / CHAMADA FINAL DA SEÇÃO */}
          <div className="lp-tourn-cta-box">
            <div className="lp-tourn-cta-content">
              <div className="lp-tourn-cta-badge">⚡ Oportunidade Exclusiva para Parceiros Zomp</div>
              <h3 className="lp-tourn-cta-title">
                A Zomp não foi criada apenas para oferecer corridas.
              </h3>
              <p className="lp-tourn-cta-desc">
                Ela foi criada para <strong>transformar desempenho, dedicação e participação em novas oportunidades</strong>. Entre na plataforma, conquiste sua classificação e dispute seu lugar entre os melhores motoristas da Zomp.
              </p>
              <div className="lp-tourn-cta-actions">
                <button className="lp-cta-btn lp-cta-xl lp-tourn-btn-gold" onClick={handleCta}>
                  QUERO PARTICIPAR DO TORNEIO ZOMP →
                </button>
                <button className="lp-ghost-btn" onClick={handleCta}>
                  🚀 Entre para a Zomp e participe da próxima classificatória
                </button>
              </div>
            </div>
          </div>
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
        <motion.div className="lp-final-wrap" initial={{ opacity: 1, y: 0 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="lp-vagas-badge">
            <span className="lp-vagas-badge-dot"></span>
            🔥 VAGAS LIMITADAS PARA MOTORISTAS NO RJ
          </div>
          <h2 className="lp-vagas-heading">
            <span className="lp-text-vagas-bright">Vagas Limitadas.</span><br />
            <span className="lp-accent lp-accent-glow">Garanta a sua agora!</span>
          </h2>
          <p className="lp-vagas-desc">
            Seja um dos pioneiros a garantir Royalties na Zomp no Rio de Janeiro e construa sua renda passiva todos os dias.
          </p>
          <Countdown targetDate={systemConfig.launchDate} />
          <motion.button className="lp-cta-btn lp-cta-xl lp-cta-glow" onClick={handleCta} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            🚀 Fazer meu Pré-Cadastro Gratuito
          </motion.button>
        </motion.div>
      </section>

      {/* ── FOOTER SIMPLIFICADO & OBJETIVO ── */}
      <footer className="lp-footer-simple">
        <div className="lp-footer-simple-content">
          <div className="lp-footer-simple-brand">
            <img src="/logo.svg" alt="Zomp" className="lp-footer-logo" width="120" height="32" loading="lazy" />
            <span className="lp-footer-simple-name">Zomp Mobilidade</span>
          </div>
          <p className="lp-footer-simple-cnpj">
            CNPJ: <strong>65.628.833/0001-47</strong> • Rio de Janeiro - RJ
          </p>
          <p className="lp-footer-simple-copy">
            © {new Date().getFullYear()} Zomp Mobilidade Urbana. Todos os direitos reservados.
          </p>
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
