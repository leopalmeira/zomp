require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'zomp_super_secret_key_2026_change_in_production';

// --- AUTHENTICATION & USERS ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, referrerQrCode } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create base user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'PASSENGER',
        qrCode: role === 'DRIVER' ? Math.random().toString(36).substring(2, 15) : null,
        credits: role === 'DRIVER' ? 10 : 0  // Motoristas ganham 10 créditos grátis
      }
    });

    // Check for referral logic
    if (referrerQrCode && role === 'PASSENGER') {
      const referrer = await prisma.user.findFirst({
        where: { qrCode: referrerQrCode, role: 'DRIVER' }
      });
      if (referrer) {
        // Link Passenger to Driver permanently
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 5); // 5 anos
        await prisma.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: user.id,
            expiresAt
          }
        });
      }
    }

    res.status(201).json({ message: 'User created successfully', user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error creating user', details: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
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

app.put('/api/user/profile', authenticate, async (req, res) => {
  try {
    const { name, email, phone, cnh, crlv, photo, carPlate, carModel, carColor } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name,
        email,
        cnh,
        crlv,
        photo,
        carPlate,
        carModel,
        carColor
      }
    });
    res.json(updatedUser);
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

    const ride = await prisma.ride.create({
      data: {
        passengerId: req.user.id,
        origin,
        destination,
        price: parseFloat(price),
        distanceKm: parseFloat(distanceKm),
        vehicleType,
        status: 'PENDING'
      }
    });
    res.json(ride);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error requesting ride' });
  }
});

app.get('/api/rides', authenticate, async (req, res) => {
  try {
    // If passenger, return their rides. If driver, return rides they drove
    const whereClause = req.user.role === 'PASSENGER' 
      ? { passengerId: req.user.id } 
      : { driverId: req.user.id };

    const rides = await prisma.ride.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
    res.json(rides);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching rides' });
  }
});

app.get('/api/rides/pending', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DRIVER') return res.status(403).json({ error: 'Only drivers can view pending rides' });
    
    // Fetch pending rides that haven't been picked up
    const pendingRides = await prisma.ride.findMany({
      where: { status: 'PENDING' },
      include: { passenger: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(pendingRides);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching pending rides' });
  }
});

app.post('/api/rides/:id/accept', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DRIVER') return res.status(403).json({ error: 'Only drivers can accept rides' });

    // Check credits
    const driver = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (driver.credits <= 0) {
      return res.status(400).json({ error: 'Sem créditos! Compre um pacote para aceitar corridas.' });
    }

    // Ensure the ride is still pending
    const existing = await prisma.ride.findUnique({ where: { id: req.params.id }});
    if(!existing || existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Ride is no longer available' });
    }

    // Deduct 1 credit
    await prisma.user.update({
      where: { id: req.user.id },
      data: { credits: { decrement: 1 } }
    });

    const ride = await prisma.ride.update({
      where: { id: req.params.id },
      data: { status: 'ACCEPTED', driverId: req.user.id },
      include: { passenger: { select: { name: true } } }
    });
    res.json(ride);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error accepting ride' });
  }
});

app.post('/api/rides/:id/complete', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'DRIVER') return res.status(403).json({ error: 'Only drivers can complete a ride' });

    const rideId = req.params.id;
    const ride = await prisma.ride.update({
      where: { id: rideId },
      data: { status: 'COMPLETED' },
      include: { passenger: { include: { referredBy: true } } }
    });

    // Check if the passenger was referred by someone and if it's still valid
    const referral = ride.passenger.referredBy;
    const now = new Date();
    const isExpired = referral ? new Date(referral.expiresAt) < now : true;

    if (referral && !isExpired) {
      // Add R$ 0.10 to the referrer's balance
      await prisma.user.update({
        where: { id: referral.referrerId },
        data: { balance: { increment: 0.10 } }
      });
    } else {
      if (referral) {
        // Exclui vínculo expirado para dar lugar ao novo motorista
        await prisma.referral.delete({ where: { referredId: ride.passengerId } });
      }

      // Passenger has no valid referrer. Auto-bind to this driver!
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 3); // Voltou a se vincular, agora por 3 anos

      await prisma.referral.create({
        data: {
          referrerId: req.user.id,
          referredId: ride.passengerId,
          expiresAt,
          isRenewed: !!referral
        }
      });
      // Add the first R$ 0.10 to this driver
      await prisma.user.update({
        where: { id: req.user.id },
        data: { balance: { increment: 0.10 } }
      });
    }

    res.json({ message: 'Ride completed, royalties processed if applicable', ride });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error completing ride' });
  }
});

