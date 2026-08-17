const { pool } = require('../config/db');

exports.getCredits = async (req, res) => {
  try {
    await pool.query('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "driverAppDebt" NUMERIC(10,2) DEFAULT 0');
    const { rows } = await pool.query('SELECT credits, "driverAppDebt" FROM "User" WHERE id = $1', [req.user.id]);
    const config = await pool.query('SELECT "pricePerCredit" FROM "AdminConfig" WHERE id = $1', ['singleton']);
    res.json({
      credits: rows[0]?.credits || 0,
      pricePerCredit: config.rows[0]?.pricePerCredit || 1.50,
      driverAppDebt: parseFloat(rows[0]?.driverAppDebt || 0)
    });
  } catch (err) {
    console.error('Erro ao buscar créditos:', err.message);
    res.status(500).json({ error: 'Erro ao buscar créditos' });
  }
};

exports.purchaseCredits = async (req, res) => {
  try {
    const { quantity } = req.body;
    const creditsToAdd = Number(quantity);

    if (!Number.isInteger(creditsToAdd) || creditsToAdd <= 0 || creditsToAdd > 500) {
      return res.status(400).json({ error: 'Quantidade de créditos inválida' });
    }

    await pool.query('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "driverAppDebt" NUMERIC(10,2) DEFAULT 0');
    const { rows } = await pool.query(
      'UPDATE "User" SET credits = credits + $1, "driverAppDebt" = 0 WHERE id = $2 RETURNING credits, "driverAppDebt"',
      [creditsToAdd, req.user.id]
    );
    res.json({
      credits: rows[0].credits,
      driverAppDebt: 0,
      message: 'Créditos comprados e débitos com o app quitados com sucesso!'
    });
  } catch (err) {
    console.error('Erro ao comprar créditos:', err.message);
    res.status(500).json({ error: 'Erro ao comprar créditos' });
  }
};
