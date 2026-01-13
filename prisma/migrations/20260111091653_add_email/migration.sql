/*
  Warnings:

  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TRISTON';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" VARCHAR(320) NOT NULL;
