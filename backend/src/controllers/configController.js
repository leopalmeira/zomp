const { pool } = require('../config/db');

exports.getConfig = async (req, res) => {
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
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
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
