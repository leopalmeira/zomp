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
        await prisma.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: user.id
          }
        });
      }
    }

    res.status(201).json({ message: 'User created successfully', user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error creating user' });
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
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, qrCode: user.qrCode, balance: user.balance, credits: user.credits } });
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

    // Check if the passenger was referred by someone
    const referral = ride.passenger.referredBy;
    if (referral) {
      // Add R$ 0.10 to the referrer's balance
      await prisma.user.update({
        where: { id: referral.referrerId },
        data: { balance: { increment: 0.10 } }
      });
    } else {
      // Passenger has no referrer. Auto-bind to this driver!
      await prisma.referral.create({
        data: {
          referrerId: req.user.id,
          referredId: ride.passengerId
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
    const { quantity } = req.body; // 10, 20 or 30
    const validPackages = [10, 20, 30];
    if (!validPackages.includes(quantity)) {
      return res.status(400).json({ error: 'Pacote inválido. Escolha 10, 20 ou 30 créditos.' });
    }

    const pricePerCredit = 1.50;
    const totalPrice = quantity * pricePerCredit;

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));
