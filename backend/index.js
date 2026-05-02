require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { query, pool } = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

async function initAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'leandro2703palmeira@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Lps27031981@';
    const adminName = process.env.ADMIN_NAME || 'Leandro Palmeira';

    const { rows } = await query('SELECT id FROM "User" WHERE email = $1', [adminEmail]);
    const hash = await bcrypt.hash(adminPassword, 10);

    if (rows.length === 0) {
      await query(
        'INSERT INTO "User" (id, name, email, password, role, balance, rating, "totalRatings", "ridesAccepted", "ridesMissed", "ridesCompleted", "isApproved", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, 5, 0, 0, 0, 0, true, NOW(), NOW())',
        [adminName, adminEmail, hash, 'ADMIN']
      );
      console.log('✅ Admin initialized:', adminEmail);
    } else {
      // Forçar sincronização de senha e cargo caso tenha mudado
      await query('UPDATE "User" SET password = $1, name = $2, role = $3 WHERE email = $4', [hash, adminName, 'ADMIN', adminEmail]);
      console.log('ℹ️ Admin credentials and role synchronized:', adminEmail);
    }

    // Config singleton
    const { rows: configRows } = await query('SELECT id FROM "AdminConfig" WHERE id = $1', ['singleton']);
    if (configRows.length === 0) {
      await query(
        'INSERT INTO "AdminConfig" (id, "pricePerKmCar", "pricePerKmMoto", "minFareCar", "minFareMoto", "royaltyPerRide", "royaltyMonthlyLimit", "maxPassengersPerDriver", "bindingMonthsFirst", "bindingMonthsRenew", "autoSuspendMinAcceptance", "autoSuspendMinRating") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
        ['singleton', 2.00, 1.50, 8.40, 7.20, 0.30, 8, 700, 36, 24, 70, 4.5]
      );
      console.log('✅ AdminConfig initialized');
    }
  } catch (e) {
    console.error("❌ Error initializing admin:", e);
  }
}

const app = express();

// CORS explÃ­cito
const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const JWT_SECRET = process.env.JWT_SECRET || 'zomp_super_secret_key_2026_change_in_production';

// Helper: Check and apply auto-suspension
async function checkDriverSuspension(driverId) {
  try {
    const { rows: driverRows } = await query('SELECT * FROM "User" WHERE id = $1', [driverId]);
    const driver = driverRows[0];
    const { rows: configRows } = await query('SELECT * FROM "AdminConfig" WHERE id = $1', ['singleton']);
    const config = configRows[0];

    if (!driver || !config) return;

    const totalRequests = (driver.ridesAccepted || 0) + (driver.ridesMissed || 0);
    const acceptanceRate = (driver.ridesAccepted / totalRequests) * 100 || 100;
    const rating = driver.rating || 5;

    let shouldSuspend = false;
    let reason = "";

    if (totalRequests >= 5) {
      if (acceptanceRate < (config.autoSuspendMinAcceptance || 70)) {
        shouldSuspend = true;
        reason = `Baixa taxa de aceitaÃ§Ã£o (${acceptanceRate.toFixed(1)}%)`;
      }
    }

    if ((driver.totalRatings || 0) >= 3) {
      if (rating < (config.autoSuspendMinRating || 4.5)) {
        shouldSuspend = true;
        reason = `AvaliaÃ§Ã£o insuficiente (${rating.toFixed(1)} estrelas)`;
      }
    }

    if (shouldSuspend && driver.isApproved) {
      await query('UPDATE "User" SET "isApproved" = false WHERE id = $1', [driverId]);
      console.log(`[AUTO-SUSPEND] Motorista ${driverId} suspenso. Motivo: ${reason}`);
    }
  } catch (e) {
    console.error("Erro ao verificar suspensÃ£o:", e);
  }
}

// --- AUTHENTICATION & USERS ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, referrerQrCode } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const qrCode = role === 'DRIVER' ? Math.random().toString(36).substring(2, 15) : null;
    const initialCredits = role === 'DRIVER' ? 10 : 0;
    const initialRole = role || 'PASSENGER';

    const { rows } = await query(
      'INSERT INTO "User" (id, name, email, password, role, "qrCode", credits, balance, rating, "totalRatings", "ridesAccepted", "ridesMissed", "ridesCompleted", "isApproved", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 0, 5, 0, 0, 0, 0, true, NOW(), NOW()) RETURNING id, email, role',
      [name, email, hashedPassword, initialRole, qrCode, initialCredits]
    );
    const user = rows[0];

    if (referrerQrCode && initialRole === 'PASSENGER') {
      const { rows: referrers } = await query('SELECT id FROM "User" WHERE "qrCode" = $1 AND role = $2', [referrerQrCode, 'DRIVER']);
      const referrer = referrers[0];
      if (referrer) {
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 2);
        await query('INSERT INTO "Referral" (id, "referrerId", "referredId", "expiresAt", "createdAt") VALUES (gen_random_uuid(), $1, $2, $3, NOW())', [referrer.id, user.id, expiresAt]);
      }
    }

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error creating user', details: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await query('SELECT * FROM "User" WHERE email = $1', [email]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, qrCode: user.qrCode, balance: user.balance, credits: user.credits, cnh: user.cnh, crlv: user.crlv, carPlate: user.carPlate, carModel: user.carModel, carColor: user.carColor, isApproved: user.isApproved } });
  } catch (error) {
    res.status(500).json({ error: 'Internal error login' });
  }
});

