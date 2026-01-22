-- AlterTable
ALTER TABLE "orders" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "orders" ADD COLUMN "hasDeposit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "orders" ADD COLUMN "depositAmount" DECIMAL;
