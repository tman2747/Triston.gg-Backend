/*
  Warnings:

  - You are about to drop the column `authorId` on the `SkyhookLedger` table. All the data in the column will be lost.
  - Added the required column `group` to the `SkyhookLedger` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SkyhookLedger" DROP CONSTRAINT "SkyhookLedger_authorId_fkey";

-- AlterTable
ALTER TABLE "SkyhookLedger" DROP COLUMN "authorId",
ADD COLUMN     "group" TEXT NOT NULL;