app.get('/api/config', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM "AdminConfig" WHERE id = $1', ['singleton']);
    const config = rows[0];
    res.json(config || {
      pricePerKmCar: 2.0, pricePerKmMoto: 1.5, minFareCar: 8.4, minFareMoto: 7.2,
      royaltyPerRide: 0.3, pricePerCredit: 1.0, minKmPriceImbativel: 1.50, discountImbativel: 2.0
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/user/profile', authenticate, async (req, res) => {
  try {
    const { name, email, cnh, crlv, photo, carPlate, carModel, carColor } = req.body;
    const { rows } = await query(
      'UPDATE "User" SET name = $1, email = $2, cnh = $3, crlv = $4, photo = $5, "carPlate" = $6, "carModel" = $7, "carColor" = $8, "updatedAt" = NOW() WHERE id = $9 RETURNING *',
      [name, email, cnh, crlv, photo, carPlate, carModel, carColor, req.user.id]
    );
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error updating profile' });
  }
});

// --- RIDES ---

app.post('/api/rides/request', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'PASSENGER') return res.status(403).json({ error: 'Only passengers can request a ride' });
    const { origin, destination, price, distanceKm, vehicleType } = req.body;
    const { rows } = await query(
      'INSERT INTO "Ride" (id, "passengerId", origin, destination, price, "distanceKm", "vehicleType", status, "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *',
      [req.user.id, origin, destination, parseFloat(price), parseFloat(distanceKm), vehicleType, 'PENDING']
    );
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error requesting ride' });
  }
});

app.get('/api/rides', authenticate, async (req, res) => {
  try {
    const col = req.user.role === 'PASSENGER' ? 'passengerId' : 'driverId';
    const { rows } = await query(`SELECT * FROM "Ride" WHERE "${col}" = $1 ORDER BY "createdAt" DESC`, [req.user.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching rides' });
  }
});

app.post('/api/rides/:id/accept', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DRIVER') return res.status(403).json({ error: 'Only drivers can accept rides' });
    const { rows: driverRows } = await query('SELECT credits FROM "User" WHERE id = $1', [req.user.id]);
    if (driverRows[0].credits <= 0) return res.status(400).json({ error: 'Sem crÃ©ditos!' });

    const { rows: rideRows } = await query('SELECT status FROM "Ride" WHERE id = $1', [req.params.id]);
    if (!rideRows[0] || rideRows[0].status !== 'PENDING') return res.status(400).json({ error: 'Ride is no longer available' });

    await query('UPDATE "User" SET credits = credits - 1, "ridesAccepted" = "ridesAccepted" + 1 WHERE id = $1', [req.user.id]);
    const { rows } = await query('UPDATE "Ride" SET status = $1, "driverId" = $2, "updatedAt" = NOW() WHERE id = $3 RETURNING *', ['ACCEPTED', req.user.id, req.params.id]);
    checkDriverSuspension(req.user.id);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error accepting ride' });
  }
});

app.post('/api/rides/:id/complete', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DRIVER') return res.status(403).json({ error: 'Only drivers can complete a ride' });
    const { rows: rideRows } = await query('UPDATE "Ride" SET status = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *', ['COMPLETED', req.params.id]);
    const ride = rideRows[0];

    const { rows: refRows } = await query('SELECT * FROM "Referral" WHERE "referredId" = $1', [ride.passengerId]);
    const referral = refRows[0];
    const isExpired = referral ? new Date(referral.expiresAt) < new Date() : true;

    if (referral && !isExpired) {
      await query('UPDATE "User" SET balance = balance + 0.10 WHERE id = $1', [referral.referrerId]);
    } else {
      if (referral) await query('DELETE FROM "Referral" WHERE "referredId" = $1', [ride.passengerId]);
      const expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 2);
      await query('INSERT INTO "Referral" (id, "referrerId", "referredId", "expiresAt", "createdAt") VALUES (gen_random_uuid(), $1, $2, $3, NOW())', [req.user.id, ride.passengerId, expiresAt]);
      await query('UPDATE "User" SET balance = balance + 0.10 WHERE id = $1', [req.user.id]);
    }
    await query('UPDATE "User" SET "ridesCompleted" = "ridesCompleted" + 1 WHERE id = $1', [req.user.id]);
    res.json({ message: 'Ride completed', ride });
  } catch (error) {
    res.status(500).json({ error: 'Error completing ride' });
  }
});

// --- ADMIN ---
const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado.' });
  next();
};

app.get('/api/admin/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const [d, p, r, f] = await Promise.all([
      query('SELECT COUNT(*) FROM "User" WHERE role = $1', ['DRIVER']),
      query('SELECT COUNT(*) FROM "User" WHERE role = $1', ['PASSENGER']),
      query('SELECT COUNT(*) FROM "Ride" WHERE status = $1', ['COMPLETED']),
      query('SELECT SUM(amount) FROM "RoyaltyFund"')
    ]);
    res.json({ totalDrivers: d.rows[0].count, totalPassengers: p.rows[0].count, completedRidesCount: r.rows[0].count, royaltyFundBalance: f.rows[0].sum || 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
}

app.listen(process.env.PORT || 3001, '0.0.0.0', () => {
  console.log('Server running on port 3001');
  initAdmin();
});
