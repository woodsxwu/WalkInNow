import { PrismaClient } from '../src/generated/prisma'

const p = new PrismaClient()

async function main() {
  // Reset availabilityLastFetchedAt for clinics that have apiConfig but no nextAvailableSlot
  // This forces them to be re-fetched on the next refresh
  const result = await p.clinic.updateMany({
    where: {
      isActive: true,
      isRealWalkIn: false,
      nextAvailableSlot: null,
      apiConfig: { not: { equals: null } },
    },
    data: {
      availabilityLastFetchedAt: null,
    },
  })

  console.log(`Reset ${result.count} clinics for re-fetch`)
  await p.$disconnect()
}

main()
