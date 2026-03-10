/**
 * Fix Medeo clinics that need the `practitioner` param (not `provider`!)
 * For orgs with ebooking_show_all_practitioners=false, we must query per-practitioner
 */
import { PrismaClient } from '../src/generated/prisma'

const KEY = 'c193fd4eb7624bba8c4af5b5cf0ae7eb'
const BASE = 'https://api-ca.medeohealth.com'
const prisma = new PrismaClient()
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface MedeoPractitioner {
  id: number
  uuid: string
  first_name: string
  last_name: string
  occupation: string | null
  suffix: string
}

async function getOrgData(orgId: number) {
  const res = await fetch(`${BASE}/v3/org/${orgId}`, {
    headers: { 'Ocp-Apim-Subscription-Key': KEY },
  })
  if (!res.ok) return null
  return res.json()
}

async function tryTimeslotsWithPractitioner(orgId: number, typeId: number, practitionerId: number) {
  const from = '2026-03-02T11:00:00.000-08:00'
  const to = '2026-03-16T23:59:59.999-08:00'
  const url = `${BASE}/v3/timeslots/org/${orgId}/available/list?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&type=${typeId}&practitioner=${practitionerId}&count=1&page=1`
  const res = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': KEY } })
  if (!res.ok) return null
  const data = await res.json()
  return data
}

const orgs = [
  { name: 'Denman', orgId: 6555, typeId: 53892 },
  { name: 'Georgia', orgId: 4753, typeId: 37916 },
  { name: 'Manna', orgId: 3041, typeId: 11190 },
  { name: 'Ashton', orgId: 4521, typeId: 50517 },
  { name: 'Kariba', orgId: 5115, typeId: 20061 },
  { name: 'WELL-CentralCity', orgId: 6777, typeId: 37732 },
  { name: 'WELL-Evergreen', orgId: 6780, typeId: 37729 },
  { name: 'WELL-CedarHills', orgId: 6778, typeId: 37731 },
  { name: 'WELL-Nordel', orgId: 6768, typeId: 37730 },
  { name: 'PrimeCare', orgId: 5800, typeId: 26902 },
  { name: 'Mahogany', orgId: 5755, typeId: 23951 },
  { name: 'FamilyPractice', orgId: 6656, typeId: 53038 },
  { name: 'CarePoint', orgId: 4890, typeId: 20661 },
  { name: 'Windermere', orgId: 2608, typeId: 14921 },
  { name: 'Hygiea', orgId: 2830, typeId: 18497 },
  { name: 'NorthShore', orgId: 2064, typeId: 25769 },
  { name: 'Pier', orgId: 6786, typeId: 36616 },
  { name: 'WalnutGrove', orgId: 5086, typeId: 36345 },
]

async function main() {
  const results: { name: string; orgId: number; typeId: number; practitionerIds: number[]; hasSlots: boolean }[] = []

  for (const org of orgs) {
    console.log(`\n=== ${org.name} (org=${org.orgId}) ===`)

    const orgData = await getOrgData(org.orgId)
    if (!orgData) {
      console.log('  Failed to get org data')
      continue
    }

    const practitioners: MedeoPractitioner[] = orgData.practitioners || []
    console.log(`  ${practitioners.length} practitioners`)

    const workingPractitioners: number[] = []
    let hasSlots = false

    for (const prac of practitioners) {
      const data = await tryTimeslotsWithPractitioner(org.orgId, org.typeId, prac.id)
      if (data) {
        const total = data.totalItems || 0
        if (total > 0) {
          console.log(`  ✓ ${prac.first_name} ${prac.last_name} (id=${prac.id}): ${total} slots, first=${data.items[0]?.starts_at}`)
          hasSlots = true
        } else {
          console.log(`  ○ ${prac.first_name} ${prac.last_name} (id=${prac.id}): 0 slots`)
        }
        workingPractitioners.push(prac.id)
      }
    }

    results.push({
      name: org.name,
      orgId: org.orgId,
      typeId: org.typeId,
      practitionerIds: workingPractitioners,
      hasSlots,
    })

    await sleep(300)
  }

  // Summary
  console.log('\n\n=== SUMMARY ===')
  for (const r of results) {
    console.log(`${r.hasSlots ? '✓' : '○'} ${r.name}: ${r.practitionerIds.length} valid practitioners${r.hasSlots ? ' (HAS SLOTS!)' : ''}`)
  }

  // Update DB: add practitionerIds to apiConfig
  console.log('\n=== Updating DB ===')
  for (const r of results) {
    if (r.practitionerIds.length === 0) continue

    const updated = await prisma.clinic.updateMany({
      where: {
        apiProvider: 'medeo',
        apiConfig: { path: ['orgId'], equals: r.orgId },
      },
      data: {
        apiConfig: {
          orgId: r.orgId,
          typeId: r.typeId,
          practitionerIds: r.practitionerIds,
        },
        availabilityLastFetchedAt: null, // force re-fetch
      },
    })
    console.log(`  ${r.name}: updated ${updated.count} clinic(s) with ${r.practitionerIds.length} practitioners`)
  }

  await prisma.$disconnect()
}

main()
