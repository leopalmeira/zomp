const bcrypt = require('bcrypt');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
const USE_SQLITE = !DATABASE_URL || DATABASE_URL.trim() === '';

let pool;

if (USE_SQLITE) {
  // ═══════════════════════════════════════
  // MODO LOCAL — SQLite (sem PostgreSQL)
  // ═══════════════════════════════════════
  const Database = require('better-sqlite3');
  const path = require('path');
  const crypto = require('crypto');

  const dbPath = path.join(__dirname, '..', '..', 'zomp-local.db');
  const db = Database(dbPath);

  // WAL mode para melhor performance
  db.pragma('journal_mode = WAL');

  // Adaptador que simula a interface do pg Pool
  pool = {
    query: async (text, params = []) => {
      // Converter sintaxe PostgreSQL para SQLite
      let sql = text;

      // Separar múltiplos statements
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

      let rows = [];
      for (const stmt of statements) {
        if (!stmt || /^\s*--/.test(stmt)) continue;

        try {
          const stmtParams = [];
          let sqliteStmt = stmt.replace(/\$(\d+)/g, (match, num) => {
            const idx = parseInt(num, 10) - 1;
            stmtParams.push(params[idx]);
            return '?';
          });

          const isSelect = /^\s*SELECT/i.test(sqliteStmt);
          const isInsertReturning = /RETURNING/i.test(sqliteStmt);
          const isInsert = /^\s*INSERT/i.test(sqliteStmt);
          const isUpdate = /^\s*UPDATE/i.test(sqliteStmt);

          if (isInsertReturning) {
            const retMatch = sqliteStmt.match(/RETURNING\s+(.+)$/i);
            let cleanStmt = sqliteStmt.replace(/\s+RETURNING\s+.+$/i, '');
            
            cleanStmt = cleanStmt.replace(
              /ON CONFLICT\s*\(([^)]+)\)\s*DO UPDATE SET\s+(.+)/gi,
              (match, col, sets) => `ON CONFLICT(${col}) DO UPDATE SET ${sets}`
            );

            const info = db.prepare(cleanStmt).run(...stmtParams);
            
            if (retMatch) {
              const tableName = stmt.match(/INTO\s+"?(\w+)"?/i)?.[1];
              if (tableName && info.lastInsertRowid) {
                try {
                  const row = db.prepare(`SELECT * FROM "${tableName}" WHERE rowid = ?`).get(info.lastInsertRowid);
                  if (row) rows = [row];
                } catch { /* ignore */ }
              }
              if (rows.length === 0 && stmtParams.length > 0) {
                const tableName2 = stmt.match(/INTO\s+"?(\w+)"?/i)?.[1];
                if (tableName2) {
                  try {
                    const emailParam = stmtParams.find(p => typeof p === 'string' && p.includes('@'));
                    if (emailParam) {
                      const row = db.prepare(`SELECT * FROM "${tableName2}" WHERE email = ?`).get(emailParam);
                      if (row) rows = [row];
                    }
                  } catch { /* ignore */ }
                }
              }
            }
          } else if (isSelect) {
            rows = db.prepare(sqliteStmt).all(...stmtParams);
          } else if (isInsert || isUpdate) {
            sqliteStmt = sqliteStmt.replace(
              /ON CONFLICT\s*\(([^)]+)\)\s*DO UPDATE SET\s+(.+)/gi,
              (match, col, sets) => `ON CONFLICT(${col}) DO UPDATE SET ${sets}`
            );
            sqliteStmt = sqliteStmt.replace(
              /ON CONFLICT\s*\(([^)]+)\)\s*DO NOTHING/gi,
              (match, col) => `ON CONFLICT(${col}) DO NOTHING`
            );
            db.prepare(sqliteStmt).run(...stmtParams);
          } else {
            try {
              db.exec(sqliteStmt);
            } catch { /* ignore DDL errors */ }
          }
        } catch (err) {
          if (!err.message.includes('already exists') && !err.message.includes('duplicate') && !err.message.includes('UNIQUE constraint')) {
            // console.warn('[SQLite] Erro:', err.message);
          }
        }
      }

      return { rows, rowCount: rows.length };
    },

    connect: async () => {
      return {
        query: pool.query,
        release: () => {}
      };
    }
  };

  console.log(`📦 [Sistema] Modo LOCAL ativado — SQLite em: ${dbPath}`);
} else {
  // ═══════════════════════════════════════
  // MODO PRODUÇÃO — PostgreSQL (Render)
  // ═══════════════════════════════════════
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('🌐 [Sistema] Modo CLOUD ativado — PostgreSQL');
}


