import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Wallet, QrCode, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

function Sidebar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="sidebar">
      <h1>Zompify 🚘</h1>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
        <Link to="/" className={`nav-link ${isActive('/')}`}>
          <Home size={20} /> Painel Principal
        </Link>
        <Link to="/wallet" className={`nav-link ${isActive('/wallet')}`}>
          <Wallet size={20} /> Carteira / Royalties
        </Link>
        <Link to="/invite" className={`nav-link ${isActive('/invite')}`}>
          <QrCode size={20} /> Indicar Passageiro
        </Link>
      </nav>

      <button className="nav-link" style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#ef4444' }}>
        <LogOut size={20} /> Sair
      </button>
    </div>
  );
}

function Dashboard() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <h2 className="header-title">Bem-vindo, Motorista!</h2>
      <div className="grid-layout">
        <div className="glass-panel">
          <h3>Viagens de Hoje</h3>
          <p style={{ fontSize: '3rem', fontWeight: 700, margin: '1rem 0' }}>12</p>
          <p style={{ color: 'var(--text-muted)' }}>Você está em uma ótima sequência.</p>
        </div>
        <div className="glass-panel">
          <h3>Passageiros Indicados</h3>
          <p style={{ fontSize: '3rem', fontWeight: 700, margin: '1rem 0' }}>4</p>
          <p style={{ color: 'var(--text-muted)' }}>Eles geram comissão vitalícia em cada viagem!</p>
        </div>
      </div>
    </motion.div>
  );
}

function WalletView() {
  // Simulating balance
  const balance = 15.40; // Simulated R$ balance
  const canWithdraw = balance > 0; // The logic mentions withdraw every 3 months.

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
      <h2 className="header-title">Sua Carteira Zomp</h2>
      
      <div className="grid-layout">
        <div className="glass-panel wallet-card">
          <div className="balance-title">Saldo Disponível (Royalties)</div>
          <div className="balance-amount">R$ {balance.toFixed(2).replace('.', ',')}</div>
          <p style={{ color: '#93c5fd', marginBottom: '2rem' }}>
            + R$ 0,10 por cada corrida de seus passageiros indicados.
          </p>
          
          <button className="action-btn" disabled={!canWithdraw}>
             Solicitar Saque Trimestral
          </button>
          {!canWithdraw && <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#fca5a5' }}>Disponível o saque após acumular o limite e o trimestre.</p>}
        </div>

        <div className="glass-panel">
          <h3>Histórico Recente</h3>
          <ul style={{ listStyle: 'none', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <span>João Silva completou viagem</span>
              <span style={{ color: '#4ade80' }}>+ R$ 0,10</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <span>Maria Ferreira completou viagem</span>
              <span style={{ color: '#4ade80' }}>+ R$ 0,10</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <span>João Silva completou viagem</span>
              <span style={{ color: '#4ade80' }}>+ R$ 0,10</span>
            </li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

function InviteView() {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
      <h2 className="header-title">Programa de Indicação Vitalício</h2>
      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="qr-container">
          <div className="qr-box">
             {/* Using a placeholder service or dummy QR to represent it visually for the demo */}
             <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ZOMP_INVITE_12345" alt="QR Code" />
          </div>
          <h3>Escaneie para Cadastrar!</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Peça para seu passageiro escanear este código QR para baixar o app da Zomp. <br/><br/>
            <strong>Ele ficará vinculado a você PELA ETERNIDADE.</strong> <br/>
            Cada vez que ele concluir uma corrida (com você ou com outro motorista), R$ 0,10 caem diretamente nos seus royalties.
          </p>
          <button className="action-btn" style={{ width: '100%', marginTop: '1rem' }}>
            Compartilhar Link de Convite
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function App() {
  return (
    <Router>
      <div className="premium-container">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/wallet" element={<WalletView />} />
            <Route path="/invite" element={<InviteView />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
