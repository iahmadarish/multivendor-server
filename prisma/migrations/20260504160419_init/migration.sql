/*
  Warnings:

  - The values [home,office,other] on the enum `AddressType` will be removed. If these variants are still used in the database, this will fail.
  - The values [male,female,other] on the enum `Gender` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `created_at` on the `shipping_addresses` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `shipping_addresses` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emailNotifications` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `newsletter` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `smsNotifications` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `users` table. All the data in the column will be lost.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `shipping_addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.
  - Made the column `profilePicture` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `gender` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'EDITOR', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- AlterEnum
BEGIN;
CREATE TYPE "AddressType_new" AS ENUM ('HOME', 'OFFICE', 'OTHER');
ALTER TABLE "public"."shipping_addresses" ALTER COLUMN "addressType" DROP DEFAULT;
ALTER TABLE "shipping_addresses" ALTER COLUMN "addressType" TYPE "AddressType_new" USING ("addressType"::text::"AddressType_new");
ALTER TYPE "AddressType" RENAME TO "AddressType_old";
ALTER TYPE "AddressType_new" RENAME TO "AddressType";
DROP TYPE "public"."AddressType_old";
ALTER TABLE "shipping_addresses" ALTER COLUMN "addressType" SET DEFAULT 'HOME';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Gender_new" AS ENUM ('MALE', 'FEMALE', 'OTHER', '');
ALTER TABLE "users" ALTER COLUMN "gender" TYPE "Gender_new" USING ("gender"::text::"Gender_new");
ALTER TYPE "Gender" RENAME TO "Gender_old";
ALTER TYPE "Gender_new" RENAME TO "Gender";
DROP TYPE "public"."Gender_old";
COMMIT;

-- AlterTable
ALTER TABLE "shipping_addresses" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "fullName" SET DATA TYPE TEXT,
ALTER COLUMN "phoneNumber" SET DATA TYPE TEXT,
ALTER COLUMN "addressLine1" SET DATA TYPE TEXT,
ALTER COLUMN "addressLine2" SET DATA TYPE TEXT,
ALTER COLUMN "city" SET DATA TYPE TEXT,
ALTER COLUMN "state" SET DATA TYPE TEXT,
ALTER COLUMN "zipCode" SET DATA TYPE TEXT,
ALTER COLUMN "country" SET DATA TYPE TEXT,
ALTER COLUMN "addressType" SET DEFAULT 'HOME';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "created_at",
DROP COLUMN "emailNotifications",
DROP COLUMN "newsletter",
DROP COLUMN "smsNotifications",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "preferences" JSONB NOT NULL DEFAULT '{"newsletter": true, "smsNotifications": false, "emailNotifications": true}',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "password" SET DATA TYPE TEXT,
ALTER COLUMN "phoneNumber" SET DATA TYPE TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER',
ALTER COLUMN "emailVerificationOTP" SET DATA TYPE TEXT,
ALTER COLUMN "resetPasswordOTP" SET DATA TYPE TEXT,
ALTER COLUMN "profilePicture" SET NOT NULL,
ALTER COLUMN "profilePicture" SET DATA TYPE TEXT,
ALTER COLUMN "gender" SET NOT NULL,
ALTER COLUMN "gender" SET DEFAULT '',
DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'ACTIVE';

-- DropEnum
DROP TYPE "UserRole";

-- DropEnum
DROP TYPE "UserStatus";
