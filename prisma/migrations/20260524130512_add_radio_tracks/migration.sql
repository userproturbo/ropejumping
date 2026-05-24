-- CreateEnum
CREATE TYPE "RadioMood" AS ENUM ('RELAX', 'ENERGETIC', 'FUN');

-- CreateTable
CREATE TABLE "RadioTrack" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "mood" "RadioMood" NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "coverUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadioTrack_pkey" PRIMARY KEY ("id")
);
