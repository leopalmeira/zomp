const { pool } = require('../config/db');

exports.getWallet = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT balance, credits FROM "User" WHERE id = $1', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar carteira:', err.message);
    res.status(500).json({ error: 'Erro ao buscar carteira' });
  }
};

exports.withdraw = async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Withdrawal" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID REFERENCES "User"(id),
        "amount" DECIMAL NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    const { rows } = await pool.query('SELECT balance, "pixKey" FROM "User" WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (!user.pixKey) return res.status(400).json({ error: 'Chave PIX não cadastrada' });
    const amount = parseFloat(user.balance || 0);
    if (amount <= 0) return res.status(400).json({ error: 'Saldo insuficiente' });

    await pool.query('UPDATE "User" SET balance = 0 WHERE id = $1', [req.user.id]);
    await pool.query('INSERT INTO "Withdrawal" ("userId", amount, status) VALUES ($1, $2, \'PENDING\')', [req.user.id, amount]);

    res.json({ message: `Saque de R$ ${amount.toFixed(2)} solicitado com sucesso para a chave PIX: ${user.pixKey}` });
  } catch (err) {
    console.error('Erro ao solicitar saque:', err.message);
    res.status(500).json({ error: 'Erro ao solicitar saque' });
  }
};
