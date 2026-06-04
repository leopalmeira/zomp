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
