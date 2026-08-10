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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================
// MONTAGEM DAS ROTAS DA API
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/admin', adminRoutes);

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '12.6.4', timestamp: new Date().toISOString() });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, async () => {
  console.log(`🚀 ZOMP API v12.6.4 ONLINE: http://localhost:${PORT}`);
  await initDB();
});
