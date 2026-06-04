const { pool } = require('../config/db');

exports.getUsers = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    const { rows } = await pool.query('SELECT id, name, email, role, "isApproved", "qrCode", credits, balance, rating, "totalRatings", "ridesAccepted", "ridesMissed", "ridesCompleted", phone, "pixKey", photo, cnh, crlv, "carPlate", "carModel", "carColor", "createdAt" FROM "User" ORDER BY "createdAt" DESC');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar usuários:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
};

exports.approveUser = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    const { rows } = await pool.query('UPDATE "User" SET "isApproved" = true WHERE id = $1 RETURNING *', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao aprovar usuário' });
  }
};

exports.addCredits = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    const { amount } = req.body;
    const { rows } = await pool.query('UPDATE "User" SET credits = credits + $1 WHERE id = $2 RETURNING credits', [amount, req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar créditos' });
  }
};

exports.resetStats = async (req, res) => {
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
};

exports.getRides = async (req, res) => {
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
};

exports.getReferrals = async (req, res) => {
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
};
