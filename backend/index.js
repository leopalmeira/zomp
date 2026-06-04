const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query, initSchema } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'zomp_secret_prod_key';

app.use(cors());
app.use(express.json());

// Middleware de Autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Sessão expirada' });
    req.user = user;
    next();
  });
};

// Bootstrap do Sistema
async function bootstrap() {
  await initSchema();
  console.log('🚀 Zomp Backend v12.2.8 está pronto.');
}

// ROTA DE LOGIN REAL
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const { rows } = await query('SELECT * FROM "User" WHERE email = $1', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    // Retorno completo conforme v12.2.8
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        credits: user.credits,
        balance: user.balance,
        qrCode: user.qrCode
      }
    });

  } catch (err) {
    console.error('❌ Erro no login:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'UP', version: '12.2.8' }));

app.listen(PORT, () => {
  console.log(`📡 Servidor ativo na porta ${PORT}`);
  bootstrap();
});