async function initDB() {
  console.log('🚀 [Sistema] Verificando integridade do banco...');
  let client;
  try {
    client = await pool.connect();

    if (USE_SQLITE) {
      // ══════════ SQLite DDL ══════════
      await client.query(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "email" TEXT UNIQUE NOT NULL,
          "password" TEXT,
          "role" TEXT NOT NULL DEFAULT 'PASSENGER',
          "qrCode" TEXT UNIQUE,
          "credits" REAL DEFAULT 0,
          "balance" REAL DEFAULT 0,
          "rating" REAL DEFAULT 5,
          "totalRatings" INTEGER DEFAULT 0,
          "ridesAccepted" INTEGER DEFAULT 0,
          "ridesMissed" INTEGER DEFAULT 0,
          "ridesCompleted" INTEGER DEFAULT 0,
          "isApproved" INTEGER DEFAULT 1,
          "photo" TEXT,
          "cnh" TEXT,
          "crlv" TEXT,
          "carPlate" TEXT,
          "carModel" TEXT,
          "carColor" TEXT,
          "phone" TEXT,
          "pixKey" TEXT,
          "vehicleType" TEXT DEFAULT 'car',
          "createdAt" TEXT DEFAULT (datetime('now')),
          "updatedAt" TEXT DEFAULT (datetime('now'))
        );
      `);
    } else {
      // ══════════ PostgreSQL DDL ══════════
      await client.query(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "email" TEXT UNIQUE NOT NULL,
          "password" TEXT,
          "role" TEXT NOT NULL DEFAULT 'PASSENGER',
          "qrCode" TEXT,
          "credits" DOUBLE PRECISION DEFAULT 0,
          "balance" DOUBLE PRECISION DEFAULT 0,
          "rating" DOUBLE PRECISION DEFAULT 5,
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
          "vehicleType" TEXT DEFAULT 'car',
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        );
      `);
      // Add UNIQUE constraint on qrCode separately (allows NULL duplicates in PG)
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "User_qrCode_key" ON "User" ("qrCode") WHERE "qrCode" IS NOT NULL;
      `);
    }

    if (USE_SQLITE) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "AdminConfig" (
          "id" TEXT PRIMARY KEY DEFAULT 'singleton',
          "pricePerKmCar" REAL DEFAULT 2.00,
          "pricePerKmMoto" REAL DEFAULT 1.50,
          "minFareCar" REAL DEFAULT 8.40,
          "minFareMoto" REAL DEFAULT 7.20,
          "royaltyPerRide" REAL DEFAULT 0.30,
          "royaltyMonthlyLimit" INTEGER DEFAULT 8,
          "maxPassengersPerDriver" INTEGER DEFAULT 700,
          "bindingMonthsFirst" INTEGER DEFAULT 12,
          "bindingMonthsRenew" INTEGER DEFAULT 12,
          "autoSuspendMinAcceptance" INTEGER DEFAULT 70,
          "autoSuspendMinRating" REAL DEFAULT 4.5,
          "launchDate" TEXT DEFAULT '2026-11-01',
          "pricePerCredit" REAL DEFAULT 1.50,
          "driverSlots" INTEGER DEFAULT 3300,
          "preRegisterEndDate" TEXT DEFAULT '2026-11-01T23:59:59-03:00',
          "isAppLive" INTEGER DEFAULT 0,
          "launchStatus" TEXT DEFAULT 'PRE_LAUNCH'
        );
      `);
    } else {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "AdminConfig" (
          "id" TEXT PRIMARY KEY DEFAULT 'singleton',
          "pricePerKmCar" DOUBLE PRECISION DEFAULT 2.00,
          "pricePerKmMoto" DOUBLE PRECISION DEFAULT 1.50,
          "minFareCar" DOUBLE PRECISION DEFAULT 8.40,
          "minFareMoto" DOUBLE PRECISION DEFAULT 7.20,
          "royaltyPerRide" DOUBLE PRECISION DEFAULT 0.30,
          "royaltyMonthlyLimit" INTEGER DEFAULT 8,
          "maxPassengersPerDriver" INTEGER DEFAULT 700,
          "bindingMonthsFirst" INTEGER DEFAULT 12,
          "bindingMonthsRenew" INTEGER DEFAULT 12,
          "autoSuspendMinAcceptance" INTEGER DEFAULT 70,
          "autoSuspendMinRating" DOUBLE PRECISION DEFAULT 4.5,
          "launchDate" TEXT DEFAULT '2026-11-01',
          "pricePerCredit" DOUBLE PRECISION DEFAULT 1.50,
          "driverSlots" INTEGER DEFAULT 3300,
          "preRegisterEndDate" TEXT DEFAULT '2026-11-01T23:59:59-03:00',
          "isAppLive" BOOLEAN DEFAULT false,
          "launchStatus" TEXT DEFAULT 'PRE_LAUNCH'
        );
      `);
    }

    const tsDefault = USE_SQLITE ? "(datetime('now'))" : "NOW()";

    await client.query(`
      CREATE TABLE IF NOT EXISTS "Referral" (
        "id" TEXT PRIMARY KEY,
        "referrerId" TEXT,
        "referredId" TEXT,
        "expiresAt" TEXT,
        "createdAt" ${USE_SQLITE ? 'TEXT' : 'TIMESTAMP'} DEFAULT ${tsDefault}
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "Ride" (
        "id" TEXT PRIMARY KEY,
        "passengerId" TEXT,
        "driverId" TEXT,
        "origin" TEXT NOT NULL,
        "destination" TEXT NOT NULL,
        "price" ${USE_SQLITE ? 'REAL' : 'DOUBLE PRECISION'} NOT NULL,
        "distanceKm" ${USE_SQLITE ? 'REAL' : 'DOUBLE PRECISION'} NOT NULL,
        "vehicleType" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "originLat" ${USE_SQLITE ? 'REAL' : 'DOUBLE PRECISION'},
        "originLng" ${USE_SQLITE ? 'REAL' : 'DOUBLE PRECISION'},
        "destLat" ${USE_SQLITE ? 'REAL' : 'DOUBLE PRECISION'},
        "destLng" ${USE_SQLITE ? 'REAL' : 'DOUBLE PRECISION'},
        "createdAt" ${USE_SQLITE ? 'TEXT' : 'TIMESTAMP'} DEFAULT ${tsDefault},
        "updatedAt" ${USE_SQLITE ? 'TEXT' : 'TIMESTAMP'} DEFAULT ${tsDefault}
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "RideMessage" (
        "id" TEXT PRIMARY KEY,
        "rideId" TEXT,
        "senderId" TEXT,
        "senderRole" TEXT NOT NULL,
        "senderName" TEXT NOT NULL,
        "text" TEXT NOT NULL,
        "createdAt" ${USE_SQLITE ? 'TEXT' : 'TIMESTAMP'} DEFAULT ${tsDefault}
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "SupportTicket" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT,
        "userRole" TEXT NOT NULL,
        "userName" TEXT NOT NULL,
        "userEmail" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'OPEN',
        "createdAt" ${USE_SQLITE ? 'TEXT' : 'TIMESTAMP'} DEFAULT ${tsDefault},
        "updatedAt" ${USE_SQLITE ? 'TEXT' : 'TIMESTAMP'} DEFAULT ${tsDefault}
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "SupportMessage" (
        "id" TEXT PRIMARY KEY,
        "ticketId" TEXT,
        "senderRole" TEXT NOT NULL,
        "senderName" TEXT NOT NULL,
        "text" TEXT NOT NULL,
        "createdAt" ${USE_SQLITE ? 'TEXT' : 'TIMESTAMP'} DEFAULT ${tsDefault}
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "DiscountLog" (
        "id" TEXT PRIMARY KEY,
        "passengerId" TEXT NOT NULL,
        "discount" ${USE_SQLITE ? 'REAL' : 'DOUBLE PRECISION'} NOT NULL,
        "originalPrice" ${USE_SQLITE ? 'REAL' : 'DOUBLE PRECISION'},
        "createdAt" ${USE_SQLITE ? 'TEXT' : 'TIMESTAMP'} DEFAULT ${tsDefault}
      );
    `);

    // Injeção de usuários de teste
    const crypto = require('crypto');
    const uuid = () => crypto.randomUUID();

    const adminEmail = process.env.ADMIN_EMAIL || 'leandro2703palmeira@gmail.com';
    const adminPass = process.env.ADMIN_PASSWORD || 'Lps27031981@';
    const adminName = process.env.ADMIN_NAME || 'Leandro Palmeira';
    const hash = await bcrypt.hash(adminPass, 10);
    const testPasswordHash = await bcrypt.hash('teste123', 10);

    const isApprovedVal = USE_SQLITE ? 1 : true;

    // Admin
    await client.query(`
      INSERT INTO "User" (id, name, email, password, role, "isApproved")
      VALUES ($1, $2, $3, $4, 'ADMIN', $5)
      ON CONFLICT (email) DO UPDATE SET password = $4, role = 'ADMIN', "isApproved" = $5;
    `, [uuid(), adminName, adminEmail, hash, isApprovedVal]);

    // Cliente
    await client.query(`
      INSERT INTO "User" (id, name, email, password, role, "isApproved")
      VALUES ($1, $2, $3, $4, 'PASSENGER', $5)
      ON CONFLICT (email) DO UPDATE SET password = $4, role = 'PASSENGER', "isApproved" = $5;
    `, [uuid(), 'Cliente Teste', 'cliente@zomp.com', testPasswordHash, isApprovedVal]);

    // Motorista
    await client.query(`
      INSERT INTO "User" (id, name, email, password, role, "isApproved", "qrCode", "carPlate", "carModel", "carColor", "cnh", credits, "ridesCompleted")
      VALUES ($1, $2, $3, $4, 'DRIVER', $5, 'ZOMP-TEST-DRIVER', 'ZMP-2026', 'Toyota Corolla', 'Preto', '12345678900', 1000, 42)
      ON CONFLICT (email) DO UPDATE SET password = $4, role = 'DRIVER', "isApproved" = $5, "qrCode" = 'ZOMP-TEST-DRIVER', credits = 1000;
    `, [uuid(), 'Motorista Teste', 'motorista@zomp.com', testPasswordHash, isApprovedVal]);

    // AdminConfig singleton
    await client.query(`
      INSERT INTO "AdminConfig" (id) VALUES ('singleton')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('✅ [Sistema] Banco de dados e Admin prontos.');
  } catch (err) {
    console.error('❌ [Sistema] Erro no banco:', err.message);
    console.error(err.stack);
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
