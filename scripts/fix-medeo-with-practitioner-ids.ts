/**
 * Try Medeo timeslots with ACTUAL practitioner IDs from the practitioners endpoint
 */

const MEDEO_API_KEY = process.env.MEDEO_API_KEY || 'c193fd4eb7624bba8c4af5b5cf0ae7eb'
const BASE = 'https://api-ca.medeohealth.com'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface Practitioner {
  id: number
  uuid: string
  first_name: string
  last_name: string
  occupation: string
}

async function getPractitioners(orgId: number): Promise<Practitioner[]> {
  const url = `${BASE}/v3/org/${orgId}/practitioners`
  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.items || []
}

async function tryTimeslots(orgId: number, typeId: number, providerId: number): Promise<any> {
  const now = new Date()
  const from = now.toISOString()
  const to = new Date(now.getTime() + 14 * 86400000).toISOString()
  const url = `${BASE}/v3/timeslots/org/${orgId}/available/list?from=${from}&to=${to}&type=${typeId}&provider=${providerId}&count=5&page=1`
  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
  })
  const text = await res.text()
  try {
    return { status: res.status, data: JSON.parse(text) }
  } catch {
    return { status: res.status, data: text.substring(0, 200) }
  }
}

async function tryTimeslotsWithoutProvider(orgId: number, typeId: number): Promise<any> {
  const now = new Date()
  const from = now.toISOString()
  const to = new Date(now.getTime() + 14 * 86400000).toISOString()
  const url = `${BASE}/v3/timeslots/org/${orgId}/available/list?from=${from}&to=${to}&type=${typeId}&count=5&page=1`
  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
  })
  const text = await res.text()
  try {
    return { status: res.status, data: JSON.parse(text) }
  } catch {
    return { status: res.status, data: text.substring(0, 200) }
  }
}

async function tryTimeslotsWithUuid(orgId: number, typeId: number, uuid: string): Promise<any> {
  const now = new Date()
  const from = now.toISOString()
  const to = new Date(now.getTime() + 14 * 86400000).toISOString()
  const url = `${BASE}/v3/timeslots/org/${orgId}/available/list?from=${from}&to=${to}&type=${typeId}&provider=${uuid}&count=5&page=1`
  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
  })
  const text = await res.text()
  try {
    return { status: res.status, data: JSON.parse(text) }
  } catch {
    return { status: res.status, data: text.substring(0, 200) }
  }
}

async function main() {
  const orgs = [
    { name: 'Loyal Medical', orgId: 1558, typeId: 24862 },
    { name: 'Choice Medical', orgId: 5709, typeId: 33788 },
    { name: 'Denman Medical', orgId: 6555, typeId: 53892 },
    { name: 'Georgia Medical', orgId: 4753, typeId: 37732 },
    { name: 'Manna Clinic', orgId: 3041, typeId: 11190 },
  ]

  for (const org of orgs) {
    console.log(`\n=== ${org.name} (orgId=${org.orgId}, typeId=${org.typeId}) ===`)

    // 1. Get practitioners
    const practitioners = await getPractitioners(org.orgId)
    console.log(`  Found ${practitioners.length} practitioners`)

    // Filter to doctors/physicians
    const doctors = practitioners.filter(p =>
      p.occupation?.toLowerCase().includes('physician') ||
      p.occupation?.toLowerCase().includes('doctor') ||
      p.occupation?.toLowerCase().includes('nurse practitioner')
    )
    console.log(`  Doctors/NPs: ${doctors.map(d => `${d.first_name} ${d.last_name} (id=${d.id}, ${d.occupation})`).join(', ')}`)

    // 2. Try without provider first
    console.log(`\n  Without provider:`)
    const noProvider = await tryTimeslotsWithoutProvider(org.orgId, org.typeId)
    console.log(`    Status ${noProvider.status}: ${JSON.stringify(noProvider.data).substring(0, 200)}`)

    // 3. Try with real practitioner IDs
    console.log(`\n  With practitioner IDs:`)
    for (const doc of doctors.slice(0, 5)) {
      const result = await tryTimeslots(org.orgId, org.typeId, doc.id)
      const slots = result.data?.items?.length || 0
      console.log(`    provider=${doc.id} (${doc.first_name} ${doc.last_name}): ${result.status} → ${slots} slots`)
      if (slots > 0) {
        console.log(`      First: ${result.data.items[0].starts_at}`)
      }
    }

    // 4. Try with UUIDs too
    console.log(`\n  With UUIDs:`)
    for (const doc of doctors.slice(0, 3)) {
      const result = await tryTimeslotsWithUuid(org.orgId, org.typeId, doc.uuid)
      console.log(`    uuid=${doc.uuid}: ${result.status} → ${JSON.stringify(result.data).substring(0, 150)}`)
    }

    await sleep(500)
  }
}

main()
