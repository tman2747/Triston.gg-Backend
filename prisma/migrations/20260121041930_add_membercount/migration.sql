/*
  Warnings:

  - Added the required column `memberCount` to the `SkyhookLedger` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SkyhookLedger" ADD COLUMN     "memberCount" INTEGER NOT NULL;
