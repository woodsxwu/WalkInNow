/**
 * Discover Medeo provider IDs by scraping patient booking pages
 * and testing the timeslots API with discovered practitioner IDs
 */

const KEY = 'c193fd4eb7624bba8c4af5b5cf0ae7eb'
const BASE = 'https://api-ca.medeohealth.com'

const orgs = [
  { name: 'Denman', orgId: 6555, typeId: 53892, slug: 'denman-medical-centre' },
  { name: 'Georgia', orgId: 4753, typeId: 37916, slug: 'georgia-medical-clinic' },
  { name: 'Manna', orgId: 3041, typeId: 11190, slug: 'manna-vancouver' },
  { name: 'Ashton', orgId: 4521, typeId: 50517, slug: 'ashton-medical' },
  { name: 'Kariba', orgId: 5115, typeId: 20061, slug: 'kariba-health' },
  { name: 'WELL-CentralCity', orgId: 6777, typeId: 37732, slug: 'the-health-clinic-by-shoppers-9610' },
  { name: 'WELL-Evergreen', orgId: 6780, typeId: 37729, slug: 'the-health-clinic-by-shoppers-9611' },
  { name: 'WELL-CedarHills', orgId: 6778, typeId: 37731, slug: 'the-health-clinic-by-shoppers-9613' },
  { name: 'WELL-Nordel', orgId: 6768, typeId: 37730, slug: 'the-health-clinic-by-shoppers-9612' },
  { name: 'PrimeCare', orgId: 5800, typeId: 26902, slug: 'primecare-medical' },
  { name: 'Mahogany', orgId: 5755, typeId: 23951, slug: 'british-columbia-office-7ca2e12d-1b12-42a9-97f1-13e803043430' },
  { name: 'FamilyPractice', orgId: 6656, typeId: 53038, slug: 'family-practice-clinic' },
  { name: 'CarePoint', orgId: 4890, typeId: 20661, slug: 'care-point-medical-centre-new-westminster' },
  { name: 'Windermere', orgId: 2608, typeId: 14921, slug: 'windermere-medical-clinic-d834ea0d-27e8-4b86-b920-5320477f818e' },
  { name: 'Hygiea', orgId: 2830, typeId: 18497, slug: 'hygiea-medical-clinic' },
  { name: 'NorthShore', orgId: 2064, typeId: 25769, slug: 'north-shore-medical-group' },
  { name: 'Pier', orgId: 6786, typeId: 36616, slug: 'pier-medical-clinic' },
  { name: 'WalnutGrove', orgId: 5086, typeId: 36345, slug: 'walnut-grove-medical' },
]

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function getPractitioners(orgId: number): Promise<any[]> {
  const res = await fetch(`${BASE}/v3/org/${orgId}/practitioners`, {
    headers: { 'Ocp-Apim-Subscription-Key': KEY },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.items || []
}

async function tryWithProvider(orgId: number, typeId: number, providerId: number): Promise<{ ok: boolean; slots: number; first?: string }> {
  const from = '2026-03-02T11:00:00.000-08:00'
  const to = '2026-03-09T23:59:59.999-08:00'
  const url = `${BASE}/v3/timeslots/org/${orgId}/available/list?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&type=${typeId}&provider=${providerId}&count=1&page=1`
  const res = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': KEY },
  })
  if (!res.ok) return { ok: false, slots: 0 }
  const data = await res.json()
  return {
    ok: true,
    slots: data.totalItems || 0,
    first: data.items?.[0]?.starts_at,
  }
}

async function scrapBookingPage(slug: string): Promise<number[]> {
  try {
    const res = await fetch(`https://patient.medeohealth.com/booking/${slug}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) return []
    const html = await res.text()

    // Look for provider/practitioner IDs in the page
    const ids: number[] = []
    const patterns = [
      /provider[_\-]?[Ii]d['":\s]+(\d+)/g,
      /practitioner[_\-]?[Ii]d['":\s]+(\d+)/g,
      /"id"\s*:\s*(\d+)/g,
    ]
    for (const p of patterns) {
      let m
      while ((m = p.exec(html)) !== null) {
        const id = parseInt(m[1])
        if (id > 100 && !ids.includes(id)) ids.push(id)
      }
    }
    return ids
  } catch {
    return []
  }
}

async function main() {
  const results: Record<string, { providerId: number; slots: number }[]> = {}

  for (const org of orgs) {
    console.log(`\n=== ${org.name} (org=${org.orgId}, type=${org.typeId}) ===`)

    // 1. Get practitioners from API
    const practitioners = await getPractitioners(org.orgId)
    const practIds = practitioners.map((p: any) => p.id)
    console.log(`  Practitioners API: ${practitioners.length} (IDs: ${practIds.slice(0, 10).join(', ')}${practIds.length > 10 ? '...' : ''})`)

    // 2. Try to scrape booking page
    const scrapedIds = await scrapBookingPage(org.slug)
    if (scrapedIds.length > 0) {
      console.log(`  Scraped from booking page: ${scrapedIds.join(', ')}`)
    }

    // 3. Combine all IDs and test
    const allIds = [...new Set([...practIds, ...scrapedIds])]
    const working: { providerId: number; slots: number }[] = []

    for (const pid of allIds) {
      const result = await tryWithProvider(org.orgId, org.typeId, pid)
      if (result.ok) {
        console.log(`  ✓ provider=${pid}: ${result.slots} slots${result.first ? `, first=${result.first}` : ''}`)
        working.push({ providerId: pid, slots: result.slots })
      }
    }

    if (working.length === 0) {
      console.log(`  ✗ No working provider found`)
    }

    results[org.name] = working
    await sleep(300)
  }

  // Summary
  console.log('\n\n=== SUMMARY ===')
  for (const [name, providers] of Object.entries(results)) {
    const org = orgs.find(o => o.name === name)!
    if (providers.length > 0) {
      const bestProvider = providers.sort((a, b) => b.slots - a.slots)[0]
      console.log(`✓ ${name}: provider=${bestProvider.providerId} (${bestProvider.slots} slots) [orgId=${org.orgId}, typeId=${org.typeId}]`)
    } else {
      console.log(`✗ ${name}: no provider found [orgId=${org.orgId}, typeId=${org.typeId}]`)
    }
  }
}

main()
