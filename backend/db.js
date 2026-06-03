const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // ObrigatÃ³rio para o Render
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log de conexÃ£o para diagnÃ³stico
pool.on('connect', () => {
  console.log('✅ Banco de Dados Conectado com Sucesso');
});

pool.on('error', (err) => {
  console.error('❌ ERRO NO BANCO DE DADOS:', err);
});

const initSchema = async () => {
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
      "id" TEXT PRIMARY KEY,
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
      "status" TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
  `;
  
  try {
    const client = await pool.connect();
    await client.query(schema);
    client.release();
    console.log('✅ Esquema do banco verificado/criado');
  } catch (err) {
    console.error('❌ ERRO AO CRIAR TABELAS:', err.message);
    // Não trava o processo, deixa tentar rodar a API
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initSchema
};
