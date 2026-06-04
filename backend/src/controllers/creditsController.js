const { pool } = require('../config/db');

exports.getCredits = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT credits FROM "User" WHERE id = $1', [req.user.id]);
    const config = await pool.query('SELECT "pricePerCredit" FROM "AdminConfig" WHERE id = $1', ['singleton']);
    res.json({ credits: rows[0]?.credits || 0, pricePerCredit: config.rows[0]?.pricePerCredit || 1.50 });
  } catch (err) {
    console.error('Erro ao buscar créditos:', err.message);
    res.status(500).json({ error: 'Erro ao buscar créditos' });
  }
};

exports.purchaseCredits = async (req, res) => {
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
};
