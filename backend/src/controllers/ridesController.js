const { pool } = require('../config/db');

exports.requestRide = async (req, res) => {
  try {
    const { origin, destination, price, distanceKm, vehicleType } = req.body;
    const validOrigin = (origin && origin.trim()) || 'Origem';
    const validDest = (destination && destination.trim()) || 'Destino';
    const validPrice = parseFloat(price) || 10.0;
    const validDistance = parseFloat(distanceKm) || 1.0;
    const validVehicle = vehicleType || 'car';

    const { rows } = await pool.query(`
      INSERT INTO "Ride" ("passengerId", origin, destination, price, "distanceKm", "vehicleType", status)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
      RETURNING *
    `, [req.user.id, validOrigin, validDest, validPrice, validDistance, validVehicle]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao solicitar corrida:', err.message);
    res.status(500).json({ error: 'Erro ao solicitar corrida' });
  }
};

exports.getPendingRides = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, 
             COALESCE(u.name, 'Passageiro') as "passengerName", 
             u.photo as "passengerPhoto", 
             u.phone as "passengerPhone",
             u.rating as "passengerRating",
             u."ridesCompleted" as "passengerRidesCompleted"
      FROM "Ride" r
      LEFT JOIN "User" u ON r."passengerId" = u.id
      WHERE r.status = 'PENDING'
        AND (
          r."createdAt" >= NOW() - INTERVAL '10 minutes'
          OR r."distanceKm" >= 50
          OR r."vehicleType" ILIKE '%long%'
          OR r."vehicleType" ILIKE '%intercity%'
          OR r."vehicleType" ILIKE '%scheduled%'
          OR r."vehicleType" ILIKE '%freight%'
        )
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

exports.getRideById = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*,
        d.name as "driverName", d."carModel" as "driverCarModel",
        d."carPlate" as "driverCarPlate", d."carColor" as "driverCarColor",
        d.rating as "driverRating", d."ridesCompleted" as "driverRidesCompleted",
        d.phone as "driverPhone", d.photo as "driverPhoto", d."pixKey" as "driverPixKey",
        p.name as "passengerName", p.phone as "passengerPhone"
      FROM "Ride" r
      LEFT JOIN "User" d ON r."driverId" = d.id
      LEFT JOIN "User" p ON r."passengerId" = p.id
      WHERE r.id = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Corrida não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar corrida:', err.message);
    res.status(500).json({ error: 'Erro ao buscar corrida' });
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

exports.nearDestinationRide = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      UPDATE "Ride" SET status = 'NEAR_DESTINATION', "updatedAt" = NOW()
      WHERE id = $1 AND "driverId" = $2
      RETURNING *
    `, [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Corrida não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar para próximo do destino:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar corrida' });
  }
};

exports.applyDiscount = async (req, res) => {
  try {
    const { discountAmount = 2.00 } = req.body;
    const { rows: current } = await pool.query('SELECT * FROM "Ride" WHERE id = $1', [req.params.id]);
    if (current.length === 0) return res.status(404).json({ error: 'Corrida não encontrada' });
    
    const ride = current[0];
    const currentPrice = parseFloat(ride.price) || 0;
    
    if (currentPrice <= 12.00) {
      return res.status(400).json({ error: 'O desconto do Preço Imbatível é válido apenas para corridas acima de R$ 12,00.' });
    }

    const newPrice = Math.max(currentPrice - parseFloat(discountAmount), 8.00);
    
    const { rows: updated } = await pool.query(`
      UPDATE "Ride" SET price = $1, "updatedAt" = NOW()
      WHERE id = $2
      RETURNING *
    `, [newPrice, req.params.id]);

    res.json(updated[0]);
  } catch (err) {
    console.error('Erro ao aplicar desconto:', err.message);
    res.status(500).json({ error: 'Erro ao aplicar desconto' });
  }
};
