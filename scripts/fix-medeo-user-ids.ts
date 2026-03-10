/**
 * Try Medeo with user_id field from practitioners endpoint
 */

const MEDEO_API_KEY = process.env.MEDEO_API_KEY || 'c193fd4eb7624bba8c4af5b5cf0ae7eb'
const BASE = 'https://api-ca.medeohealth.com'

async function getPractitioners(orgId: number): Promise<any[]> {
  const url = `${BASE}/v3/org/${orgId}/practitioners`
  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.items || []
}

async function tryWithProvider(orgId: number, typeId: number, provider: string | number): Promise<string> {
  const now = new Date()
  const from = now.toISOString()
  const to = new Date(now.getTime() + 14 * 86400000).toISOString()
  const url = `${BASE}/v3/timeslots/org/${orgId}/available/list?from=${from}&to=${to}&type=${typeId}&provider=${provider}&count=5&page=1`
  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
  })
  const text = await res.text()
  return `${res.status}: ${text.substring(0, 150)}`
}

async function main() {
  // Test with Denman (requires provider) and Loyal (previously worked)
  const testOrgs = [
    { name: 'Denman', orgId: 6555, typeId: 53892 },
    { name: 'Loyal', orgId: 1558, typeId: 24862 },
  ]

  for (const org of testOrgs) {
    console.log(`\n=== ${org.name} (${org.orgId}) ===`)
    const practitioners = await getPractitioners(org.orgId)

    // Show first 3 practitioners with ALL their fields
    for (const p of practitioners.slice(0, 3)) {
      console.log(`\n  Practitioner: ${p.first_name} ${p.last_name}`)
      console.log(`    id=${p.id}, uuid=${p.uuid}, user_id=${p.user_id}`)
      console.log(`    occupation=${p.occupation}`)

      // Try id, user_id, uuid as provider
      const idResult = await tryWithProvider(org.orgId, org.typeId, p.id)
      console.log(`    provider=id(${p.id}): ${idResult}`)

      const userIdResult = await tryWithProvider(org.orgId, org.typeId, p.user_id)
      console.log(`    provider=user_id(${p.user_id}): ${userIdResult}`)

      const uuidResult = await tryWithProvider(org.orgId, org.typeId, p.uuid)
      console.log(`    provider=uuid(${p.uuid}): ${uuidResult}`)
    }
  }

  // Also try alternative endpoint patterns
  console.log('\n\n=== Alternative endpoint patterns ===')
  const now = new Date()
  const from = now.toISOString()
  const to = new Date(now.getTime() + 14 * 86400000).toISOString()

  for (const orgId of [6555, 1558]) {
    const patterns = [
      `${BASE}/v3/timeslots/org/${orgId}/available/list?from=${from}&to=${to}&count=5&page=1`,
      `${BASE}/v3/timeslots/${orgId}/available?from=${from}&to=${to}`,
      `${BASE}/v3/appointments/org/${orgId}/available?from=${from}&to=${to}`,
      `${BASE}/v3/booking/org/${orgId}/timeslots?from=${from}&to=${to}`,
      `${BASE}/v3/org/${orgId}/timeslots?from=${from}&to=${to}`,
      `${BASE}/v3/org/${orgId}/appointment-types`,
      `${BASE}/v3/org/${orgId}/booking-config`,
    ]

    for (const url of patterns) {
      const res = await fetch(url, {
        headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
      })
      const text = await res.text()
      const short = url.replace(BASE, '').split('?')[0]
      if (res.ok) {
        console.log(`  [${orgId}] ${short}: ${res.status} → ${text.substring(0, 200)}`)
      } else if (res.status !== 404) {
        console.log(`  [${orgId}] ${short}: ${res.status} → ${text.substring(0, 100)}`)
      }
    }
  }
}

main()
