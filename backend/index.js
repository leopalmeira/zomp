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
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 1. SERVIR ARQUIVOS ESTÁTICOS DO FRONTEND
const distPath = path.resolve(__dirname, '..', 'frontend', 'dist');
const fs = require('fs');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log(`📂 [Sistema] Servindo frontend de: ${distPath}`);
} else {
  console.log(`⚠️ [Sistema] Pasta dist não encontrada em: ${distPath} — rodando só como API`);
}

// ============================================
// 2. INICIALIZAÇÃO DO BANCO (ESQUEMA COMPLETO v12.2.8)
// ============================================
async function initDB() {
  console.log('🚀 [Sistema] Verificando integridade do banco...');
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS "User" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "password" TEXT,
        "role" TEXT NOT NULL DEFAULT 'PASSENGER',
        "qrCode" TEXT UNIQUE,
        "credits" DECIMAL DEFAULT 0,
        "balance" DECIMAL DEFAULT 0,
        "rating" DECIMAL DEFAULT 5,
        "totalRatings" INTEGER DEFAULT 0,
        "ridesAccepted" INTEGER DEFAULT 0,
        "ridesMissed" INTEGER DEFAULT 0,
        "ridesCompleted" INTEGER DEFAULT 0,
        "isApproved" BOOLEAN DEFAULT true,
        "photo" TEXT,
        "cnh" TEXT,
        "crlv" TEXT,
        "carPlate" TEXT,
        "carModel" TEXT,
        "carColor" TEXT,
        "phone" TEXT,
        "pixKey" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "AdminConfig" (
        "id" TEXT PRIMARY KEY DEFAULT 'singleton',
        "pricePerKmCar" DECIMAL DEFAULT 2.00,
        "pricePerKmMoto" DECIMAL DEFAULT 1.50,
        "minFareCar" DECIMAL DEFAULT 8.40,
        "minFareMoto" DECIMAL DEFAULT 7.20,
        "royaltyPerRide" DECIMAL DEFAULT 0.30,
        "royaltyMonthlyLimit" INTEGER DEFAULT 8,
        "maxPassengersPerDriver" INTEGER DEFAULT 700,
        "bindingMonthsFirst" INTEGER DEFAULT 36,
        "bindingMonthsRenew" INTEGER DEFAULT 24,
        "autoSuspendMinAcceptance" INTEGER DEFAULT 70,
        "autoSuspendMinRating" DECIMAL DEFAULT 4.5,
        "launchDate" DATE DEFAULT '2026-07-30',
        "pricePerCredit" DECIMAL DEFAULT 1.50
      );

      CREATE TABLE IF NOT EXISTS "Referral" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "referrerId" UUID REFERENCES "User"(id),
        "referredId" UUID REFERENCES "User"(id),
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "Ride" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "passengerId" UUID REFERENCES "User"(id),
        "driverId" UUID REFERENCES "User"(id),
        "origin" TEXT NOT NULL,
        "destination" TEXT NOT NULL,
        "price" DECIMAL NOT NULL,
        "distanceKm" DECIMAL NOT NULL,
        "vehicleType" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Injeção de Admin Master
    const adminEmail = process.env.ADMIN_EMAIL || 'leandro2703palmeira@gmail.com';
    const adminPass = process.env.ADMIN_PASSWORD || 'Lps27031981@';
    const adminName = process.env.ADMIN_NAME || 'Leandro Palmeira';
    const hash = await bcrypt.hash(adminPass, 10);

    await client.query(`
      INSERT INTO "User" (name, email, password, role, "isApproved")
      VALUES ($1, $2, $3, 'ADMIN', true)
      ON CONFLICT (email) DO UPDATE SET password = $3, role = 'ADMIN';
    `, [adminName, adminEmail, hash]);

    // Garantir AdminConfig singleton
    await client.query(`
      INSERT INTO "AdminConfig" (id) VALUES ('singleton')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('✅ [Sistema] Banco de dados e Admin prontos.');
  } catch (err) {
    console.error('❌ [Sistema] Erro no banco:', err.message);
  } finally {
    if (client) {
      client.release();
    }
  }
}

// ============================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ============================================
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// ============================================
// 3. API - AUTENTICAÇÃO
// ============================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, referrerQrCode } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const hash = await bcrypt.hash(password, 10);
    const qrCode = role === 'DRIVER' ? `ZOMP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}` : null;

    const { rows } = await pool.query(`
      INSERT INTO "User" (name, email, password, role, "qrCode", "isApproved")
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role, "qrCode", "isApproved"
    `, [name, email, hash, role.toUpperCase(), qrCode, role === 'PASSENGER']);

    const user = rows[0];

    // Vincular referral se tiver qrCode do motorista
    if (referrerQrCode && role === 'PASSENGER') {
      const { rows: driverRows } = await pool.query('SELECT id FROM "User" WHERE "qrCode" = $1', [referrerQrCode]);
      if (driverRows.length > 0) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 36);
        await pool.query(
          'INSERT INTO "Referral" ("referrerId", "referredId", "expiresAt") VALUES ($1, $2, $3)',
          [driverRows[0].id, user.id, expiresAt]
        );
      }
    }

    const authToken = jwt.sign({ id: user.id, role: user.role.toUpperCase() }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token: authToken, user: { id: user.id, name: user.name, role: user.role.toUpperCase(), email: user.email } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado!', details: 'Unique constraint failed on email' });
    }
    console.error('Erro no registro:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    const user = rows[0];

    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: user.id, role: user.role.toUpperCase() }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role.toUpperCase(),
        email: user.email,
        qrCode: user.qrCode,
        isApproved: user.isApproved,
        photo: user.photo
      }
    });
  } catch (err) {
    console.error('Erro no login:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { token: googleToken, role } = req.body;
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({ idToken: googleToken });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let { rows } = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    let user = rows[0];

    if (!user) {
      const qrCode = role === 'DRIVER' ? `ZOMP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}` : null;
      const result = await pool.query(`
        INSERT INTO "User" (name, email, password, role, photo, "qrCode", "isApproved")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [name, email, 'GOOGLE_AUTH', role || 'PASSENGER', picture, qrCode, (role || 'PASSENGER') === 'PASSENGER']);
      user = result.rows[0];
    }

    const authToken = jwt.sign({ id: user.id, role: user.role.toUpperCase() }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token: authToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role.toUpperCase(),
        email: user.email,
        qrCode: user.qrCode,
        isApproved: user.isApproved,
        photo: user.photo
      }
    });
  } catch (err) {
    console.error('Erro Google Auth:', err.message);
    res.status(500).json({ error: 'Erro na autenticação com Google' });
  }
});

