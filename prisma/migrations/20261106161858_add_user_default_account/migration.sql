-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultAccountId" TEXT;

-- CreateIndex
CREATE INDEX "User_defaultAccountId_idx" ON "User"("defaultAccountId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultAccountId_fkey" FOREIGN KEY ("defaultAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
