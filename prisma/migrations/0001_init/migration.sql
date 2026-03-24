-- Initial schema for fuel-app MVP
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "User" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "email" text NOT NULL UNIQUE,
  "passwordHash" text NOT NULL,
  "name" text,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Vehicle" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReadingPhoto" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "vehicleId" uuid NOT NULL,
  "imagePath" text NOT NULL,
  "odometerKm" numeric(12,3) NOT NULL,
  "kmPerLiter" numeric(12,5) NOT NULL,
  "capturedAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReadingPhoto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReadingPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ReadingPhoto_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ReadingPhoto_vehicleId_capturedAt_idx" ON "ReadingPhoto"("vehicleId","capturedAt");

CREATE TABLE IF NOT EXISTS "FuelFillUp" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "vehicleId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "filledAt" timestamptz NOT NULL,
  "liters" numeric(12,3) NOT NULL,
  "totalCost" numeric(12,2) NOT NULL,
  "pricePerLiter" numeric(12,5) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FuelFillUp_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FuelFillUp_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FuelFillUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "FuelFillUp_vehicleId_filledAt_idx" ON "FuelFillUp"("vehicleId","filledAt");

CREATE TABLE IF NOT EXISTS "UsageSegment" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "vehicleId" uuid NOT NULL,
  "startReadingId" uuid NOT NULL,
  "endReadingId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "capturedAt" timestamptz NOT NULL,
  "kmDelta" numeric(12,3) NOT NULL,
  "litrosUsed" numeric(12,3) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageSegment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UsageSegment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UsageSegment_startReadingId_fkey" FOREIGN KEY ("startReadingId") REFERENCES "ReadingPhoto"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UsageSegment_endReadingId_fkey" FOREIGN KEY ("endReadingId") REFERENCES "ReadingPhoto"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UsageSegment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UsageSegment_vehicleId_capturedAt_idx" ON "UsageSegment"("vehicleId","capturedAt");

