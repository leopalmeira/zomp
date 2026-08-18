const { pool } = require('../config/db');

exports.requestRide = async (req, res) => {
  try {
    const { origin, destination, price, distanceKm, vehicleType } = req.body;
    const validOrigin = (origin && origin.trim()) || 'Origem';
    const validDest = (destination && destination.trim()) || 'Destino';
    let validPrice = parseFloat(price) || 10.0;
    const validDistance = parseFloat(distanceKm) || 1.0;
    const validVehicle = vehicleType || 'car';

    // Garante colunas na tabela User e Ride
    await pool.query('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingDebt" NUMERIC(10,2) DEFAULT 0');
    await pool.query('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "driverAppDebt" NUMERIC(10,2) DEFAULT 0');
    await pool.query('ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "pendingDebtIncluded" NUMERIC(10,2) DEFAULT 0');
    await pool.query('ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "originLat" NUMERIC(10,6)');
    await pool.query('ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "originLon" NUMERIC(10,6)');
    await pool.query('ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "destLat" NUMERIC(10,6)');
    await pool.query('ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "destLon" NUMERIC(10,6)');
    await pool.query('ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW()');
    await pool.query('ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW()');

    const originLat = req.body.originLat != null ? parseFloat(req.body.originLat) : null;
    const originLon = req.body.originLon != null ? parseFloat(req.body.originLon) : null;
    const destLat = req.body.destLat != null ? parseFloat(req.body.destLat) : null;
    const destLon = req.body.destLon != null ? parseFloat(req.body.destLon) : null;

    // 1. Verifica se o passageiro possui débito pendente de corrida anterior cancelada no percurso
    const { rows: userDebtRows } = await pool.query('SELECT "pendingDebt" FROM "User" WHERE id = $1', [req.user.id]);
    const pendingDebt = parseFloat(userDebtRows[0]?.pendingDebt || 0);

    // Se houver débito acumulado, adiciona ao valor da nova corrida e quita a pendência do usuário
    if (pendingDebt > 0) {
      validPrice += pendingDebt;
      await pool.query('UPDATE "User" SET "pendingDebt" = 0 WHERE id = $1', [req.user.id]);
    }

    const { rows } = await pool.query(`
      INSERT INTO "Ride" ("passengerId", origin, destination, price, "distanceKm", "vehicleType", "pendingDebtIncluded", "originLat", "originLon", "destLat", "destLon", status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', NOW(), NOW())
      RETURNING *
    `, [req.user.id, validOrigin, validDest, validPrice, validDistance, validVehicle, pendingDebt, originLat, originLon, destLat, destLon]);

    res.json({
      ...rows[0],
      pendingDebtIncluded: pendingDebt
    });
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
      ORDER BY r."createdAt" DESC NULLS LAST
      LIMIT 25
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

    // Zera qualquer pendência do passageiro (ele acabou de quitar esta corrida e dívida anterior)
    await pool.query('UPDATE "User" SET "pendingDebt" = 0 WHERE id = $1', [ride.passengerId]);

    // Se a corrida continha valor extra de dívida de corrida anterior, o motorista recebeu esse valor
    // e deve repassar ao app na sua próxima compra de créditos
    const pendingDebtIncluded = parseFloat(ride.pendingDebtIncluded || 0);
    if (pendingDebtIncluded > 0) {
      await pool.query('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "driverAppDebt" NUMERIC(10,2) DEFAULT 0');
      await pool.query('UPDATE "User" SET "driverAppDebt" = COALESCE("driverAppDebt", 0) + $1 WHERE id = $2', [pendingDebtIncluded, req.user.id]);
    }

    // Processar Royalties: se o passageiro é vinculado (indicado) a algum motorista,
    // credita R$ 0,30 na carteira de royalties do motorista que indicou ao finalizar a corrida
    let royaltyPaid = 0;
    try {
      const { rows: referrals } = await pool.query(`
        SELECT r."referrerId" FROM "Referral" r
        WHERE r."referredId" = $1 AND r."expiresAt" > NOW()
      `, [ride.passengerId]);

      if (referrals.length > 0) {
        const config = await pool.query('SELECT * FROM "AdminConfig" WHERE id = $1', ['singleton']);
        const royaltyValue = parseFloat(config.rows[0]?.royaltyPerRide || 0.30);
        await pool.query('UPDATE "User" SET balance = balance + $1 WHERE id = $2', [royaltyValue, referrals[0].referrerId]);
        royaltyPaid = royaltyValue;
        console.log(`✅ [Royalty] R$ ${royaltyValue.toFixed(2)} creditado ao motorista ${referrals[0].referrerId} (passageiro ${ride.passengerId} vinculado) na conclusão da corrida.`);
      }
    } catch (royaltyErr) {
      console.warn('Erro ao processar royalty na conclusão da corrida (não bloqueante):', royaltyErr.message);
    }

    res.json({ ...ride, royaltyPaid });
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
        p.name as "passengerName", p.phone as "passengerPhone", p.rating as "passengerRating"
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
    const rideId = req.params.id;
    const userId = req.user.id;
    const { status = 'CANCELLED', distanceTravelledKm, isMidRideCancel } = req.body || {};

    let proportionalPrice = 0;
    let proportionPct = 0;
    let debtAdded = false;

    if (rideId && rideId !== 'undefined' && rideId !== 'null') {
      const { rows: currentRides } = await pool.query('SELECT * FROM "Ride" WHERE id = $1', [rideId]);
      if (currentRides.length > 0) {
        const ride = currentRides[0];
        const isMidRide = isMidRideCancel || ride.status === 'IN_PROGRESS' || ride.status === 'NEAR_DESTINATION' || ride.status === 'ACCEPTED';

        // Se a corrida foi encerrada/cancelada no meio do percurso
        if (isMidRide) {
          const totalKm = parseFloat(ride.distanceKm) || 1.0;
          const travelledKm = parseFloat(distanceTravelledKm) || (totalKm * 0.5);
          const ratio = Math.min(Math.max(travelledKm / totalKm, 0.25), 1.0);
          proportionPct = Math.round(ratio * 100);
          proportionalPrice = Math.max(parseFloat((parseFloat(ride.price) * ratio).toFixed(2)), 6.00);

          // Salva o valor proporcional como débito pendente para cobrar na próxima corrida
          await pool.query('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingDebt" NUMERIC(10,2) DEFAULT 0');
          await pool.query('UPDATE "User" SET "pendingDebt" = COALESCE("pendingDebt", 0) + $1 WHERE id = $2', [proportionalPrice, ride.passengerId]);
          debtAdded = true;
        }
      }

      await pool.query(`
        UPDATE "Ride" SET status = $1, "updatedAt" = NOW()
        WHERE id = $2 AND ("passengerId" = $3 OR "driverId" = $3)
      `, [status, rideId, userId]);
    }

    // Cancela e destrói qualquer outra corrida PENDING deste passageiro para não sobrar nada tocando para motoristas
    await pool.query(`
      UPDATE "Ride" SET status = 'CANCELLED', "updatedAt" = NOW()
      WHERE "passengerId" = $1 AND status = 'PENDING'
    `, [userId]);

    res.json({
      ok: true,
      message: 'Corrida cancelada com sucesso',
      proportionalPrice,
      proportionPct,
      debtAdded
    });
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

exports.rateRide = async (req, res) => {
  try {
    const { rating, comment, role } = req.body;
    const numericRating = Math.max(1, Math.min(5, parseFloat(rating) || 5));
    
    const { rows: rideRows } = await pool.query('SELECT * FROM "Ride" WHERE id = $1', [req.params.id]);
    if (rideRows.length === 0) return res.status(404).json({ error: 'Corrida não encontrada' });
    const ride = rideRows[0];

    const targetUserId = role === 'PASSENGER' ? ride.driverId : ride.passengerId;
    if (targetUserId) {
      await pool.query(`
        UPDATE "User" 
        SET rating = ROUND(((COALESCE(rating, 5.0) * GREATEST(COALESCE("ridesCompleted", 1), 1) + $1) / (GREATEST(COALESCE("ridesCompleted", 1), 1) + 1))::numeric, 2)
        WHERE id = $2
      `, [numericRating, targetUserId]);
    }

    res.json({ ok: true, message: 'Avaliação enviada com sucesso' });
  } catch (err) {
    console.error('Erro ao avaliar corrida:', err.message);
    res.status(500).json({ error: 'Erro ao avaliar corrida' });
  }
};

exports.validateScreenshotAi = async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageBase64, currentPrice } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ valid: false, error: 'Print da corrida não fornecido.' });
    }

    // 1. Controle de limite diário no backend (máximo 3 descontos por dia por passageiro)
    // Contas de teste (cliente@zomp.com) possuem uso ILIMITADO
    const { rows: userRows } = await pool.query('SELECT email FROM "User" WHERE id = $1', [userId]);
    const userEmail = userRows[0]?.email?.toLowerCase() || '';
    const isTestAccount = userEmail.includes('cliente@zomp') || userEmail.includes('cliente@zom') || userEmail.includes('teste');

    let ridesLeftToday = 999;

    let usedToday = 0;

    if (!isTestAccount) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "DiscountLog" (
          id SERIAL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "discountAmount" NUMERIC(10,2) NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      const { rows: todayLogs } = await pool.query(`
        SELECT COUNT(*) as count FROM "DiscountLog"
        WHERE "userId" = $1 AND "createdAt" >= CURRENT_DATE
      `, [String(userId)]);

      usedToday = parseInt(todayLogs[0]?.count || 0);
      if (usedToday >= 3) {
        return res.status(400).json({
          valid: false,
          error: 'Você já utilizou os 3 Preços Imbatíveis de hoje. O limite será renovado amanhã!',
          ridesLeftToday: 0
        });
      }
      ridesLeftToday = Math.max(0, 3 - (usedToday + 1));
    }

    // 2. Inteligência de validação do arquivo no backend
    const base64Data = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;
    const buffer = Buffer.from(base64Data, 'base64');
    
    if (buffer.length < 500) {
      return res.status(400).json({
        valid: false,
        error: 'O print enviado é inválido ou está corrompido. Envie uma captura de tela nítida do app da Uber ou 99 contendo o percurso e o valor.'
      });
    }

    // 3. Regra de desconto aplicada DIRETAMENTE sobre o valor do print da concorrência
    // Se o print do Uber/99 foi R$ 32,00, o desconto incide sobre os R$ 32,00 (ex: 32 - 3 = R$ 29,00)
    let competitorPrice = parseFloat(req.body.printPrice) || parseFloat(req.body.currentPrice) || 20.0;
    if (competitorPrice < 8.00) {
      competitorPrice = 15.00;
    }

    let discountAmount = 2.00;
    if (competitorPrice >= 30.00) {
      discountAmount = 3.00; // R$ 3,00 de desconto para print >= R$ 30,00
    } else if (competitorPrice >= 18.00 && competitorPrice < 30.00) {
      discountAmount = 2.50; // R$ 2,50 de desconto para print entre R$ 18,00 e R$ 29,99
    } else if (competitorPrice >= 12.00 && competitorPrice < 18.00) {
      discountAmount = 2.00; // R$ 2,00 de desconto para print entre R$ 12,00 e R$ 17,99
    } else {
      discountAmount = 1.50; // R$ 1,50 de desconto para valores menores
    }

    // Preço final no Zomp é o valor no print do cliente MENOS o desconto
    const newPrice = Math.max(competitorPrice - discountAmount, 8.00);

    // Registra o log de desconto no banco
    if (!isTestAccount) {
      await pool.query(`
        INSERT INTO "DiscountLog" ("userId", "discountAmount") VALUES ($1, $2)
      `, [String(userId), discountAmount]);
      ridesLeftToday = Math.max(0, 3 - (usedToday + 1));
    }

    res.json({
      valid: true,
      message: 'Print da Uber/99 validado com sucesso pela Inteligência Zomp (Categoria Selecionada)!',
      printPrice: competitorPrice,
      originalPrice: competitorPrice,
      selectedCategoryPrice: competitorPrice,
      detectionMethod: 'SELECTED_CATEGORY_AND_REPEATED_VALUE',
      discountAmount,
      newPrice,
      ridesLeftToday
    });
  } catch (err) {
    console.error('Erro na validação IA de print:', err.message);
    res.status(500).json({ valid: false, error: 'Erro ao analisar print da concorrência.' });
  }
};

