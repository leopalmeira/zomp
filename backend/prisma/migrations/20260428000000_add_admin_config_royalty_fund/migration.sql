-- Migration: add AdminConfig, RoyaltyFund, royaltySentToFund, ADMIN role support

-- Add royaltySentToFund to Ride (if not exists)
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "royaltySentToFund" BOOLEAN NOT NULL DEFAULT false;

-- Create AdminConfig table
CREATE TABLE IF NOT EXISTS "AdminConfig" (
    "id"                    TEXT NOT NULL DEFAULT 'singleton',
    "pricePerKmCar"         DOUBLE PRECISION NOT NULL DEFAULT 2.00,
    "pricePerKmMoto"        DOUBLE PRECISION NOT NULL DEFAULT 1.50,
    "minFareCar"            DOUBLE PRECISION NOT NULL DEFAULT 8.40,
    "minFareMoto"           DOUBLE PRECISION NOT NULL DEFAULT 7.20,
    "royaltyPerRide"        DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    "royaltyMonthlyLimit"   INTEGER NOT NULL DEFAULT 8,
    "maxPassengersPerDriver" INTEGER NOT NULL DEFAULT 700,
    "bindingMonthsFirst"    INTEGER NOT NULL DEFAULT 36,
    "bindingMonthsRenew"    INTEGER NOT NULL DEFAULT 24,
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminConfig_pkey" PRIMARY KEY ("id")
);

-- Create RoyaltyFund table
CREATE TABLE IF NOT EXISTS "RoyaltyFund" (
    "id"          TEXT NOT NULL,
    "amount"      DOUBLE PRECISION NOT NULL,
    "reason"      TEXT NOT NULL,
    "fromRideId"  TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoyaltyFund_pkey" PRIMARY KEY ("id")
);

-- Insert default AdminConfig if not exists
INSERT INTO "AdminConfig" ("id", "updatedAt")
VALUES ('singleton', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
