const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'zomp_secret_key_2026';

// Configuração do Banco de Dados com SSL mandatório para Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

// Função de Inicialização Total do Banco (Self-Healing)
async function initDatabase() {
  console.log('🚀 [DB] Iniciando verificação de integridade...');
  const client = await pool.connect();
  try {
    // 1. Criar Tabelas Essenciais
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS "User" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "password" TEXT,
        "role" TEXT NOT NULL,
        "isApproved" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "AdminConfig" (
        "id" TEXT PRIMARY KEY,
        "pricePerKmCar" DECIMAL DEFAULT 2.00,
        "launchDate" DATE DEFAULT '2026-07-30'
      );
    `);
    console.log('✅ [DB] Tabelas verificadas/criadas');

    // 2. Garantir Admin Master
    const adminEmail = 'leandro2703palmeira@gmail.com';
    const adminPass = 'Lps27031981@';
    const hashedPassword = await bcrypt.hash(adminPass, 10);

    const { rows } = await client.query('SELECT id FROM "User" WHERE email = $1', [adminEmail]);
    
    if (rows.length === 0) {
      await client.query(
        'INSERT INTO "User" (name, email, password, role, "isApproved") VALUES ($1, $2, $3, $4, $5)',
        ['Leandro Palmeira', adminEmail, hashedPassword, 'ADMIN', true]
      );
      console.log('👤 [DB] Admin Master criado');
    } else {
      await client.query('UPDATE "User" SET password = $1, role = $2 WHERE email = $3', [hashedPassword, 'ADMIN', adminEmail]);
      console.log('👤 [DB] Admin Master sincronizado');
    }

  } catch (err) {
    console.error('❌ [DB] ERRO CRÍTICO NA INICIALIZAÇÃO:', err.message);
  } finally {
    client.release();
  }
}

// Rota de Login Blindada
app.post('/api/auth/login', async (req, res) => {
  console.log(`📡 [Auth] Tentativa de login: ${req.body.email}`);
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha obrigatórios' });
    }

    const { rows } = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    const user = rows[0];

    if (!user) {
      console.warn(`⚠️ [Auth] Usuário não encontrado: ${email}`);
      return res.status(401).json({ error: 'E-mail não cadastrado' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.warn(`⚠️ [Auth] Senha incorreta para: ${email}`);
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role.toUpperCase() }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    console.log(`✅ [Auth] Sucesso: ${email}`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.toUpperCase()
      }
    });

  } catch (error) {
    console.error('❌ [Auth] Erro interno:', error.message);
    res.status(500).json({ error: 'Erro no servidor', details: error.message });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'OK', db: 'Connected' }));

app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  await initDatabase();
});
