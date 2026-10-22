/*
  Warnings:

  - You are about to drop the column `prevTokenHash` on the `Session` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Session_prevTokenHash_key";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "prevTokenHash";

-- CreateTable
CREATE TABLE "UsedRefreshToken" (
    "tokenHash" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedRefreshToken_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateIndex
CREATE INDEX "UsedRefreshToken_sessionId_idx" ON "UsedRefreshToken"("sessionId");

-- AddForeignKey
ALTER TABLE "UsedRefreshToken" ADD CONSTRAINT "UsedRefreshToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