// ============================================
// 4. API - PERFIL DO USUÁRIO
// ============================================
app.put('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, pixKey, photo, cnh, crlv, carPlate, carModel, carColor } = req.body;
    const { rows } = await pool.query(`
      UPDATE "User" SET
        name = COALESCE($2, name),
        phone = COALESCE($3, phone),
        "pixKey" = COALESCE($4, "pixKey"),
        photo = COALESCE($5, photo),
        cnh = COALESCE($6, cnh),
        crlv = COALESCE($7, crlv),
        "carPlate" = COALESCE($8, "carPlate"),
        "carModel" = COALESCE($9, "carModel"),
        "carColor" = COALESCE($10, "carColor"),
        "updatedAt" = NOW()
      WHERE id = $1
      RETURNING id, name, email, role, phone, "pixKey", photo, cnh, crlv, "carPlate", "carModel", "carColor", "isApproved", "qrCode"
    `, [req.user.id, name, phone, pixKey, photo, cnh, crlv, carPlate, carModel, carColor]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// ============================================
// 5. API - CORRIDAS
// ============================================
app.post('/api/rides/request', authMiddleware, async (req, res) => {
  try {
    const { origin, destination, price, distanceKm, vehicleType } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO "Ride" ("passengerId", origin, destination, price, "distanceKm", "vehicleType", status)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
      RETURNING *
    `, [req.user.id, origin, destination, price, distanceKm, vehicleType]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao solicitar corrida:', err.message);
    res.status(500).json({ error: 'Erro ao solicitar corrida' });
  }
});

app.get('/api/rides/pending', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, u.name as "passengerName", u.photo as "passengerPhoto", u.phone as "passengerPhone"
      FROM "Ride" r
      JOIN "User" u ON r."passengerId" = u.id
      WHERE r.status = 'PENDING'
      ORDER BY r."createdAt" DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar corridas pendentes:', err.message);
    res.status(500).json({ error: 'Erro ao buscar corridas' });
  }
});

app.get('/api/rides', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    let query;
    if (role === 'DRIVER') {
      query = await pool.query('SELECT * FROM "Ride" WHERE "driverId" = $1 ORDER BY "createdAt" DESC LIMIT 50', [userId]);
    } else {
      query = await pool.query('SELECT * FROM "Ride" WHERE "passengerId" = $1 ORDER BY "createdAt" DESC LIMIT 50', [userId]);
    }
    res.json(query.rows);
  } catch (err) {
    console.error('Erro ao buscar histórico:', err.message);
    res.json([]);
  }
});

app.post('/api/rides/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      UPDATE "Ride" SET "driverId" = $1, status = 'ACCEPTED', "updatedAt" = NOW()
      WHERE id = $2 AND status = 'PENDING'
      RETURNING *
    `, [req.user.id, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Corrida não encontrada ou já aceita' });

    await pool.query('UPDATE "User" SET "ridesAccepted" = "ridesAccepted" + 1 WHERE id = $1', [req.user.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao aceitar corrida:', err.message);
    res.status(500).json({ error: 'Erro ao aceitar corrida' });
  }
});

app.post('/api/rides/:id/reject', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE "User" SET "ridesMissed" = "ridesMissed" + 1 WHERE id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao rejeitar corrida:', err.message);
    res.status(500).json({ error: 'Erro ao rejeitar corrida' });
  }
});

app.post('/api/rides/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      UPDATE "Ride" SET status = 'COMPLETED', "updatedAt" = NOW()
      WHERE id = $1 AND "driverId" = $2
      RETURNING *
    `, [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Corrida não encontrada' });

    const ride = rows[0];

    // Incrementar ridesCompleted do motorista
    await pool.query('UPDATE "User" SET "ridesCompleted" = "ridesCompleted" + 1 WHERE id = $1', [req.user.id]);

    // Processar Royalties
    const { rows: referrals } = await pool.query(`
      SELECT r."referrerId" FROM "Referral" r
      WHERE r."referredId" = $1 AND r."expiresAt" > NOW()
    `, [ride.passengerId]);

    if (referrals.length > 0) {
      const config = await pool.query('SELECT * FROM "AdminConfig" WHERE id = $1', ['singleton']);
      const royaltyValue = config.rows[0]?.royaltyPerRide || 0.30;
      await pool.query('UPDATE "User" SET balance = balance + $1 WHERE id = $2', [royaltyValue, referrals[0].referrerId]);
    }

    res.json(ride);
  } catch (err) {
    console.error('Erro ao completar corrida:', err.message);
    res.status(500).json({ error: 'Erro ao completar corrida' });
  }
});

app.put('/api/rides/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      UPDATE "Ride" SET status = 'CANCELLED', "updatedAt" = NOW()
      WHERE id = $1 AND ("passengerId" = $2 OR "driverId" = $2)
      RETURNING *
    `, [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Corrida não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao cancelar corrida:', err.message);
    res.status(500).json({ error: 'Erro ao cancelar corrida' });
  }
});

// ============================================
// 6. API - CARTEIRA (WALLET)
// ============================================
app.get('/api/wallet', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT balance, credits FROM "User" WHERE id = $1', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar carteira:', err.message);
    res.status(500).json({ error: 'Erro ao buscar carteira' });
  }
});

