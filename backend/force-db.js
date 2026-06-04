const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
  connectionTimeoutMillis: 10000
});

const schema = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS "User" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" TEXT NOT NULL,
      "email" TEXT UNIQUE NOT NULL,
      "password" TEXT,
      "role" TEXT NOT NULL,
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
`;

async function run() {
  console.log('🚀 INICIANDO CRIAÇÃO FORÇADA DE TABELAS...');
  let client;
  try {
    client = await pool.connect();
    await client.query(schema);
    console.log('✅ TABELAS CRIADAS/VERIFICADAS COM SUCESSO!');
  } catch (err) {
    console.error('⚠️ [force-db] Erro ao criar tabelas (não fatal):', err.message);
    console.log('ℹ️ [force-db] O servidor vai iniciar mesmo assim. As tabelas serão criadas pelo index.js no startup.');
  } finally {
    if (client) client.release();
    try { await pool.end(); } catch {}
  }
}

run();
