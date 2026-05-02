require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { query } = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();

// CORS explícito: aceita qualquer origem (Render: frontend e backend em domínios diferentes)
const corsOptions = {
  origin: true, // Reflete a origem da requisição — aceita qualquer domínio
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
// Preflight para todas as rotas (gerenciado pelo cors() acima)

// Aumentado o limite vital para não recusar imagens via Base64 (Erro 413 Content Too Large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const JWT_SECRET = process.env.JWT_SECRET || 'zomp_super_secret_key_2026_change_in_production';

// Helper: Check and apply auto-suspension
async function checkDriverSuspension(driverId) {
  try {
    const { rows: driverRows } = await query('SELECT * FROM "User" WHERE id = $1', [driverId]);
    const driver = driverRows[0];
    const { rows: configRows } = await query('SELECT * FROM "AdminConfig" WHERE id = $1', ['singleton']);
    const config = configRows[0];
    
    if (!driver || !config) return;

    const totalRequests = (driver.ridesAccepted || 0) + (driver.ridesMissed || 0);
    const acceptanceRate = (driver.ridesAccepted / totalRequests) * 100 || 100;
    const rating = driver.rating || 5;

    let shouldSuspend = false;
    let reason = "";

    if (totalRequests >= 5) {
      if (acceptanceRate < (config.autoSuspendMinAcceptance || 70)) {
        shouldSuspend = true;
        reason = `Baixa taxa de aceitação (${acceptanceRate.toFixed(1)}%)`;
      }
    }

    if ((driver.totalRatings || 0) >= 3) {
      if (rating < (config.autoSuspendMinRating || 4.5)) {
        shouldSuspend = true;
        reason = `Avaliação insuficiente (${rating.toFixed(1)} estrelas)`;
      }
    }

    if (shouldSuspend && driver.isApproved) {
      await query('UPDATE "User" SET "isApproved" = false WHERE id = $1', [driverId]);
      console.log(`[AUTO-SUSPEND] Motorista ${driverId} suspenso. Motivo: ${reason}`);
    }
  } catch (e) {
    console.error("Erro ao verificar suspensão:", e);
  }
}

// --- AUTHENTICATION & USERS ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, referrerQrCode } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const qrCode = role === 'DRIVER' ? Math.random().toString(36).substring(2, 15) : null;
    const initialCredits = role === 'DRIVER' ? 10 : 0;
    const initialRole = role || 'PASSENGER';

    const { rows } = await query(
      'INSERT INTO "User" (name, email, password, role, "qrCode", credits, balance, rating, "totalRatings", "ridesAccepted", "ridesMissed", "ridesCompleted", "isApproved") VALUES ($1, $2, $3, $4, $5, $6, 0, 5, 0, 0, 0, 0, true) RETURNING id, email, role',
      [name, email, hashedPassword, initialRole, qrCode, initialCredits]
    );
    const user = rows[0];

    // Check for referral logic
    if (referrerQrCode && initialRole === 'PASSENGER') {
      const { rows: referrers } = await query('SELECT id FROM "User" WHERE "qrCode" = $1 AND role = $2', [referrerQrCode, 'DRIVER']);
      const referrer = referrers[0];
      if (referrer) {
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 2); // 2 anos conforme nova regra
        await query('INSERT INTO "Referral" ("referrerId", "referredId", "expiresAt") VALUES ($1, $2, $3)', [referrer.id, user.id, expiresAt]);
      }
    }

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error creating user', details: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await query('SELECT * FROM "User" WHERE email = $1', [email]);
    const user = rows[0];
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, qrCode: user.qrCode, balance: user.balance, credits: user.credits, cnh: user.cnh, crlv: user.crlv, carPlate: user.carPlate, carModel: user.carModel, carColor: user.carColor, isApproved: user.isApproved } });
  } catch (error) {
    res.status(500).json({ error: 'Internal error login' });
  }
});

