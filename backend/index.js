const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
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

// 1. SERVIR ARQUIVOS ESTÁTICOS DO FRONTEND
const distPath = path.resolve(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log(`📂 [Sistema] Servindo frontend de: ${distPath}`);
} else {
  console.log(`⚠️ [Sistema] Pasta dist não encontrada em: ${distPath} — rodando só como API`);
}

// ============================================
// 2. MONTAGEM DAS ROTAS DA API
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/admin', adminRoutes);

// ============================================
// 3. HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '12.3.0', timestamp: new Date().toISOString() });
});

// ============================================
// 4. SUPORTE A ROTAS DO REACT (SPA FALLBACK)
// ============================================
if (fs.existsSync(distPath)) {
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ============================================
// START SERVER
// ============================================
app.listen(PORT, async () => {
  console.log(`📡 ZOMP API v12.3.0 ONLINE: http://localhost:${PORT}`);
  await initDB();
});
