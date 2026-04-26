import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Car, User, Shield, Zap, TrendingUp, ArrowRight, Gift, Smartphone } from 'lucide-react'
import './LandingPage.css'

export default function LandingPage() {
  const navigate = useNavigate()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  }

  return (
    <div className="landing-main">
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>

      <nav className="landing-navbar">
        <img src="/logo.svg" alt="Zomp" className="nav-logo" />
        <div className="nav-links">
          <button className="nav-btn" onClick={() => navigate('/motorista')}>Motorista</button>
          <button className="nav-btn" onClick={() => navigate('/passageiro')}>Passageiro</button>
          <button className="nav-btn" onClick={() => window.scrollTo(0, 1000)}>Sobre</button>
        </div>
        <button className="btn-primary" style={{padding: '10px 24px'}} onClick={() => navigate('/passageiro/cadastro')}>
          Baixar App
        </button>
      </nav>

      <main className="hero-wrapper">
        <motion.div 
          className="hero-tag"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          🚀 A revolução chegou no Rio de Janeiro
        </motion.div>

        <motion.h1 
          className="hero-main-title"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          A mobilidade que <br /><span>gera lucros</span> reais.
        </motion.h1>

        <motion.p 
          className="hero-desc"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          Seja você motorista ou passageiro, na Zomp todo mundo sai ganhando. 
          Conheça o primeiro sistema de Royalties de mobilidade urbana do Brasil.
        </motion.p>

        <motion.div 
          className="choice-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="choice-card" 
            variants={itemVariants}
            onClick={() => navigate('/motorista')}
          >
            <div className="card-icon"><TrendingUp size={32} /></div>
            <h3 className="card-title">Motorista</h3>
            <p className="card-desc">
              Não seja apenas um motorista, seja um investidor. 
              Ganhe taxas fixas e royalties vitalícios por indicações.
            </p>
            <div className="card-btn">Quero Dirigir <ArrowRight size={20} /></div>
          </motion.div>

          <motion.div 
            className="choice-card" 
            variants={itemVariants}
            onClick={() => navigate('/passageiro')}
          >
            <div className="card-icon"><User size={32} /></div>
            <h3 className="card-title">Passageiro</h3>
            <p className="card-desc">
              Corra sempre pelo menor preço garantido e ajude 
              a construir uma comunidade mais justa.
            </p>
            <div className="card-btn">Quero Viajar <ArrowRight size={20} /></div>
          </motion.div>
        </motion.div>
      </main>

      <section className="features-section">
        <div className="section-head">
          <h2>Por que escolher a Zomp?</h2>
          <p style={{color: 'var(--text-secondary)'}}>Diferenciais que nos tornam únicos no mercado.</p>
        </div>

        <div className="feature-list">
          <div className="feat-item">
            <div className="card-icon"><Gift size={24} /></div>
            <h4>Sistema de Royalties</h4>
            <p>Receba R$ 0,10 por cada corrida de um passageiro que você indicou, para sempre.</p>
          </div>
          <div className="feat-item">
            <div className="card-icon"><Shield size={24} /></div>
            <h4>Segurança Total</h4>
            <p>Monitoramento em tempo real e suporte humanizado 24 horas por dia.</p>
          </div>
          <div className="feat-item">
            <div className="card-icon"><Zap size={24} /></div>
            <h4>Preço Imbatível</h4>
            <p>Cobrimos qualquer preço da concorrência e ainda damos desconto adicional.</p>
          </div>
          <div className="feat-item">
            <div className="card-icon"><Smartphone size={24} /></div>
            <h4>Experiência Mobile</h4>
            <p>App leve, intuitivo e com foco total no que importa: sua viagem.</p>
          </div>
        </div>
      </section>

      <section className="stats-banner">
        <div className="stat-box">
          <span className="stat-val">5k+</span>
          <span className="stat-lbl">Motoristas no RJ</span>
        </div>
        <div className="stat-box">
          <span className="stat-val">R$ 0,10</span>
          <span className="stat-lbl">Royalties p/ Corrida</span>
        </div>
        <div className="stat-box">
          <span className="stat-val">100%</span>
          <span className="stat-lbl">Segurança Garantida</span>
        </div>
      </section>

      <footer className="landing-footer-main">
        <img src="/logo.svg" alt="Zomp" className="footer-logo" />
        <p className="footer-text">
          &copy; 2026 Zomp Mobilidade Tecnológica. <br />
          Feito com ❤️ no Rio de Janeiro.
        </p>
      </footer>
    </div>
  )
}