app.put('/api/rides/:id/cancel', authenticate, async (req, res) => {
  try {
    const { status } = req.body; // CANCELED_FREE or CANCELED_FEE
    const ride = await prisma.ride.update({
      where: { id: req.params.id },
      data: { status: status || 'CANCELLED' }
    });
    res.json({ message: 'Ride cancelled successfully', ride });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error cancelling ride' });
  }
});

// --- WALLET / ROYALTIES ---

app.get('/api/wallet', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ balance: user.balance });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching wallet' });
  }
});

app.post('/api/wallet/withdraw', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user.balance < 1.0) {
       return res.status(400).json({ error: 'Minimum withdrawal is R$ 1.00' });
    }

    // Process Withdrawal Request
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: user.id,
        amount: user.balance,
        status: 'PENDING'
      }
    });

    // Reset Balance
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: 0 }
    });

    res.json({ message: 'Withdrawal requested successfully', withdrawal });
  } catch (error) {
    res.status(500).json({ error: 'Error processing withdrawal' });
  }
});
// --- CREDITS ---

app.get('/api/credits', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json({ credits: user.credits });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching credits' });
  }
});

app.post('/api/credits/purchase', authenticate, async (req, res) => {
  try {
    const { quantity } = req.body; // 10, 22 or 35
    const packages = {
      10: 15.00,  // R$ 1,50 un
      22: 30.00,  // R$ 1,36 un
      35: 45.00   // R$ 1,28 un
    };

    if (!packages[quantity]) {
      return res.status(400).json({ error: 'Pacote inválido. Escolha 10, 22 ou 35 créditos.' });
    }

    const totalPrice = packages[quantity];

    // Add credits to user
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { credits: { increment: quantity } }
    });

    res.json({
      message: `${quantity} créditos adicionados com sucesso!`,
      credits: user.credits,
      charged: totalPrice
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error purchasing credits' });
  }
});

// --- AI OCR (GEMINI VISION) ---
const { GoogleGenAI } = require('@google/genai');

// Arcenal de chaves para rodízio e evitar limites da cota gratuita
const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY, // Default from render (fallback)
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

    // Sorteia aleatoriamente uma das chaves disponíveis para balancear a carga
    const randomKey = GEMINI_KEYS[Math.floor(Math.random() * GEMINI_KEYS.length)];
    const ai = new GoogleGenAI({ apiKey: randomKey });
    
    // Remove the data:image prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            {
               role: 'user',
               parts: [
                  { text: 'Look at this rideshare app screenshot (like Uber or 99). Analyze the screen and find the selected ride option. Return ONLY the numeric value of the selected ride price in Brazilian Reais (e.g., 48.90). Do not include currency symbols, just the number. If no rideshare price is found, return 0.' },
                  { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' }}
               ]
            }
        ]
    });
    
    let aiText = response.text().trim();
    // Guarantee it parses correctly (e.g if it responds "48.90")
    aiText = aiText.replace(',', '.'); // replace any stray commas
    const finalPrice = parseFloat(aiText) || 0;
    
    res.json({ price: finalPrice });

  } catch (error) {
    console.error('Gemini OCR Error:', error);
    res.status(500).json({ error: 'Falha ao analisar IA' });
  }
});

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`Backend server running on http://0.0.0.0:${PORT}`));
