const { pool } = require('../config/db');

exports.updateProfile = async (req, res) => {
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
};

exports.getLinkedPassengers = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT COUNT(*) as count FROM "Referral" WHERE "referrerId" = $1',
      [req.user.id]
    );
    res.json({ linkedPassengers: parseInt(rows[0].count) || 0 });
  } catch (err) {
    console.error('Erro ao buscar passageiros vinculados:', err.message);
    res.json({ linkedPassengers: 0 });
  }
};

exports.linkReferral = async (req, res) => {
  try {
    const { referrerQrCode } = req.body;
    if (!referrerQrCode) return res.status(400).json({ error: 'Código de indicação não fornecido' });

    const { rows: drivers } = await pool.query(
      'SELECT id FROM "User" WHERE ("qrCode" = $1 OR id::text = $1) AND role = \'DRIVER\'',
      [referrerQrCode.trim()]
    );

    if (drivers.length === 0) {
      return res.status(404).json({ error: 'Motorista indicador não encontrado' });
    }

    const driverId = drivers[0].id;
    const passengerId = req.user.id;

    if (driverId === passengerId) {
      return res.status(400).json({ error: 'Não é possível auto-indicação' });
    }

    const { rows: existing } = await pool.query(
      'SELECT * FROM "Referral" WHERE "referredId" = $1 AND "expiresAt" > NOW()',
      [passengerId]
    );

    if (existing.length === 0) {
      const { rows: cfgRows } = await pool.query('SELECT "bindingMonthsFirst" FROM "AdminConfig" WHERE id = $1', ['singleton']);
      const months = (cfgRows.length > 0 && cfgRows[0].bindingMonthsFirst) ? parseInt(cfgRows[0].bindingMonthsFirst) : 12;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);
      await pool.query(
        'INSERT INTO "Referral" ("referrerId", "referredId", "expiresAt") VALUES ($1, $2, $3)',
        [driverId, passengerId, expiresAt]
      );
      const anos = Math.round(months / 12);
      return res.json({ ok: true, message: `Passageiro vinculado ao motorista parceiro com sucesso por ${anos || 1} ano(s)!` });
    }

    res.json({ ok: true, message: 'Passageiro já possui vínculo de indicação ativo' });
  } catch (err) {
    console.error('Erro ao vincular referral:', err.message);
    res.status(500).json({ error: 'Erro ao vincular indicação' });
  }
};

exports.getUserDebt = async (req, res) => {
  try {
    await pool.query('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingDebt" NUMERIC(10,2) DEFAULT 0');
    const { rows } = await pool.query('SELECT "pendingDebt" FROM "User" WHERE id = $1', [req.user.id]);
    res.json({ pendingDebt: parseFloat(rows[0]?.pendingDebt || 0) });
  } catch (err) {
    console.error('Erro ao buscar débito pendente:', err.message);
    res.json({ pendingDebt: 0 });
  }
};

