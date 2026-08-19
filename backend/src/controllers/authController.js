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
        photo: user.photo,
        cnh: user.cnh,
        crlv: user.crlv,
        carPlate: user.carPlate,
        carModel: user.carModel,
        carColor: user.carColor,
        rating: user.rating,
        ridesCompleted: user.ridesCompleted,
        ridesAccepted: user.ridesAccepted,
        ridesMissed: user.ridesMissed
      }
    });
  } catch (err) {
    console.error('Erro no login:', err.message);
    res.status(500).json({ error: `Erro interno: ${err.message}` });
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

// ── PRÉ-CADASTRO COMPLETO DO MOTORISTA (LANDING PAGE & ONBOARDING) ──
exports.driverPreRegister = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      pixKey,
      vehicleType = 'car',
      carModel,
      carPlate,
      carColor,
      photo,
      cnh,
      crlv
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const qrCode = `ZOMP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Verificar se já existe
    const { rows: existingRows } = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    let user;

    if (existingRows.length > 0) {
      const existing = existingRows[0];
      if (existing.role === 'DRIVER' && !existing.isApproved) {
        // Atualizar os dados do pré-cadastro pendente
        const { rows: updatedRows } = await pool.query(`
          UPDATE "User" SET
            name = COALESCE($2, name),
            password = $3,
            phone = COALESCE($4, phone),
            "pixKey" = COALESCE($5, "pixKey"),
            "vehicleType" = COALESCE($6, "vehicleType"),
            "carModel" = COALESCE($7, "carModel"),
            "carPlate" = COALESCE($8, "carPlate"),
            "carColor" = COALESCE($9, "carColor"),
            photo = COALESCE($10, photo),
            cnh = COALESCE($11, cnh),
            crlv = COALESCE($12, crlv),
            "updatedAt" = NOW()
          WHERE id = $1
          RETURNING id, name, email, role, phone, "pixKey", "vehicleType", "carModel", "carPlate", "carColor", photo, cnh, crlv, "isApproved", "qrCode", "createdAt"
        `, [
          existing.id,
          name,
          hash,
          phone || null,
          pixKey || null,
          vehicleType || 'car',
          carModel || null,
          carPlate ? carPlate.toUpperCase() : null,
          carColor || null,
          photo || null,
          cnh || null,
          crlv || null
        ]);
        user = updatedRows[0];
      } else {
        return res.status(409).json({ error: 'Este e-mail já está cadastrado no sistema! Faça login com suas credenciais.' });
      }
    } else {
      // Inserir novo motorista com isApproved = false (Aguardando Aprovação do Admin)
      const { rows } = await pool.query(`
        INSERT INTO "User" (
          name, email, password, role, phone, "pixKey", "vehicleType",
          "carModel", "carPlate", "carColor", photo, cnh, crlv,
          "qrCode", "isApproved", credits, balance, rating
        )
        VALUES ($1, $2, $3, 'DRIVER', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false, 0, 0, 5.0)
        RETURNING id, name, email, role, phone, "pixKey", "vehicleType", "carModel", "carPlate", "carColor", photo, cnh, crlv, "isApproved", "qrCode", "createdAt"
      `, [
        name,
        email,
        hash,
        phone || null,
        pixKey || null,
        vehicleType || 'car',
        carModel || null,
        carPlate ? carPlate.toUpperCase() : null,
        carColor || null,
        photo || null,
        cnh || null,
        crlv || null,
        qrCode
      ]);
      user = rows[0];
    }

    const authToken = jwt.sign({ id: user.id, role: 'DRIVER' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Pré-cadastro realizado com sucesso! Seus dados foram enviados para o Painel de Controle e estão aguardando validação para a grande estreia do app.',
      token: authToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'DRIVER',
        phone: user.phone,
        pixKey: user.pixKey,
        vehicleType: user.vehicleType,
        carModel: user.carModel,
        carPlate: user.carPlate,
        carColor: user.carColor,
        isApproved: false,
        qrCode: user.qrCode
      }
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Este e-mail ou placa já está cadastrado!' });
    }
    console.error('Erro no pré-cadastro de motorista:', err.message);
    res.status(500).json({ error: 'Erro interno ao processar pré-cadastro.' });
  }
};
