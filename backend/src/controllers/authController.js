const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'zomp_2026_production_secret';

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, referrerQrCode } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const hash = await bcrypt.hash(password, 10);
    const qrCode = role === 'DRIVER' ? `ZOMP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}` : null;

    const { rows } = await pool.query(`
      INSERT INTO "User" (name, email, password, role, "qrCode", "isApproved")
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role, "qrCode", "isApproved"
    `, [name, email, hash, role.toUpperCase(), qrCode, role === 'PASSENGER']);

    const user = rows[0];

    // Vincular referral se tiver qrCode do motorista
    if (referrerQrCode && role === 'PASSENGER') {
      const { rows: driverRows } = await pool.query('SELECT id FROM "User" WHERE "qrCode" = $1', [referrerQrCode]);
      if (driverRows.length > 0) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 36);
        await pool.query(
          'INSERT INTO "Referral" ("referrerId", "referredId", "expiresAt") VALUES ($1, $2, $3)',
          [driverRows[0].id, user.id, expiresAt]
        );
      }
    }

    const authToken = jwt.sign({ id: user.id, role: user.role.toUpperCase() }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token: authToken, user: { id: user.id, name: user.name, role: user.role.toUpperCase(), email: user.email } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado!', details: 'Unique constraint failed on email' });
    }
    console.error('Erro no registro:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    const user = rows[0];

    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: user.id, role: user.role.toUpperCase() }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role.toUpperCase(),
        email: user.email,
        qrCode: user.qrCode,
        isApproved: user.isApproved,
        photo: user.photo
      }
    });
  } catch (err) {
    console.error('Erro no login:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { token: googleToken, role } = req.body;
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({ idToken: googleToken });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let { rows } = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    let user = rows[0];

    if (!user) {
      const qrCode = role === 'DRIVER' ? `ZOMP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}` : null;
      const result = await pool.query(`
        INSERT INTO "User" (name, email, password, role, photo, "qrCode", "isApproved")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [name, email, 'GOOGLE_AUTH', role || 'PASSENGER', picture, qrCode, (role || 'PASSENGER') === 'PASSENGER']);
      user = result.rows[0];
    }

    const authToken = jwt.sign({ id: user.id, role: user.role.toUpperCase() }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token: authToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role.toUpperCase(),
        email: user.email,
        qrCode: user.qrCode,
        isApproved: user.isApproved,
        photo: user.photo
      }
    });
  } catch (err) {
    console.error('Erro Google Auth:', err.message);
    res.status(500).json({ error: 'Erro na autenticação com Google' });
  }
};
