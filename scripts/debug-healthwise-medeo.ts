/**
 * Debug Healthwise (Cortico) and Medeo API issues
 */

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function debugHealthwise() {
  console.log('=== Scraping Healthwise booking page for correct slugs ===\n')

  // Check different healthwise locations
  const locations = ['caulfeild-medical-clinic', 'orca-medical-clinic', 'garden-medical-clinic', 'coal-harbour-health-centre', 'mount-seymour-medical-clinic']

  // First, scrape the main booking page
  try {
    const res = await fetch('https://healthwise.cortico.ca/book/', {
      headers: { 'User-Agent': 'WalkInNow/1.0' },
    })
    const html = await res.text()

    // Find all slugs
    const slugs = new Set<string>()
    for (const match of html.matchAll(/link="\/book\/([^"\/]+)\/"/g)) slugs.add(match[1])
    for (const match of html.matchAll(/href="\/book\/([^"\/]+)\/"/g)) slugs.add(match[1])
    console.log(`Booking page slugs: [${[...slugs].join(', ')}]`)

    // Also check location pages
    for (const loc of locations) {
      try {
        const locRes = await fetch(`https://healthwise.cortico.ca/book/?location=${loc}`, {
          headers: { 'User-Agent': 'WalkInNow/1.0' },
        })
        const locHtml = await locRes.text()
        const locSlugs = new Set<string>()
        for (const match of locHtml.matchAll(/link="\/book\/([^"\/]+)\/"/g)) locSlugs.add(match[1])
        for (const match of locHtml.matchAll(/href="\/book\/([^"\/]+)\/"/g)) locSlugs.add(match[1])
        console.log(`  ${loc}: [${[...locSlugs].join(', ')}]`)
      } catch (e: any) {
        console.log(`  ${loc}: fetch error: ${e.message}`)
      }
    }
  } catch (e: any) {
    console.log(`Booking page error: ${e.message}`)
  }

  // Test common walk-in slugs against healthwise PIDs
  console.log('\nTesting slugs against healthwise PIDs...')
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dow = tomorrow.getDay()
  if (dow === 0) tomorrow.setDate(tomorrow.getDate() + 1)
  if (dow === 6) tomorrow.setDate(tomorrow.getDate() + 2)
  const dateStr = formatDate(tomorrow)

  const testSlugs = ['walk-in-clinic', 'walk-in', 'walkin', 'same-day', 'first-available-walk-in', 'same-day-appointment', 'walk-in---in-person']
  const testPids = [114, 132, 153]

  for (const slug of testSlugs) {
    for (const pid of testPids) {
      const url = `https://healthwise.cortico.ca/api/async/available-appointment-slots/${pid}/${dateStr}/${slug}/?location=caulfeild-medical-clinic`
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'WalkInNow/1.0' } })
        if (res.ok) {
          const data = await res.json()
          const dayData = data[dateStr]
          const total = (dayData?.clinic_slots?.length || 0) + (dayData?.video_slots?.length || 0) + (dayData?.phone_slots?.length || 0)
          console.log(`  ✓ slug="${slug}" pid=${pid}: ${res.status} (${total} slots)`)
        } else if (res.status !== 400) {
          console.log(`  ? slug="${slug}" pid=${pid}: ${res.status}`)
        }
      } catch {}
    }
  }
}

async function debugMedeo() {
  console.log('\n=== Debugging Medeo API - finding providers ===\n')

  const MEDEO_API_KEY = process.env.MEDEO_API_KEY || 'c193fd4eb7624bba8c4af5b5cf0ae7eb'

  // Try listing providers for an org
  const testOrgIds = [6555, 6777, 3041]

  for (const orgId of testOrgIds) {
    // Try the providers endpoint
    const providersUrl = `https://api-ca.medeohealth.com/v3/providers/org/${orgId}/list`
    console.log(`[org ${orgId}] Trying providers list...`)
    try {
      const res = await fetch(providersUrl, {
        headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
      })
      console.log(`  Status: ${res.status}`)
      if (res.ok) {
        const data = await res.json()
        console.log(`  Providers: ${JSON.stringify(data).substring(0, 500)}`)
      } else {
        const text = await res.text()
        console.log(`  Error: ${text.substring(0, 200)}`)
      }
    } catch (e: any) {
      console.log(`  Error: ${e.message}`)
    }

    // Try without type filter
    const now = new Date()
    const from = now.toISOString()
    const to = new Date(now.getTime() + 14 * 86400000).toISOString()

    const noTypeUrl = `https://api-ca.medeohealth.com/v3/timeslots/org/${orgId}/available/list?from=${from}&to=${to}&count=1&page=1`
    console.log(`  Trying without type filter...`)
    try {
      const res = await fetch(noTypeUrl, {
        headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
      })
      console.log(`  Status: ${res.status}`)
      if (res.ok) {
        const data = await res.json()
        console.log(`  Items: ${data.items?.length || 0}`)
        if (data.items?.length > 0) {
          console.log(`  First: ${JSON.stringify(data.items[0])}`)
        }
      } else {
        const text = await res.text()
        console.log(`  Error: ${text.substring(0, 200)}`)
      }
    } catch (e: any) {
      console.log(`  Error: ${e.message}`)
    }

    // Try the v2 endpoint
    const v2Url = `https://api-ca.medeohealth.com/v2/timeslots/org/${orgId}/available/list?from=${from}&to=${to}&count=1&page=1`
    console.log(`  Trying v2 endpoint...`)
    try {
      const res = await fetch(v2Url, {
        headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
      })
      console.log(`  Status: ${res.status}`)
      if (res.ok) {
        const data = await res.json()
        console.log(`  Items: ${data.items?.length || 0}`)
        if (data.items?.length > 0) {
          console.log(`  First: ${JSON.stringify(data.items[0]).substring(0, 200)}`)
        }
      } else {
        const text = await res.text()
        console.log(`  Error: ${text.substring(0, 200)}`)
      }
    } catch (e: any) {
      console.log(`  Error: ${e.message}`)
    }

    console.log()
  }

  // Also test one of the working orgs for comparison
  console.log('Testing a WORKING Medeo org for comparison...')
  const workingOrgs = [1558, 5709] // Loyal Medical, Choice Medical
  for (const orgId of workingOrgs) {
    const now = new Date()
    const from = now.toISOString()
    const to = new Date(now.getTime() + 14 * 86400000).toISOString()
    const url = `https://api-ca.medeohealth.com/v3/timeslots/org/${orgId}/available/list?from=${from}&to=${to}&count=1&page=1`
    try {
      const res = await fetch(url, {
        headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
      })
      if (res.ok) {
        const data = await res.json()
        console.log(`  [org ${orgId}] Working: ${data.items?.length || 0} items`)
      } else {
        const text = await res.text()
        console.log(`  [org ${orgId}] Status ${res.status}: ${text.substring(0, 200)}`)
      }
    } catch (e: any) {
      console.log(`  [org ${orgId}] Error: ${e.message}`)
    }
  }
}

async function main() {
  await debugHealthwise()
  await debugMedeo()
}

main()
