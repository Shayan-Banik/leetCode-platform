/*
  Warnings:

  - You are about to drop the column `constrains` on the `Problem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Problem" DROP COLUMN "constrains",
ADD COLUMN     "constraints" TEXT NOT NULL DEFAULT '';
