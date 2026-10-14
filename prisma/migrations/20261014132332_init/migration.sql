-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('EXPENSE', 'INCOME');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" VARCHAR(50) NOT NULL,
    "type" "CategoryType" NOT NULL,
    "icon" TEXT,
    "color" VARCHAR(7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "systemRole" "SystemRole" NOT NULL DEFAULT 'USER',
    "baseCurrency" CHAR(3) NOT NULL DEFAULT 'UAH',
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_type_key" ON "Category"("userId", "name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
