const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && (!process.env.DATABASE_URL.includes('@dpg-') || process.env.DATABASE_URL.includes('.render.com'))
    ? { rejectUnauthorized: false }
    : false
});

async function initDB() {
  console.log('🚀 [Sistema] Verificando integridade do banco...');
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS "User" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "password" TEXT,
        "role" TEXT NOT NULL DEFAULT 'PASSENGER',
        "qrCode" TEXT UNIQUE,
        "credits" DECIMAL DEFAULT 0,
        "balance" DECIMAL DEFAULT 0,
        "rating" DECIMAL DEFAULT 5,
        "totalRatings" INTEGER DEFAULT 0,
        "ridesAccepted" INTEGER DEFAULT 0,
        "ridesMissed" INTEGER DEFAULT 0,
        "ridesCompleted" INTEGER DEFAULT 0,
        "isApproved" BOOLEAN DEFAULT true,
        "photo" TEXT,
        "cnh" TEXT,
        "crlv" TEXT,
        "carPlate" TEXT,
        "carModel" TEXT,
        "carColor" TEXT,
        "phone" TEXT,
        "pixKey" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "AdminConfig" (
        "id" TEXT PRIMARY KEY DEFAULT 'singleton',
        "pricePerKmCar" DECIMAL DEFAULT 2.00,
        "pricePerKmMoto" DECIMAL DEFAULT 1.50,
        "minFareCar" DECIMAL DEFAULT 8.40,
        "minFareMoto" DECIMAL DEFAULT 7.20,
        "royaltyPerRide" DECIMAL DEFAULT 0.30,
        "royaltyMonthlyLimit" INTEGER DEFAULT 8,
        "maxPassengersPerDriver" INTEGER DEFAULT 700,
        "bindingMonthsFirst" INTEGER DEFAULT 36,
        "bindingMonthsRenew" INTEGER DEFAULT 24,
        "autoSuspendMinAcceptance" INTEGER DEFAULT 70,
        "autoSuspendMinRating" DECIMAL DEFAULT 4.5,
        "launchDate" DATE DEFAULT '2026-07-30',
        "pricePerCredit" DECIMAL DEFAULT 1.50
      );

      CREATE TABLE IF NOT EXISTS "Referral" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "referrerId" UUID REFERENCES "User"(id),
        "referredId" UUID REFERENCES "User"(id),
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "Ride" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "passengerId" UUID REFERENCES "User"(id),
        "driverId" UUID REFERENCES "User"(id),
        "origin" TEXT NOT NULL,
        "destination" TEXT NOT NULL,
        "price" DECIMAL NOT NULL,
        "distanceKm" DECIMAL NOT NULL,
        "vehicleType" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Injeção de Admin Master
    const adminEmail = process.env.ADMIN_EMAIL || 'leandro2703palmeira@gmail.com';
    const adminPass = process.env.ADMIN_PASSWORD || 'Lps27031981@';
    const adminName = process.env.ADMIN_NAME || 'Leandro Palmeira';
    const hash = await bcrypt.hash(adminPass, 10);

    await client.query(`
      INSERT INTO "User" (name, email, password, role, "isApproved")
      VALUES ($1, $2, $3, 'ADMIN', true)
      ON CONFLICT (email) DO UPDATE SET password = $3, role = 'ADMIN';
    `, [adminName, adminEmail, hash]);

    // Garantir AdminConfig singleton
    await client.query(`
      INSERT INTO "AdminConfig" (id) VALUES ('singleton')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('✅ [Sistema] Banco de dados e Admin prontos.');
  } catch (err) {
    console.error('❌ [Sistema] Erro no banco:', err.message);
  } finally {
    if (client) {
      client.release();
    }
  }
}

module.exports = {
  pool,
  initDB
};
