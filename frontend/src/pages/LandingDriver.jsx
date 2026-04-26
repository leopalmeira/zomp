import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './LandingDriver.css';
import { 
  Check, 
  X, 
  CalendarCheck, 
  CarFront, 
  MapPin, 
  Banknote,
  ShieldCheck,
  Users,
  ArrowRight,
  TrendingUp,
  Crown,
  Target,
  Star,
  Heart,
  PackageOpen
} from 'lucide-react';

const LandingDriver = () => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Target Date: June 30th (of current year or next depending on current date, let's use 2026-06-30 since testing in 2026)
  useEffect(() => {
    const targetDate = new Date('2026-06-30T23:59:59').getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    };

    updateCountdown();
    const timerId = setInterval(updateCountdown, 1000);
    return () => clearInterval(timerId);
  }, []);

  const handlePreCadastro = () => {
    navigate('/motorista/cadastro');
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="landing-container">
      {/* HEADER SECTION */}
      <motion.header 
        className="landing-header"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bz-logo-container">
          <img src="/logo.svg" alt="Zomp Logo" style={{height: '45px', filter: 'drop-shadow(0 0 10px rgba(151, 233, 0, 0.4))'}} />
        </div>
        <div className="header-badge">NO RIO DE JANEIRO!</div>
      </motion.header>

      {/* HERO SECTION */}
      <section className="hero-section">
        <motion.div 
          className="hero-content"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.h1 className="hero-title" variants={fadeUp}>
            POR QUE VOCÊ <span className="highlight-white">AINDA VAI FICAR FAZENDO CORRIDAS PELOS CONCORRENTES</span>, QUE <span className="highlight-red">NÃO TE DÁ RENDA PASSIVA</span> DE ROYALTIES TODOS OS DIAS?
          </motion.h1>
          <motion.p className="hero-subtitle" variants={fadeUp}>
            No final do dia, você se cansa, o aplicativo lucra, e você começa do zero no dia seguinte.<br/>
            <span className="highlight-green text-glow">MUDE ISSO. MUDE PARA A ZOMP!</span>
          </motion.p>
          
          <motion.div className="cta-wrapper" variants={fadeUp}>
            <button className="btn-primary pulse-animation" onClick={handlePreCadastro}>
              GARANTIR MINHA VAGA AGORA
              <ArrowRight className="btn-icon" size={24} />
            </button>
            <p className="vagas-restantes">🔥 Apenas 5.000 vagas no RJ</p>
          </motion.div>
        </motion.div>
      </section>

      {/* BENEFICIOS MOTORISTA */}
      <motion.section 
        className="benefits-cards"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <motion.div className="glass-card benefit-card" variants={fadeUp}>
          <div className="icon-wrapper green-bg"><Banknote size={32} /></div>
          <h3>TAXA FIXA GARANTIDA <br/><span>R$ 1,50</span></h3>
          <p>por corrida. Fixa por 3 anos 🔒</p>
        </motion.div>
        <motion.div className="glass-card benefit-card" variants={fadeUp}>
          <div className="icon-wrapper green-bg"><Users size={32} /></div>
          <h3>ROYALTIES DE PASSAGEIROS <br/><span>R$ 0,50</span></h3>
          <p>por cada corrida feita por seus passageiros vinculados</p>
        </motion.div>
        <motion.div className="glass-card benefit-card" variants={fadeUp}>
          <div className="icon-wrapper green-bg"><TrendingUp size={32} /></div>
          <h3>RENDA PASSIVA <span className="text-yellow">TODOS OS DIAS</span></h3>
          <p>Mesmo quando você não está online, você continua ganhando.</p>
        </motion.div>
        <motion.div className="glass-card benefit-card" variants={fadeUp}>
          <div className="icon-wrapper green-bg"><Crown size={32} /></div>
          <h3>MAIS VALOR, <span className="text-yellow">MAIS LIBERDADE</span></h3>
          <p>Você no controle do seu tempo e da sua vida.</p>
        </motion.div>
      </motion.section>

      {/* COMPARATIVO SECTION */}
      <section className="comparison-section">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          COMPARE E VEJA A DIFERENÇA!
        </motion.h2>
        <div className="comparison-wrapper">
          <table className="comparison-matrix">
            <thead>
              <tr>
                <th>Recurso</th>
                <th className="zomp-col">ZOMP</th>
                <th>Outros</th>
              </tr>
            </thead>
            <tbody>
              <tr className="matrix-row">
                <td>Taxa Fixa Garantida</td>
                <td className="matrix-val-zomp">R$ 1,50</td>
                <td className="matrix-val-bad">Variável (Altas taxas)</td>
              </tr>
              <tr className="matrix-row">
                <td>Royalties Vitais</td>
                <td className="matrix-val-zomp">R$ 0,50 /corrida</td>
                <td className="matrix-val-bad">Zero</td>
              </tr>
              <tr className="matrix-row">
                <td>Renda Passiva</td>
                <td className="matrix-val-zomp">Sim, Vitalícia</td>
                <td className="matrix-val-bad">Não, Zero</td>
              </tr>
              <tr className="matrix-row">
                <td>Base de Clientes</td>
                <td className="matrix-val-zomp">Sua Propriedade</td>
                <td className="matrix-val-bad">Do Aplicativo</td>
              </tr>
              <tr className="matrix-row">
                <td>Conceito</td>
                <td className="matrix-val-zomp">Motorista Investidor</td>
                <td className="matrix-val-bad">Troca Tempo p/ Dinheiro</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* APP DO PASSAGEIRO - ARGUMENTO DE VENDAS PARA O MOTORISTA */}
      <section className="sales-pitch-section">
        <motion.div
           initial="hidden"
           whileInView="visible"
           viewport={{ once: true }}
           variants={staggerContainer}
        >
          <motion.h2 className="section-title" variants={fadeUp}>UMA PLATAFORMA PARA VOCÊ CONQUISTAR SEUS PASSAGEIROS</motion.h2>
          <motion.p className="pitch-subtitle" variants={fadeUp}>Veja por que o app do passageiro é imbatível. Use isso para trazer seus clientes e gerar a sua renda passiva!</motion.p>
          
          <motion.div className="price-match-banner" variants={fadeUp}>
            <h3>PREÇO IMBATÍVEL! SEMPRE O MAIS BARATO.</h3>
            <p>Comparamos e cobrimos qualquer preço! Se encontrar mais barato na concorrência, nós cobrimos e ainda damos desconto ao cliente!</p>
            
            <div className="price-comp-cards">
              <div className="price-card green-bg">
                <span>ZOMP</span>
                <h4>R$ 23,50</h4>
                <p>Nós cobrimos o preço!</p>
              </div>
              <div className="price-card black-bg">
                <span>UBER</span>
                <h4 className="line-through">R$ 28,90</h4>
              </div>
              <div className="price-card yellow-bg">
                <span>99</span>
                <h4 className="line-through">R$ 27,80</h4>
              </div>
            </div>
            
            <div className="pitch-highlight">
              <h4>O PASSAGEIRO PAGA MENOS E AINDA AJUDA O MOTORISTA!</h4>
              <p>Parte dos nossos lucros volta para os motoristas todos os dias em forma de <strong>ROYALTIES</strong>. ISSO NENHUM OUTRO APP FAZ!</p>
            </div>
          </motion.div>
          
          <motion.div className="passenger-features" variants={staggerContainer}>
            <motion.div className="p-feat" variants={fadeUp}>
               <CalendarCheck className="feat-icon" size={32} />
               <h4>Agendamento de Corridas</h4>
               <p>Passageiro programa corridas com antecedência.</p>
            </motion.div>
            <motion.div className="p-feat" variants={fadeUp}>
               <Heart className="feat-icon" size={32} />
               <h4>Motoristas Favoritos</h4>
               <p>Passageiro salva os preferidos. Você fideliza clientes!</p>
            </motion.div>
            <motion.div className="p-feat" variants={fadeUp}>
               <MapPin className="feat-icon" size={32} />
               <h4>Corridas para Outras Cidades</h4>
               <p>Viagens de longa distância mais em conta.</p>
            </motion.div>
            <motion.div className="p-feat" variants={fadeUp}>
               <PackageOpen className="feat-icon" size={32} />
               <h4>Entregas Rápidas e Seguras</h4>
               <p>Mais oportunidades para você rodar o dia todo.</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* COUNTDOWN SECTION - URGENCY */}
      <section className="countdown-section">
        <motion.div 
          className="launch-box glass-card"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="attention-title text-yellow">ATENÇÃO, MOTORISTA!</h2>
          <h3 className="launch-subtitle">PRÉ-CADASTRO ABERTO ATÉ <span className="highlight-white">30 DE JUNHO</span></h3>
          <p className="launch-desc">Não perca essa oportunidade. Entrando agora na fase de onboarding, você será pioneiro recebendo royalties limitados.</p>
          
          <div className="timer-wrapper">
            <div className="time-box">
              <span className="time-number">{timeLeft.days}</span>
              <span className="time-label">DIAS</span>
            </div>
            <div className="time-colon">:</div>
            <div className="time-box">
              <span className="time-number">{timeLeft.hours}</span>
              <span className="time-label">HORAS</span>
            </div>
            <div className="time-colon">:</div>
            <div className="time-box">
              <span className="time-number">{timeLeft.minutes}</span>
              <span className="time-label">MINUTOS</span>
            </div>
            <div className="time-colon">:</div>
            <div className="time-box">
              <span className="time-number">{timeLeft.seconds}</span>
              <span className="time-label">SEGUNDOS</span>
            </div>
          </div>
          
          <div className="vagas-alert">
             <Target className="alert-icon text-yellow" size={40} />
             <h4>EXCLUSIVO PARA RIO DE JANEIRO - VAGAS LIMITADAS!</h4>
             <p>TOTAL DE APENAS <strong>5.000 MOTORISTAS</strong></p>
             <button className="btn-primary mt-3" onClick={handlePreCadastro}>
               FAZER MEU PRÉ-CADASTRO
             </button>
          </div>
        </motion.div>
      </section>

      <footer className="landing-footer">
        <div className="footer-feats">
          <div className="f-feat"><ShieldCheck size={20} className="text-green" /> Seguro e Confiável</div>
          <div className="f-feat"><Star size={20} className="text-green" /> Plataforma Feita para Valorizar o Motorista</div>
          <div className="f-feat"><TrendingUp size={20} className="text-green" /> Construa Sua Renda Passiva</div>
        </div>
        <div className="footer-bottom">
          <p><strong><span className="highlight-green">ZOMP.</span> MAIS QUE CORRIDAS. É SUA NOVA FONTE DE RENDA.</strong></p>
        </div>
      </footer>
    </div>
  );
};

export default LandingDriver;
