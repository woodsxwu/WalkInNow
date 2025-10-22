/*
  Warnings:

  - You are about to drop the column `api_config` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `booking_url` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `fax` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `clinics` table. All the data in the column will be lost.
  - The `appointment_types` column on the `clinics` table would be dropped and recreated. This will lead to data loss if there is data in the column.
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
DROP COLUMN "booking_url",
DROP COLUMN "fax",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "appointment_types",
ADD COLUMN     "appointment_types" TEXT[];

-- DropTable
DROP TABLE "public"."clinic_hours";

-- DropTable
DROP TABLE "public"."clinic_services";

-- DropTable
DROP TABLE "public"."providers";