app.post('/api/wallet/withdraw', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT balance, "pixKey" FROM "User" WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (!user.pixKey) return res.status(400).json({ error: 'Chave PIX não cadastrada' });
    if (parseFloat(user.balance) <= 0) return res.status(400).json({ error: 'Saldo insuficiente' });

    await pool.query('UPDATE "User" SET balance = 0 WHERE id = $1', [req.user.id]);
    res.json({ message: `Saque de R$ ${user.balance} solicitado com sucesso para PIX: ${user.pixKey}` });
  } catch (err) {
    console.error('Erro ao solicitar saque:', err.message);
    res.status(500).json({ error: 'Erro ao solicitar saque' });
  }
});

// ============================================
// 7. API - CRÉDITOS
// ============================================
app.get('/api/credits', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT credits FROM "User" WHERE id = $1', [req.user.id]);
    const config = await pool.query('SELECT "pricePerCredit" FROM "AdminConfig" WHERE id = $1', ['singleton']);
    res.json({ credits: rows[0]?.credits || 0, pricePerCredit: config.rows[0]?.pricePerCredit || 1.50 });
  } catch (err) {
    console.error('Erro ao buscar créditos:', err.message);
    res.status(500).json({ error: 'Erro ao buscar créditos' });
  }
});

app.post('/api/credits/purchase', authMiddleware, async (req, res) => {
  try {
    const { quantity } = req.body;
    const { rows } = await pool.query(
      'UPDATE "User" SET credits = credits + $1 WHERE id = $2 RETURNING credits',
      [quantity, req.user.id]
    );
    res.json({ credits: rows[0].credits });
  } catch (err) {
    console.error('Erro ao comprar créditos:', err.message);
    res.status(500).json({ error: 'Erro ao comprar créditos' });
  }
});

