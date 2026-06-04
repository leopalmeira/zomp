const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'zomp_2026_production_secret';

// Configuração do Banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

// 1. SERVIR ARQUIVOS ESTÁTICOS DO FRONTEND
// O Render vai compilar o frontend para a pasta dist
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 2. INICIALIZAÇÃO DO BANCO (ESQUEMA v12.2.8)
async function initDB() {
  console.log('🚀 [Sistema] Verificando integridade do banco...');
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      
      CREATE TABLE IF NOT EXISTS "User" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "password" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "isApproved" BOOLEAN DEFAULT true,
        "credits" DECIMAL DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "AdminConfig" (
        "id" TEXT PRIMARY KEY DEFAULT 'singleton',
        "pricePerKmCar" DECIMAL DEFAULT 2.00,
        "launchDate" DATE DEFAULT '2026-07-30'
      );
    `);

    // Injeção de Admin Master (Sincronizado com Diário de Bordo)
    const adminEmail = 'leandro2703palmeira@gmail.com';
    const pass = 'Lps27031981@';
    const hash = await bcrypt.hash(pass, 10);
    
    await client.query(`
      INSERT INTO "User" (name, email, password, role, "isApproved")
      VALUES ('Leandro Palmeira', $1, $2, 'ADMIN', true)
      ON CONFLICT (email) DO UPDATE SET password = $2, role = 'ADMIN';
    `, [adminEmail, hash]);

    console.log('✅ [Sistema] Banco de dados e Admin prontos.');
  } catch (err) {
    console.error('❌ [Sistema] Erro no banco:', err.message);
  } finally {
    client.release();
  }
}

// 3. API - AUTENTICAÇÃO
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: user.id, role: user.role.toUpperCase() }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role.toUpperCase(),
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// 4. SUPORTE A ROTAS DO REACT (SPA)
// Qualquer rota que não seja da API, serve o index.html do frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, async () => {
  console.log(`📡 ZOMP ONLINE: http://localhost:${PORT}`);
  await initDB();
});
