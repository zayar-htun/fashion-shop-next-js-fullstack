/*
  Warnings:

  - Added the required column `slug` to the `product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "product" ADD COLUMN     "description" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL;