// ============================================
// 8. API - CONFIGURAÇÃO GLOBAL
// ============================================
app.get('/api/config', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM "AdminConfig" WHERE id = $1', ['singleton']);
    if (rows.length === 0) return res.json({});
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar config:', err.message);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

app.put('/api/config', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    const fields = req.body;
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ error: 'Nenhum campo fornecido' });

    const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = keys.map(k => fields[k]);
    const { rows } = await pool.query(
      `UPDATE "AdminConfig" SET ${sets} WHERE id = 'singleton' RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar config:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// ============================================
// 9. API - ADMIN (Gestão de Usuários)
// ============================================
app.get('/api/admin/users', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    const { rows } = await pool.query('SELECT id, name, email, role, "isApproved", "qrCode", credits, balance, rating, "totalRatings", "ridesAccepted", "ridesMissed", "ridesCompleted", phone, "pixKey", photo, cnh, crlv, "carPlate", "carModel", "carColor", "createdAt" FROM "User" ORDER BY "createdAt" DESC');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar usuários:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.put('/api/admin/users/:id/approve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    const { rows } = await pool.query('UPDATE "User" SET "isApproved" = true WHERE id = $1 RETURNING *', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao aprovar usuário' });
  }
});

app.put('/api/admin/users/:id/credits', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    const { amount } = req.body;
    const { rows } = await pool.query('UPDATE "User" SET credits = credits + $1 WHERE id = $2 RETURNING credits', [amount, req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar créditos' });
  }
});

app.put('/api/admin/users/:id/reset-stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    const { rows } = await pool.query(
      'UPDATE "User" SET "ridesAccepted" = 0, "ridesMissed" = 0 WHERE id = $1 RETURNING "ridesAccepted", "ridesMissed"',
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao resetar estatísticas' });
  }
});

app.get('/api/admin/rides', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    const { rows } = await pool.query(`
      SELECT r.*, 
        p.name as "passengerName", p.email as "passengerEmail",
        d.name as "driverName", d.email as "driverEmail"
      FROM "Ride" r
      LEFT JOIN "User" p ON r."passengerId" = p.id
      LEFT JOIN "User" d ON r."driverId" = d.id
      ORDER BY r."createdAt" DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar corridas (admin):', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/api/admin/referrals', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    const { rows } = await pool.query(`
      SELECT r.*, 
        d.name as "driverName", d.email as "driverEmail",
        p.name as "passengerName", p.email as "passengerEmail"
      FROM "Referral" r
      JOIN "User" d ON r."referrerId" = d.id
      JOIN "User" p ON r."referredId" = p.id
      ORDER BY r."createdAt" DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar referrals:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ============================================
// 10. HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '12.2.8', timestamp: new Date().toISOString() });
});

// ============================================
// 11. SUPORTE A ROTAS DO REACT (SPA FALLBACK)
// ============================================
if (fs.existsSync(distPath)) {
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ============================================
// START
// ============================================
app.listen(PORT, async () => {
  console.log(`📡 ZOMP API v12.2.8 ONLINE: http://localhost:${PORT}`);
  await initDB();
});