// Middleware for auth
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// GET /api/config — Configurações globais para os Apps (Público/Auth)
app.get('/api/config', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM "AdminConfig" WHERE id = $1', ['singleton']);
    const config = rows[0];
    res.json(config || {
      pricePerKmCar: 2.0,
      pricePerKmMoto: 1.5,
      minFareCar: 8.4,
      minFareMoto: 7.2,
      royaltyPerRide: 0.3,
      pricePerCredit: 1.0,
      minKmPriceImbativel: 1.50,
      discountImbativel: 2.0
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/user/profile', authenticate, async (req, res) => {
  try {
    const { name, email, phone, cnh, crlv, photo, carPlate, carModel, carColor } = req.body;
    const { rows } = await query(
      'UPDATE "User" SET name = $1, email = $2, cnh = $3, crlv = $4, photo = $5, "carPlate" = $6, "carModel" = $7, "carColor" = $8 WHERE id = $9 RETURNING *',
      [name, email, cnh, crlv, photo, carPlate, carModel, carColor, req.user.id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

// --- RIDES & ROYALTIES ---

app.post('/api/rides/request', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'PASSENGER') return res.status(403).json({ error: 'Only passengers can request a ride' });

    const { origin, destination, price, distanceKm, vehicleType } = req.body;

    const { rows } = await query(
      'INSERT INTO "Ride" ("passengerId", origin, destination, price, "distanceKm", "vehicleType", status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.id, origin, destination, parseFloat(price), parseFloat(distanceKm), vehicleType, 'PENDING']
    );
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error requesting ride' });
  }
});

app.get('/api/rides', authenticate, async (req, res) => {
  try {
    const col = req.user.role === 'PASSENGER' ? 'passengerId' : 'driverId';
    const { rows } = await query(`SELECT * FROM "Ride" WHERE "${col}" = $1 ORDER BY "createdAt" DESC`, [req.user.id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching rides' });
  }
});

app.get('/api/user/income-report', authenticate, async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const { rows: rides } = await query(
      'SELECT * FROM "Ride" WHERE "driverId" = $1 AND status = $2 AND "createdAt" >= $3 AND "createdAt" <= $4',
      [req.user.id, 'COMPLETED', `${year}-01-01`, `${year}-12-31`]
    );

    const totalEarned = rides.reduce((sum, r) => sum + (parseFloat(r.price) || 0), 0);
    const { rows: userRows } = await query('SELECT name, balance FROM "User" WHERE id = $1', [req.user.id]);
    const user = userRows[0];

    res.json({
      year,
      driverName: user.name,
      totalEarnedFromRides: totalEarned,
      totalRoyaltiesEarned: user.balance,
      reportDate: new Date().toISOString(),
      message: "Este informe detalha seus rendimentos para fins de declaração à Receita Federal."
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/rides/:id/rate', authenticate, async (req, res) => {
  try {
    const { rating, targetRole } = req.body;
    const rideId = req.params.id;
    const { rows: rideRows } = await query('SELECT * FROM "Ride" WHERE id = $1', [rideId]);
    const ride = rideRows[0];

    if (!ride || ride.status !== 'COMPLETED') return res.status(400).json({ error: 'Apenas corridas concluídas podem ser avaliadas' });

    const targetId = targetRole === 'DRIVER' ? ride.driverId : ride.passengerId;
    const { rows: userRows } = await query('SELECT * FROM "User" WHERE id = $1', [targetId]);
    const user = userRows[0];

    const newTotalRatings = (user.totalRatings || 0) + 1;
    const newAverageRating = (((user.rating || 5) * (user.totalRatings || 0)) + rating) / newTotalRatings;

    await query('UPDATE "User" SET rating = $1, "totalRatings" = $2 WHERE id = $3', [newAverageRating, newTotalRatings, targetId]);

    const ratingCol = targetRole === 'DRIVER' ? 'driverRating' : 'passengerRating';
    await query(`UPDATE "Ride" SET "${ratingCol}" = $1 WHERE id = $2`, [rating, rideId]);

    checkDriverSuspension(ride.driverId);
    res.json({ message: 'Avaliação registrada com sucesso', newRating: newAverageRating });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/rides/pending', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DRIVER') return res.status(403).json({ error: 'Only drivers can view pending rides' });
    const { rows } = await query(
      'SELECT r.*, u.name as "passengerName" FROM "Ride" r JOIN "User" u ON r."passengerId" = u.id WHERE r.status = $1 ORDER BY r."createdAt" DESC',
      ['PENDING']
    );
    res.json(rows.map(r => ({ ...r, passenger: { name: r.passengerName } })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching pending rides' });
  }
});

app.post('/api/rides/:id/accept', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DRIVER') return res.status(403).json({ error: 'Only drivers can accept rides' });

    const { rows: driverRows } = await query('SELECT credits, "isApproved" FROM "User" WHERE id = $1', [req.user.id]);
    const driver = driverRows[0];
    if (driver.credits <= 0) return res.status(400).json({ error: 'Sem créditos! Compre um pacote para aceitar corridas.' });

    const { rows: rideRows } = await query('SELECT status FROM "Ride" WHERE id = $1', [req.params.id]);
    if (!rideRows[0] || rideRows[0].status !== 'PENDING') return res.status(400).json({ error: 'Ride is no longer available' });

    await query('UPDATE "User" SET credits = credits - 1, "ridesAccepted" = "ridesAccepted" + 1 WHERE id = $1', [req.user.id]);
    const { rows: updatedRide } = await query(
      'UPDATE "Ride" SET status = $1, "driverId" = $2 WHERE id = $3 RETURNING *',
      ['ACCEPTED', req.user.id, req.params.id]
    );

    checkDriverSuspension(req.user.id);
    res.json(updatedRide[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error accepting ride' });
  }
});

app.post('/api/rides/:id/complete', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DRIVER') return res.status(403).json({ error: 'Only drivers can complete a ride' });

    const rideId = req.params.id;
    const { rows: rideRows } = await query(
      'UPDATE "Ride" SET status = $1 WHERE id = $2 RETURNING *',
      ['COMPLETED', rideId]
    );
    const ride = rideRows[0];

    const { rows: refRows } = await query('SELECT * FROM "Referral" WHERE "referredId" = $1', [ride.passengerId]);
    const referral = refRows[0];
    const now = new Date();
    const isExpired = referral ? new Date(referral.expiresAt) < now : true;

    if (referral && !isExpired) {
      await query('UPDATE "User" SET balance = balance + 0.10 WHERE id = $1', [referral.referrerId]);
    } else {
      if (referral) await query('DELETE FROM "Referral" WHERE "referredId" = $1', [ride.passengerId]);
      
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 2);
      await query(
        'INSERT INTO "Referral" ("referrerId", "referredId", "expiresAt", "isRenewed") VALUES ($1, $2, $3, $4)',
        [req.user.id, ride.passengerId, expiresAt, !!referral]
      );
      await query('UPDATE "User" SET balance = balance + 0.10 WHERE id = $1', [req.user.id]);
    }

    await query('UPDATE "User" SET "ridesCompleted" = "ridesCompleted" + 1 WHERE id = $1', [req.user.id]);
    res.json({ message: 'Ride completed, royalties processed if applicable', ride });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error completing ride' });
  }
});

app.post('/api/rides/:id/reject', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DRIVER') return res.status(403).json({ error: 'Apenas motoristas podem recusar corridas' });
    await query('UPDATE "User" SET "ridesMissed" = "ridesMissed" + 1 WHERE id = $1', [req.user.id]);
    checkDriverSuspension(req.user.id);
    res.json({ message: 'Rejeição registrada' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/rides/:id/cancel', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await query('UPDATE "Ride" SET status = $1 WHERE id = $2 RETURNING *', [status || 'CANCELLED', req.params.id]);
    res.json({ message: 'Ride cancelled successfully', ride: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error cancelling ride' });
  }
});

// --- WALLET / ROYALTIES ---

app.get('/api/wallet', authenticate, async (req, res) => {
  try {
    const { rows } = await query('SELECT balance FROM "User" WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ balance: rows[0].balance });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching wallet' });
  }
});

app.post('/api/wallet/withdraw', authenticate, async (req, res) => {
  try {
    const { rows: userRows } = await query('SELECT balance FROM "User" WHERE id = $1', [req.user.id]);
    const user = userRows[0];
    if (user.balance < 1.0) return res.status(400).json({ error: 'Minimum withdrawal is R$ 1.00' });

    const { rows: withdrawRows } = await query(
      'INSERT INTO "Withdrawal" ("userId", amount, status) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, user.balance, 'PENDING']
    );
    await query('UPDATE "User" SET balance = 0 WHERE id = $1', [req.user.id]);
    res.json({ message: 'Withdrawal requested successfully', withdrawal: withdrawRows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error processing withdrawal' });
  }
});
// --- CREDITS ---

app.get('/api/credits', authenticate, async (req, res) => {
  try {
    const { rows } = await query('SELECT credits FROM "User" WHERE id = $1', [req.user.id]);
    res.json({ credits: rows[0]?.credits || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching credits' });
  }
});

app.post('/api/credits/purchase', authenticate, async (req, res) => {
  try {
    const { quantity } = req.body;
    const packages = { 10: 15.00, 22: 30.00, 35: 45.00 };
    if (!packages[quantity]) return res.status(400).json({ error: 'Pacote inválido.' });

    const totalPrice = packages[quantity];
    const { rows } = await query(
      'UPDATE "User" SET credits = credits + $1 WHERE id = $2 RETURNING credits',
      [quantity, req.user.id]
    );

    await query(
      'INSERT INTO "CreditTransaction" ("userId", amount, "pricePaid", status) VALUES ($1, $2, $3, $4)',
      [req.user.id, quantity, totalPrice, 'COMPLETED']
    );

    res.json({ message: `${quantity} créditos adicionados!`, credits: rows[0].credits, charged: totalPrice });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error purchasing credits' });
  }
});

// --- AI OCR (GEMINI VISION) ---
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Rodízio de chaves Gemini para evitar limites de cota gratuita
const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  'AIzaSyD2oe_LrRvjC2cq8k3lhtsQG_UTzV5gR6Q',
  'AIzaSyBScCwMr_u5J1qY_UY4Oh5NJWUVhaYb7tQ',
  'AIzaSyAxbSUXe7SBLuaOpoAR3HJUt4_-_Cgg7Hw',
  'AIzaSyBvltEPOCOyoAAlDeYQCUtojBdl1EgMkSk',
  'AIzaSyCrEMCgqejdb-1zYRJ_JjAnehjLylOgEDY'
].filter(Boolean);

app.post('/api/analyze-print', authenticate, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Nenhuma imagem fornecida' });

    console.log(`[OCR] Iniciando análise de imagem via Gemini Vision. Tamanho do Base64: ${imageBase64.length} chars`);

    const cleanImageBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // === MÉTODO PRINCIPAL: GEMINI VISION ===
    if (GEMINI_KEYS.length > 0) {
      for (let keyIndex = 0; keyIndex < GEMINI_KEYS.length; keyIndex++) {
        const currentKey = GEMINI_KEYS[keyIndex];
        try {
          const genAI = new GoogleGenerativeAI(currentKey);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

          const prompt = `Você é um especialista em OCR e análise de prints de aplicativos de mobilidade (Uber e 99).
Sua missão é extrair o preço da categoria MAIS ECONÔMICA (UberX ou 99Pop/Pop) deste print.

DIRETRIZES:
1. Identifique a PLATAFORMA (Uber ou 99).
2. Identifique a CATEGORIA vinculada ao preço (ex: UberX, Pop, 99Pop, X).
3. Extraia o VALOR exato (apenas o número). 

REGRAS CRÍTICAS:
- IGNORE categorias premium (UberBlack, Comfort, 99Top, 99Exec, Comfort, etc).
- Se houver múltiplos preços da mesma categoria, pegue o mais visível ou o primeiro.
- Se não houver UberX ou Pop, retorne price: 0.
- A saída DEVE ser exclusivamente um JSON puro.

FORMATO DE RESPOSTA (JSON APENAS):
{
  "platform": "Uber" | "99" | "Desconhecida",
  "category": "UberX" | "Pop" | "Nenhuma",
  "price": 0.00
}

Analise a imagem agora.`;

          const imagePart = {
            inlineData: { data: cleanImageBase64, mimeType: 'image/jpeg' }
          };

          const result = await model.generateContent([prompt, imagePart]);
          const response = await result.response;
          const aiText = response.text().trim();

          console.log(`[Gemini] Resposta bruta (Chave ${keyIndex + 1}):`, aiText);

          // Tenta extrair JSON se a IA mandou Markdown ou texto extra
          let parsed = null;
          try {
            const jsonMatch = aiText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const cleaned = jsonMatch[0].trim();
              parsed = JSON.parse(cleaned);
            }
          } catch (jsonErr) {
            console.warn(`[Gemini] Falha no parse JSON (Chave ${keyIndex + 1}):`, jsonErr.message);
            // Fallback regex final
            const priceMatch = aiText.match(/(\d+[.,]\d{2})/);
            if (priceMatch) {
              parsed = { platform: 'Desconhecida', category: 'Nenhuma', price: parseFloat(priceMatch[1].replace(',', '.')) };
            }
          }

          if (parsed && typeof parsed.price === 'number' && parsed.price >= 5 && parsed.price < 500) {
            const categoryLower = (parsed.category || '').toLowerCase();
            const validCategories = ['uberx', 'uber x', 'x', 'pop', '99pop'];
            const isValidCat = validCategories.some(c => categoryLower.includes(c));

            if (isValidCat) {
              console.log(`[Gemini] ✅ Identificado: R$ ${parsed.price} | ${parsed.platform} | ${parsed.category}`);
              return res.json({
                price: parsed.price,
                platform: parsed.platform || 'Desconhecida',
                category: parsed.category || 'Nenhuma',
                source: 'Gemini'
              });
            } else if (parsed.category && parsed.category !== 'Nenhuma' && parsed.price > 0) {
              // Encontrou preço mas categoria inválida (premium)
              console.warn(`[Gemini] Categoria inválida: ${parsed.category}`);
              return res.status(422).json({
                error: `A categoria "${parsed.category}" não é válida para o Preço Imbatível. Envie um print mostrando UberX ou 99Pop.`,
                category: parsed.category,
                price: 0
              });
            }
            // Se category === 'Nenhuma' com preço, aceita como fallback
            console.log(`[Gemini] ✅ Preço via fallback: R$ ${parsed.price}`);
            return res.json({
              price: parsed.price,
              platform: parsed.platform || 'Desconhecida',
              category: parsed.category || 'Nenhuma',
              source: 'Gemini'
            });
          }

          console.warn(`[Gemini] Preço não identificado ou inválido (chave ${keyIndex + 1}). Tentando próxima...`);

        } catch (geminiErr) {
          console.warn(`[Gemini] Erro na chave ${keyIndex + 1}:`, geminiErr.message);
        }
      }
    }

    // === FALLBACK: EASYOCR PYTHON (ambiente local) ===
    console.log('[OCR] Gemini não identificou. Tentando EasyOCR local...');
    const pythonScript = path.join(__dirname, 'ocr_service.py');

    if (fs.existsSync(pythonScript)) {
      const tempImageDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempImageDir)) fs.mkdirSync(tempImageDir);
      const tempImagePath = path.join(tempImageDir, `print_${Date.now()}.png`);
      fs.writeFileSync(tempImagePath, Buffer.from(cleanImageBase64, 'base64'));

      try {
        const easyPrice = await new Promise((resolve, reject) => {
          const cmd = process.platform === 'win32' ? 'python' : 'python3';
          exec(`${cmd} "${pythonScript}" "${tempImagePath}"`, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (fs.existsSync(tempImagePath)) try { fs.unlinkSync(tempImagePath); } catch(e){}
            if (error) return reject(new Error(stderr || error.message));
            try {
              const result = JSON.parse(stdout);
              resolve(result.price || 0);
            } catch (e) {
              reject(new Error('Falha ao parsear saída Python: ' + stdout));
            }
          });
        });

        if (easyPrice > 0) {
          console.log(`[OCR] EasyOCR identificou preço: R$ ${easyPrice}`);
          return res.json({ price: easyPrice, platform: 'Desconhecida', category: 'Nenhuma', source: 'EasyOCR' });
        }
      } catch (pyErr) {
        console.warn('[OCR] EasyOCR falhou:', pyErr.message);
      }
    }

    // Nenhum método funcionou
    return res.status(422).json({
      error: 'Não foi possível identificar preço de UberX ou 99Pop neste print. Tente uma imagem mais nítida com os valores visíveis.',
      price: 0
    });

  } catch (error) {
    console.error('[OCR] Erro interno:', error);
    res.status(500).json({
      error: 'Falha total na análise do print.',
      details: error.message,
      source: 'InternalError'
    });
  }
});

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =====================================================
// ADMIN ROUTES
// =====================================================

const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  next();
};

// GET /api/admin/stats — estatísticas gerais e financeiras detalhadas
app.get('/api/admin/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const [
      driversRes, 
      passengersRes, 
      ridesCountRes, 
      fundRes,
      ridesRes,
      withdrawalsRes,
      configRes,
      creditsRes
    ] = await Promise.all([
      query('SELECT COUNT(*) FROM "User" WHERE role = $1', ['DRIVER']),
      query('SELECT COUNT(*) FROM "User" WHERE role = $1', ['PASSENGER']),
      query('SELECT COUNT(*) FROM "Ride" WHERE status = $1', ['COMPLETED']),
      query('SELECT SUM(amount) FROM "RoyaltyFund"'),
      query('SELECT price, "createdAt" FROM "Ride" WHERE status = $1', ['COMPLETED']),
      query('SELECT SUM(amount) FROM "Withdrawal" WHERE status = $1', ['APPROVED']),
      query('SELECT * FROM "AdminConfig" WHERE id = $1', ['singleton']),
      query('SELECT "pricePaid", "createdAt", amount FROM "CreditTransaction" WHERE status = $1', ['COMPLETED'])
    ]);

    const totalDrivers = parseInt(driversRes.rows[0].count);
    const totalPassengers = parseInt(passengersRes.rows[0].count);
    const completedRidesCount = parseInt(ridesCountRes.rows[0].count);
    const config = configRes.rows[0];
    const royaltyPerRide = config?.royaltyPerRide || 0.3;
    
    const allCompletedRides = ridesRes.rows;
    const creditTransactions = creditsRes.rows;

    const totalRideRevenue = allCompletedRides.reduce((sum, r) => sum + (parseFloat(r.price) || 0), 0);
    const totalRoyaltiesExpenses = completedRidesCount * royaltyPerRide;
    const totalCreditRevenue = creditTransactions.reduce((sum, c) => sum + (parseFloat(c.pricePaid) || 0), 0);
    const totalRevenue = totalRideRevenue + totalCreditRevenue;
    const netProfit = totalRevenue - totalRoyaltiesExpenses;
    const grossMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
    const approvedWithdrawals = parseFloat(withdrawalsRes.rows[0].sum) || 0;
    const companyBalance = netProfit - approvedWithdrawals;

    res.json({
      totalDrivers, totalPassengers, completedRidesCount,
      royaltyFundBalance: parseFloat(fundRes.rows[0].sum) || 0,
      totalRevenue, totalRoyaltiesExpenses, netProfit, grossMargin, companyBalance,
      dailyStats: [], // Simplificado para o momento
      creditStats: { day: 0, week: 0, month: 0 }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/operations — monitoramento em tempo real
app.get('/api/admin/operations', authenticate, isAdmin, async (req, res) => {
  try {
    const recentRides = await prisma.ride.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        passenger: { select: { name: true } },
        driver: { select: { name: true } }
      }
    });

    const pendingCount = await prisma.ride.count({ where: { status: 'PENDING' } });
    const activeCount = await prisma.ride.count({ where: { status: 'ACCEPTED' } });

    res.json({
      recentRides,
      pendingCount,
      activeCount,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/drivers — lista motoristas com contagem de passageiros vinculados
app.get('/api/admin/drivers', authenticate, isAdmin, async (req, res) => {
  try {
    const drivers = await prisma.user.findMany({
      where: { role: 'DRIVER' },
      select: {
        id: true, name: true, email: true, balance: true, credits: true,
        isApproved: true, carPlate: true, carModel: true, carColor: true,
        carYear: true, pixKey: true,
        cnh: true, crlv: true, photo: true, createdAt: true,
        rating: true, totalRatings: true, ridesCompleted: true,
        ridesAccepted: true, ridesMissed: true,
        referralsMade: {
          where: { expiresAt: { gt: new Date() } },
          select: {
            id: true, createdAt: true, expiresAt: true, isRenewed: true,
            referred: { select: { id: true, name: true, email: true } }
          }
        },
        _count: { select: { ridesAsDriver: { where: { status: 'COMPLETED' } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const result = drivers.map(d => {
      const totalRidesOffered = d.ridesAccepted + d.ridesMissed;
      const acceptanceRate = totalRidesOffered > 0 ? (d.ridesAccepted / totalRidesOffered) * 100 : 100;
      
      return {
        ...d,
        linkedPassengers: d.referralsMade.length,
        completedRides: d._count.ridesAsDriver,
        passengers: d.referralsMade,
        acceptanceRate: acceptanceRate.toFixed(1)
      };
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/passengers — lista passageiros com vínculo atual
app.get('/api/admin/passengers', authenticate, isAdmin, async (req, res) => {
  try {
    const passengers = await prisma.user.findMany({
      where: { role: 'PASSENGER' },
      select: {
        id: true, name: true, email: true, createdAt: true,
        referredBy: {
          select: {
            id: true, createdAt: true, expiresAt: true, isRenewed: true,
            referrer: { select: { id: true, name: true, email: true } }
          }
        },
        _count: { select: { ridesAsPassenger: { where: { status: 'COMPLETED' } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const result = passengers.map(p => ({
      ...p,
      completedRides: p._count.ridesAsPassenger,
      bindingStatus: !p.referredBy ? 'free' : new Date(p.referredBy.expiresAt) < now ? 'expired' : 'active',
      linkedDriver: p.referredBy?.referrer || null,
      bindingExpiresAt: p.referredBy?.expiresAt || null,
      bindingType: p.referredBy?.isRenewed ? '24 meses (renovado)' : '36 meses (1º vínculo)',
    }));

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/admin/drivers/:id/approve — aprovar ou suspender motorista
app.put('/api/admin/drivers/:id/approve', authenticate, isAdmin, async (req, res) => {
  try {
    const { isApproved } = req.body;
    const driver = await prisma.user.update({
      where: { id: req.params.id },
      data: { isApproved: Boolean(isApproved) }
    });
    res.json({ message: `Motorista ${isApproved ? 'aprovado' : 'suspenso'}`, driver });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/link — vincular passageiro a motorista manualmente
app.post('/api/admin/link', authenticate, isAdmin, async (req, res) => {
  try {
    const { passengerId, driverId } = req.body;
    const config = await prisma.adminConfig.findUnique({ where: { id: 'singleton' } });

    // Checar limite de passageiros do motorista
    const count = await prisma.referral.count({
      where: { referrerId: driverId, expiresAt: { gt: new Date() } }
    });
    if (count >= (config?.maxPassengersPerDriver || 700)) {
      return res.status(400).json({ error: `Este motorista já atingiu o limite de ${config.maxPassengersPerDriver} passageiros.` });
    }

    // Remover vínculo anterior se existir
    await prisma.referral.deleteMany({ where: { referredId: passengerId } });

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (config?.bindingMonthsFirst || 36));

    const referral = await prisma.referral.create({
      data: { referrerId: driverId, referredId: passengerId, expiresAt, isRenewed: false }
    });
    res.json({ message: 'Passageiro vinculado com sucesso', referral });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/admin/link/:passengerId — desvincular passageiro
app.delete('/api/admin/link/:passengerId', authenticate, isAdmin, async (req, res) => {
  try {
    await prisma.referral.deleteMany({ where: { referredId: req.params.passengerId } });
    res.json({ message: 'Vínculo removido com sucesso' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/config — ler configurações
app.get('/api/admin/config', authenticate, isAdmin, async (req, res) => {
  try {
    let config = await prisma.adminConfig.findUnique({ where: { id: 'singleton' } });
    if (!config) {
      config = await prisma.adminConfig.create({
        data: { id: 'singleton', updatedAt: new Date() }
      });
    }
    res.json(config);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/admin/config — atualizar configurações de preço e royalties
app.put('/api/admin/config', authenticate, isAdmin, async (req, res) => {
  try {
    const { 
      pricePerKmCar, pricePerKmMoto, minFareCar, minFareMoto, 
      royaltyPerRide, royaltyMonthlyLimit, maxPassengersPerDriver,
      bindingMonthsFirst, bindingMonthsRenew,
      minKmPriceImbativel, discountImbativel,
      autoSuspendMinRating, autoSuspendMinAcceptance
    } = req.body;

    const config = await prisma.adminConfig.upsert({
      where: { id: 'singleton' },
      update: { 
        pricePerKmCar: parseFloat(pricePerKmCar), 
        pricePerKmMoto: parseFloat(pricePerKmMoto),
        minFareCar: parseFloat(minFareCar),
        minFareMoto: parseFloat(minFareMoto),
        royaltyPerRide: parseFloat(royaltyPerRide),
        royaltyMonthlyLimit: parseInt(royaltyMonthlyLimit),
        maxPassengersPerDriver: parseInt(maxPassengersPerDriver),
        bindingMonthsFirst: parseInt(bindingMonthsFirst),
        bindingMonthsRenew: parseInt(bindingMonthsRenew),
        minKmPriceImbativel: parseFloat(minKmPriceImbativel),
        discountImbativel: parseFloat(discountImbativel),
        autoSuspendMinRating: parseFloat(autoSuspendMinRating),
        autoSuspendMinAcceptance: parseFloat(autoSuspendMinAcceptance)
      },
      create: { 
        id: 'singleton',
        pricePerKmCar: parseFloat(pricePerKmCar), 
        pricePerKmMoto: parseFloat(pricePerKmMoto),
        minFareCar: parseFloat(minFareCar),
        minFareMoto: parseFloat(minFareMoto),
        royaltyPerRide: parseFloat(royaltyPerRide),
        royaltyMonthlyLimit: parseInt(royaltyMonthlyLimit),
        maxPassengersPerDriver: parseInt(maxPassengersPerDriver),
        bindingMonthsFirst: parseInt(bindingMonthsFirst),
        bindingMonthsRenew: parseInt(bindingMonthsRenew),
        minKmPriceImbativel: parseFloat(minKmPriceImbativel),
        discountImbativel: parseFloat(discountImbativel),
        autoSuspendMinRating: parseFloat(autoSuspendMinRating),
        autoSuspendMinAcceptance: parseFloat(autoSuspendMinAcceptance)
      }
    });
    res.json({ message: 'Configurações atualizadas com sucesso', config });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/royalty-fund — saldo e histórico do fundo
app.get('/api/admin/royalty-fund', authenticate, isAdmin, async (req, res) => {
  try {
    const [entries, total] = await Promise.all([
      prisma.royaltyFund.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.royaltyFund.aggregate({ _sum: { amount: true } })
    ]);
    res.json({ total: total._sum.amount || 0, entries });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/withdrawals — listar saques pendentes
app.get('/api/admin/withdrawals', authenticate, isAdmin, async (req, res) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { name: true, email: true, carPlate: true } } },
      orderBy: { requestedAt: 'desc' }
    });
    res.json(withdrawals);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/admin/withdrawals/:id — aprovar ou rejeitar saque
app.put('/api/admin/withdrawals/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { status } = req.body; // APPROVED | REJECTED
    const withdrawal = await prisma.withdrawal.update({
      where: { id: req.params.id },
      data: { status, processedAt: new Date() }
    });

    // Se rejeitado, devolve saldo ao motorista
    if (status === 'REJECTED') {
      await prisma.user.update({
        where: { id: withdrawal.userId },
        data: { balance: { increment: withdrawal.amount } }
      });
    }
    res.json({ message: `Saque ${status === 'APPROVED' ? 'aprovado' : 'rejeitado'}`, withdrawal });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Atualização do complete ride para usar config dinâmica e regras corretas
app.post('/api/rides/:id/complete-v2', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DRIVER') return res.status(403).json({ error: 'Apenas motoristas podem completar corridas' });

    const config = await prisma.adminConfig.findUnique({ where: { id: 'singleton' } }) || {
      royaltyPerRide: 0.30, royaltyMonthlyLimit: 8, maxPassengersPerDriver: 700,
      bindingMonthsFirst: 60, bindingMonthsRenew: 24
    };

    const rideId = req.params.id;
    const ride = await prisma.ride.update({
      where: { id: rideId },
      data: { status: 'COMPLETED' },
      include: { passenger: { include: { referredBy: true } } }
    });

    const referral = ride.passenger.referredBy;
    const now = new Date();
    const isExpired = referral ? new Date(referral.expiresAt) < now : true;

    // Contar corridas concluídas do passageiro no mês atual
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRides = await prisma.ride.count({
      where: {
        passengerId: ride.passengerId,
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth }
      }
    });

    const overLimit = monthlyRides > config.royaltyMonthlyLimit;

    if (referral && !isExpired) {
      // Vínculo ativo — verificar limite mensal
      if (overLimit) {
        // Royalty vai para o fundo
        await prisma.royaltyFund.create({
          data: { amount: config.royaltyPerRide, reason: 'passenger_over_monthly_limit', fromRideId: rideId }
        });
        await prisma.ride.update({ where: { id: rideId }, data: { royaltySentToFund: true } });
      } else {
        // Royalty normal ao motorista vinculado
        await prisma.user.update({
          where: { id: referral.referrerId },
          data: { balance: { increment: config.royaltyPerRide } }
        });
      }
    } else {
      // Sem vínculo ou expirado → verificar limite do motorista
      if (referral) await prisma.referral.delete({ where: { referredId: ride.passengerId } });

      const driverPassengerCount = await prisma.referral.count({
        where: { referrerId: req.user.id, expiresAt: { gt: now } }
      });

      if (driverPassengerCount < config.maxPassengersPerDriver) {
        const months = referral ? config.bindingMonthsRenew : config.bindingMonthsFirst;
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + months);
        await prisma.referral.create({
          data: { referrerId: req.user.id, referredId: ride.passengerId, expiresAt, isRenewed: !!referral }
        });
        await prisma.user.update({
          where: { id: req.user.id },
          data: { balance: { increment: config.royaltyPerRide } }
        });
      }
    }

    res.json({ message: 'Corrida concluída e royalties processados', ride, monthlyRides, overLimit });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/user/income-report — Gerar informe de rendimentos (HTML/Print ou JSON)
app.get('/api/user/income-report', authenticate, async (req, res) => {
  try {
    const { year, driverId, format } = req.query;
    const targetId = req.user.role === 'ADMIN' ? driverId : req.user.id;
    
    if (!targetId) return res.status(400).json({ error: 'ID do motorista é obrigatório' });

    const driver = await prisma.user.findUnique({ where: { id: targetId } });
    if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });

    // Simulação de cálculos (em um sistema real buscaríamos no histórico financeiro/rides)
    const totalGains = driver.completedRides * 12.50; // Média estimada
    const totalRoyalties = driver.balance; // Saldo atual como exemplo de rendimento
    const totalEarnings = totalGains + totalRoyalties;

    const reportData = {
      year: year || new Date().getFullYear(),
      driverName: driver.name,
      cpf: '***.***.***-**',
      totalGains: totalGains.toFixed(2),
      totalRoyalties: totalRoyalties.toFixed(2),
      totalEarnings: totalEarnings.toFixed(2),
      origin: 'ZOMP TECNOLOGIA LTDA',
      cnpj: '00.000.000/0001-00'
    };

    if (format === 'html' || req.user.role === 'ADMIN') {
      res.send(`
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
          <meta charset="UTF-8">
          <title>Informe de Rendimentos Zomp - ${reportData.year}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .report-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; }
            .header { text-align: center; border-bottom: 2px solid #00E676; padding-bottom: 20px; margin-bottom: 30px; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; background: #f4f4f5; padding: 8px; margin-bottom: 15px; border-radius: 4px; }
            .data-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #eee; padding: 8px 0; }
            .footer { margin-top: 50px; font-size: 0.8rem; color: #777; text-align: center; }
            .print-btn { background: #00E676; color: #000; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 20px; }
            @media print { .print-btn { display: none; } }
          </style>
        </head>
        <body>
          <div style="text-align: right;"><button class="print-btn" onclick="window.print()">🖨️ Imprimir Documento</button></div>
          <div class="report-container">
            <div class="header">
              <img src="https://zomp.app/logo.svg" alt="Zomp" style="height: 40px; margin-bottom: 10px;">
              <h1>Informe de Rendimentos Financeiros</h1>
              <p>Ano-calendário de ${reportData.year}</p>
            </div>

            <div class="section">
              <div class="section-title">1. FONTE PAGADORA</div>
              <div class="data-row"><span>Nome Empresarial:</span> <strong>${reportData.origin}</strong></div>
              <div class="data-row"><span>CNPJ:</span> <strong>${reportData.cnpj}</strong></div>
            </div>

            <div class="section">
              <div class="section-title">2. PESSOA FÍSICA BENEFICIÁRIA DOS RENDIMENTOS</div>
              <div class="data-row"><span>Nome Completo:</span> <strong>${reportData.driverName}</strong></div>
              <div class="data-row"><span>CPF:</span> <strong>${reportData.cpf}</strong></div>
            </div>

            <div class="section">
              <div class="section-title">3. RENDIMENTOS TRIBUTÁVEIS, DEDUÇÕES E IMPOSTO RETIDO NA FONTE</div>
              <div class="data-row"><span>Total de Ganhos em Corridas:</span> <strong>R$ ${reportData.totalGains}</strong></div>
              <div class="data-row"><span>Rendimentos de Royalties (Rede):</span> <strong>R$ ${reportData.totalRoyalties}</strong></div>
              <div class="data-row" style="border-top: 2px solid #333; margin-top: 10px; font-size: 1.1rem;"><span>Soma Total de Rendimentos:</span> <strong>R$ ${reportData.totalEarnings}</strong></div>
            </div>

            <div class="section">
              <div class="section-title">4. INFORMAÇÕES COMPLEMENTARES</div>
              <p>Este documento é uma consolidação de todos os valores repassados ao parceiro via plataforma Zomp durante o exercício de ${reportData.year}. Os valores de royalties referem-se a comissões sobre a rede de passageiros vinculados conforme termos de uso.</p>
            </div>

            <div class="footer">
              <p>Gerado automaticamente pelo sistema Zomp Admin em ${new Date().toLocaleDateString('pt-BR')}</p>
              <p>Zomp Tecnologia - Todos os direitos reservados</p>
            </div>
          </div>
        </body>
        </html>
      `);
    } else {
      res.json(reportData);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`Backend server running on http://0.0.0.0:${PORT}`));
