const { pool } = require('../config/db');

exports.requestRide = async (req, res) => {
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
};

exports.getPendingRides = async (req, res) => {
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
};

exports.getHistory = async (req, res) => {
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
};

exports.acceptRide = async (req, res) => {
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
};

exports.rejectRide = async (req, res) => {
  try {
    await pool.query('UPDATE "User" SET "ridesMissed" = "ridesMissed" + 1 WHERE id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao rejeitar corrida:', err.message);
    res.status(500).json({ error: 'Erro ao rejeitar corrida' });
  }
};

exports.completeRide = async (req, res) => {
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
};

exports.cancelRide = async (req, res) => {
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
};
