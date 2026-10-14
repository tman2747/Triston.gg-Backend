-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('WEB', 'GAME', 'MOD', 'SERVER', 'TOOL', 'OTHER');

-- CreateEnum
CREATE TYPE "ServerGame" AS ENUM ('MINECRAFT', 'RUST', 'OTHER');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL,
    "url" TEXT,
    "sourceUrl" TEXT,
    "imageUrl" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "serverGame" "ServerGame",
    "serverAddress" TEXT,
    "serverRunning" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

