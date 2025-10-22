/*
  Warnings:

  - You are about to drop the column `api_config` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `api_endpoint` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `api_provider` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `booking_url` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `provider_id` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the `clinic_hours` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clinic_services` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `providers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."clinic_hours" DROP CONSTRAINT "clinic_hours_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."clinic_services" DROP CONSTRAINT "clinic_services_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."providers" DROP CONSTRAINT "providers_clinic_id_fkey";

-- AlterTable
ALTER TABLE "clinics" DROP COLUMN "api_config",
DROP COLUMN "api_endpoint",
DROP COLUMN "api_provider",
DROP COLUMN "booking_url",
DROP COLUMN "provider_id";

-- DropTable
DROP TABLE "public"."clinic_hours";

-- DropTable
DROP TABLE "public"."clinic_services";

-- DropTable
DROP TABLE "public"."providers";
