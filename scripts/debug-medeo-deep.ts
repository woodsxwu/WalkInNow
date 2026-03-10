/**
 * Deep debug Medeo API - understand the provider requirement
 */

const MEDEO_API_KEY = process.env.MEDEO_API_KEY || 'c193fd4eb7624bba8c4af5b5cf0ae7eb'
const BASE = 'https://api-ca.medeohealth.com'

async function tryUrl(label: string, url: string) {
  try {
    const res = await fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
    })
    if (res.ok) {
      const data = await res.json()
      const items = data.items || data
      const count = Array.isArray(items) ? items.length : 'N/A'
      console.log(`  ${label}: ${res.status} (${count} items)`)
      if (Array.isArray(items) && items.length > 0) {
        console.log(`    First: ${JSON.stringify(items[0]).substring(0, 300)}`)
      }
      return data
    } else {
      const text = await res.text()
      console.log(`  ${label}: ${res.status} - ${text.substring(0, 200)}`)
      return null
    }
  } catch (e: any) {
    console.log(`  ${label}: Error - ${e.message}`)
    return null
  }
}

async function main() {
  const now = new Date()
  const from = now.toISOString()
  const to = new Date(now.getTime() + 14 * 86400000).toISOString()

  // Working org: Loyal Medical (1558, typeId=24862)
  console.log('=== Working org: Loyal Medical (1558) ===')
  await tryUrl('With type', `${BASE}/v3/timeslots/org/1558/available/list?from=${from}&to=${to}&type=24862&count=5&page=1`)

  // Failing org: Denman Medical (6555, typeId=53892)
  console.log('\n=== Failing org: Denman Medical (6555) ===')
  await tryUrl('With type', `${BASE}/v3/timeslots/org/6555/available/list?from=${from}&to=${to}&type=53892&count=5&page=1`)

  // Try to discover practitioner IDs
  console.log('\n=== Trying practitioner endpoints ===')
  // Try common Medeo endpoints to list practitioners
  for (const orgId of [6555, 1558]) {
    await tryUrl(`practitioners org=${orgId}`, `${BASE}/v3/practitioners?orgId=${orgId}`)
    await tryUrl(`practitioners org=${orgId}`, `${BASE}/v3/organizations/${orgId}/practitioners`)
    await tryUrl(`org info ${orgId}`, `${BASE}/v3/organizations/${orgId}`)
  }

  // Try adding provider param to the failing org
  console.log('\n=== Trying with provider param on failing org ===')
  for (const pid of [1, 2, 3, 4, 5, 10, 20]) {
    await tryUrl(`org=6555 provider=${pid}`, `${BASE}/v3/timeslots/org/6555/available/list?from=${from}&to=${to}&type=53892&provider=${pid}&count=5&page=1`)
  }

  // Check the Medeo patient booking page to understand the flow
  console.log('\n=== Checking Medeo booking pages ===')
  for (const slug of ['denman-medical-centre', 'loyal-medical-clinic']) {
    try {
      const res = await fetch(`https://patient.medeohealth.com/booking/${slug}`, {
        headers: { 'User-Agent': 'WalkInNow/1.0' },
        redirect: 'follow',
      })
      console.log(`  ${slug}: ${res.status} (${res.url})`)
      const html = await res.text()
      // Look for org/provider IDs in the page
      const orgMatches = html.match(/orgId['":\s]+(\d+)/g)
      const provMatches = html.match(/providerId['":\s]+(\d+)/g)
      const typeMatches = html.match(/typeId['":\s]+(\d+)/g)
      if (orgMatches) console.log(`    orgIds: ${orgMatches.join(', ')}`)
      if (provMatches) console.log(`    providerIds: ${provMatches.join(', ')}`)
      if (typeMatches) console.log(`    typeIds: ${typeMatches.join(', ')}`)
    } catch (e: any) {
      console.log(`  ${slug}: ${e.message}`)
    }
  }
}

main()
