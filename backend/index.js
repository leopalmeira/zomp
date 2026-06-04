const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query, initSchema } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'zomp_secret_key_2026';

app.use(cors());
app.use(express.json());

// Middleware de Autenticação Refatorado
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido ou expirado' });
    req.user = user;
    next();
  });
};

// Inicialização de Admin e Configurações (Refatoração Sênior)
async function bootstrap() {
  try {
    await initSchema();

    const adminEmail = 'leandro2703palmeira@gmail.com';
    const adminPass = 'Lps27031981@';
    const hashedPassword = await bcrypt.hash(adminPass, 10);

    // Garante Admin com Role Padronizada (UPPERCASE)
    const { rows } = await query('SELECT id FROM "User" WHERE email = $1', [adminEmail]);
    
    if (rows.length === 0) {
      await query(
        'INSERT INTO "User" (name, email, password, role, "isApproved") VALUES ($1, $2, $3, $4, $5)',
        ['Leandro Palmeira', adminEmail, hashedPassword, 'ADMIN', true]
      );
      console.log('🚀 [Bootstrap] Admin Master criado com sucesso');
    } else {
      await query('UPDATE "User" SET password = $1, role = $2 WHERE email = $3', [hashedPassword, 'ADMIN', adminEmail]);
      console.log('🚀 [Bootstrap] Admin Master sincronizado');
    }

    // Garante Configurações Globais
    const config = await query('SELECT id FROM "AdminConfig" LIMIT 1');
    if (config.rows.length === 0) {
      await query('INSERT INTO "AdminConfig" (id) VALUES ($1)', ['default']);
      console.log('🚀 [Bootstrap] Configurações globais inicializadas');
    }

  } catch (err) {
    console.error('❌ [Bootstrap] Erro crítico:', err.message);
  }
}

// ROTA DE LOGIN REFATORADA
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const { rows } = await query('SELECT * FROM "User" WHERE email = $1', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    // Token com Role Padronizada
    const token = jwt.sign(
      { id: user.id, role: user.role.toUpperCase() }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    console.log(`✅ [Auth] Login realizado: ${user.email} (${user.role})`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.toUpperCase(),
        isApproved: user.isApproved
      }
    });

  } catch (error) {
    console.error('❌ [Auth] Erro no login:', error.message);
    res.status(500).json({ error: 'Erro interno no servidor de autenticação' });
  }
});

// Outras rotas (simplificadas para o exemplo de refatoração)
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Rota Admin Protegida (Exemplo)
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
  // ... lógica de stats
  res.json({ totalUsers: 100 }); // Exemplo
});

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║  ZOMP API - SISTEMA ONLINE             ║
  ║  Porta: ${PORT}                           ║
  ║  Ambiente: Produção                    ║
  ╚════════════════════════════════════════╝
  `);
  bootstrap();
});
