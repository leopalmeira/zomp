const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDB } = require('./src/config/db');

// Importação das Rotas
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const ridesRoutes = require('./src/routes/ridesRoutes');
const walletRoutes = require('./src/routes/walletRoutes');
const creditsRoutes = require('./src/routes/creditsRoutes');
const configRoutes = require('./src/routes/configRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const supportRoutes = require('./src/routes/supportRoutes');
const tournamentRoutes = require('./src/routes/tournamentRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================
// MONTAGEM DAS ROTAS DA API
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/tournament', tournamentRoutes);

// ============================================
// HEALTH CHECK & ROOT
// ============================================
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Zomp API', version: '12.6.4' });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '12.6.4', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '12.6.4', timestamp: new Date().toISOString() });
});
app.get('/api/init-db', async (req, res) => {
  try {
    await initDB();
    res.json({ status: 'ok', message: 'Tabelas criadas e usuários de teste sincronizados com sucesso!' });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});


// ============================================
// START SERVER & ROBÔ ANTI-SLEEP (KEEP-ALIVE)
// ============================================
app.listen(PORT, async () => {
  console.log(`🚀 ZOMP API v12.6.4 ONLINE: http://localhost:${PORT}`);
  await initDB();

  // Robô anti-sleep: faz auto-ping a cada 9 minutos para manter a instância do Render ativa 24/7
  const serverUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || `http://localhost:${PORT}`;
  const PING_INTERVAL_MS = 9 * 60 * 1000;
  setInterval(async () => {
    try {
      const pingUrl = `${serverUrl}/api/health`;
      const res = await fetch(pingUrl);
      if (res.ok) {
        console.log(`🤖 [Anti-Sleep Bot] Ping realizado com sucesso em ${pingUrl} às ${new Date().toLocaleTimeString('pt-BR')}`);
      }
    } catch (e) {
      console.warn('🤖 [Anti-Sleep Bot] Tentativa de ping:', e.message);
    }
  }, PING_INTERVAL_MS);
  console.log('🤖 [Anti-Sleep Bot] Robô de vigília 24/7 ativado com sucesso.');
});

