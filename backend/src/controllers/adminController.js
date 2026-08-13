const { pool } = require('../config/db');

function checkAdmin(req, res) {
  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Acesso negado' });
    return true;
  }
  return false;
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ── LISTA DE USUÁRIOS ──
exports.getUsers = async (req, res) => {
  if (checkAdmin(req, res)) return;
  try {
    const { rows } = await pool.query(`
      SELECT id, name, email, role, "isApproved", "qrCode", credits, balance, rating,
        "totalRatings", "ridesAccepted", "ridesMissed", "ridesCompleted",
        phone, "pixKey", photo, cnh, crlv, "carPlate", "carModel", "carColor", "createdAt"
      FROM "User" ORDER BY "createdAt" DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar usuários:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// ── STATS / DASHBOARD ──
exports.getStats = async (req, res) => {
  if (checkAdmin(req, res)) return;
  try {
    const { rows: users } = await pool.query('SELECT role, "isApproved", balance, credits FROM "User"');
    const totalDrivers = users.filter(u => u.role === 'DRIVER').length;
    const totalPassengers = users.filter(u => u.role === 'PASSENGER').length;

    const { rows: rides } = await pool.query('SELECT status, price FROM "Ride"');
    const totalRides = rides.length;
    const activeRidesCount = rides.filter(r => r.status === 'ACCEPTED' || r.status === 'PENDING').length;
    const completedRides = rides.filter(r => r.status === 'COMPLETED');

    const grossRevenue = completedRides.reduce((sum, r) => sum + safeNum(r.price), 0);
    const serverFeesTotal = completedRides.length * 0.10;
    const taxes = grossRevenue * 0.06;
    const royaltiesTotal = completedRides.length * 0.30;
    const netProfit = grossRevenue - taxes - serverFeesTotal - royaltiesTotal;

    const royaltyFundBalance = users.reduce((sum, u) => {
      const bal = safeNum(u.balance);
      return sum + (bal > 0 ? bal : 0);
    }, 0);

    res.json({
      totalDrivers,
      totalPassengers,
      totalRides,
      activeRidesCount,
      royaltyFundBalance,
      financials: {
        grossRevenue,
        taxes,
        serverFeesTotal,
        royaltiesTotal,
        netProfit
      }
    });
  } catch (err) {
    console.error('Erro ao buscar stats:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// ── OPERAÇÕES (CORRIDAS) ──
exports.getOperations = async (req, res) => {
  if (checkAdmin(req, res)) return;
  try {
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
};

// ── MOTORISTAS ──
exports.getDrivers = async (req, res) => {
  if (checkAdmin(req, res)) return;
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u."isApproved", u."qrCode", u.credits, u.balance, u.rating,
        u."ridesAccepted", u."ridesMissed", u."ridesCompleted", u.phone, u."pixKey",
        u.photo, u.cnh, u.crlv, u."carPlate", u."carModel", u."carColor", u."createdAt",
        (SELECT COUNT(*) FROM "Referral" r WHERE r."referrerId" = u.id) as "linkedPassengers"
      FROM "User" u WHERE u.role = 'DRIVER' ORDER BY u."createdAt" DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar motoristas:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// ── PASSAGEIROS ──
exports.getPassengers = async (req, res) => {
  if (checkAdmin(req, res)) return;
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u."isApproved", u.rating, u."ridesCompleted",
        u."createdAt", u.phone,
        (SELECT d.name FROM "Referral" r JOIN "User" d ON r."referrerId" = d.id WHERE r."referredId" = u.id LIMIT 1) as "linkedDriverName"
      FROM "User" u WHERE u.role = 'PASSENGER' ORDER BY u."createdAt" DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar passageiros:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// ── APROVAR / SUSPENDER ──
exports.approveUser = async (req, res) => {
  if (checkAdmin(req, res)) return;
  try {
    const { isApproved } = req.body;
    const { rows } = await pool.query(
      'UPDATE "User" SET "isApproved" = $1 WHERE id = $2 RETURNING id, name, email, role, "isApproved"',
      [isApproved !== false, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao aprovar usuário:', err.message);
    res.status(500).json({ error: 'Erro ao aprovar usuário' });
  }
};

// ── ADICIONAR CRÉDITOS ──
exports.addCredits = async (req, res) => {
  if (checkAdmin(req, res)) return;
  try {
    const { amount } = req.body;
    const qty = safeNum(amount, 0);
    if (qty === 0) return res.status(400).json({ error: 'Quantidade inválida' });
    const { rows } = await pool.query(
      'UPDATE "User" SET credits = credits + $1 WHERE id = $2 RETURNING credits',
      [qty, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao adicionar créditos:', err.message);
    res.status(500).json({ error: 'Erro ao adicionar créditos' });
  }
};

// ── RESETAR ESTATÍSTICAS ──
exports.resetStats = async (req, res) => {
  if (checkAdmin(req, res)) return;
  try {
    const { rows } = await pool.query(
      'UPDATE "User" SET "ridesAccepted" = 0, "ridesMissed" = 0 WHERE id = $1 RETURNING "ridesAccepted", "ridesMissed"',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao resetar estatísticas:', err.message);
    res.status(500).json({ error: 'Erro ao resetar estatísticas' });
  }
};

// ── LISTAR CORRIDAS ──
exports.getRides = async (req, res) => {
  if (checkAdmin(req, res)) return;
  try {
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
};

// ── LISTAR INDICAÇÕES ──
exports.getReferrals = async (req, res) => {
  if (checkAdmin(req, res)) return;
  try {
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
};

// ── CONFIG ──
exports.getConfig = async (req, res) => {
  if (checkAdmin(req, res)) return;
  try {
    const { rows } = await pool.query('SELECT * FROM "AdminConfig" WHERE id = $1', ['singleton']);
    if (rows.length === 0) return res.json({});
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar config:', err.message);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
};

exports.updateConfig = async (req, res) => {
  if (checkAdmin(req, res)) return;
  try {
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
};

// ── FUNDO DE ROYALTIES ──
exports.getRoyaltyFund = async (req, res) => {
  if (checkAdmin(req, res)) return;
  try {
    const { rows } = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) as total,
        COUNT(*) FILTER (WHERE balance > 0) as "driverCount"
      FROM "User" WHERE role = 'DRIVER'
    `);
    const { rows: topDrivers } = await pool.query(`
      SELECT name, balance FROM "User" WHERE role = 'DRIVER' AND balance > 0
      ORDER BY balance DESC LIMIT 10
    `);
    res.json({
      total: safeNum(rows[0]?.total, 0),
      driverCount: safeNum(rows[0]?.driverCount, 0),
      topDrivers
    });
  } catch (err) {
    console.error('Erro ao buscar fundo:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// ── SAQUES ──
exports.getWithdrawals = async (req, res) => {
  if (checkAdmin(req, res)) return;
  try {
    const { rows } = await pool.query(`
      SELECT w.id, w.amount, w.status, w."createdAt",
        u.name as "userName", u.email as "userEmail", u."pixKey"
      FROM "Withdrawal" w
      JOIN "User" u ON w."userId" = u.id
      ORDER BY w."createdAt" DESC
    `);
    res.json(rows);
  } catch (err) {
    // Tabela pode não existir ainda
    res.json([]);
  }
};

exports.handleWithdrawal = async (req, res) => {
  if (checkAdmin(req, res)) return;
  try {
    const { status } = req.body;
    const { rows } = await pool.query(
      'UPDATE "Withdrawal" SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Saque não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar saque' });
  }
};
