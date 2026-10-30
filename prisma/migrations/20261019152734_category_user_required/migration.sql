/*
  Warnings:

  - Made the column `userId` on table `Category` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "userId" SET NOT NULL;
