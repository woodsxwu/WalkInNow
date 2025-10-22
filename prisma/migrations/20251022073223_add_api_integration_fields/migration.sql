-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "api_config" JSONB,
ADD COLUMN     "api_endpoint" TEXT,
ADD COLUMN     "api_provider" TEXT,
ADD COLUMN     "booking_url" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "provider_id" TEXT;
