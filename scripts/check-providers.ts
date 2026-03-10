import { PrismaClient } from '../src/generated/prisma'

const p = new PrismaClient()

async function main() {
  const clinics = await p.clinic.findMany({
    where: { isActive: true, isRealWalkIn: false },
    select: { name: true, apiProvider: true, nextAvailableSlot: true },
  })

  const byProvider: Record<string, { total: number; hasSlot: number; noSlot: number; names: string[] }> = {}
  for (const c of clinics) {
    const key = c.apiProvider || 'no-provider'
    if (!byProvider[key]) byProvider[key] = { total: 0, hasSlot: 0, noSlot: 0, names: [] }
    byProvider[key].total++
    if (c.nextAvailableSlot) byProvider[key].hasSlot++
    else {
      byProvider[key].noSlot++
      byProvider[key].names.push(c.name)
    }
  }

  for (const [provider, stats] of Object.entries(byProvider)) {
    console.log(`\n=== ${provider} ===`)
    console.log(`  Total: ${stats.total}, Has slot: ${stats.hasSlot}, No slot: ${stats.noSlot}`)
    if (stats.names.length > 0) {
      console.log(`  Missing availability:`)
      stats.names.forEach(n => console.log(`    - ${n}`))
    }
  }

  await p.$disconnect()
}

main()
