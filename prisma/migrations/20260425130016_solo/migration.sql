-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('LOCAL', 'INTERSTATE');

-- CreateEnum
CREATE TYPE "RiderStatus" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DELIVERY_COMPANY';

-- DropIndex
DROP INDEX "users_username_key";

-- CreateTable
CREATE TABLE "delivery_companies" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coverageAreas" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "acceptingOrders" BOOLEAN NOT NULL DEFAULT true,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageDeliveryHours" DOUBLE PRECISION NOT NULL DEFAULT 24,
    "baseCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_riders" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "currentStatus" "RiderStatus" NOT NULL DEFAULT 'OFFLINE',
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "coverageAreas" JSONB,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentWorkload" INTEGER NOT NULL DEFAULT 0,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_riders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_companies_ownerUserId_key" ON "delivery_companies"("ownerUserId");

-- AddForeignKey
ALTER TABLE "delivery_companies" ADD CONSTRAINT "delivery_companies_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_riders" ADD CONSTRAINT "delivery_riders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "delivery_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
