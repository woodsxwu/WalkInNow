/**
 * Fix all broken API connections:
 * 1. Medeo - reverse-engineer practitioner/provider discovery
 * 2. Undiscoverable Cortico - exhaustive slug+pid probing
 * 3. Healthwise - find correct walk-in slug
 */

const MEDEO_API_KEY = process.env.MEDEO_API_KEY || 'c193fd4eb7624bba8c4af5b5cf0ae7eb'

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ============ MEDEO ============

async function fixMedeo() {
  console.log('========================================')
  console.log('MEDEO: Reverse-engineering provider param')
  console.log('========================================\n')

  const now = new Date()
  const from = now.toISOString()
  const to = new Date(now.getTime() + 14 * 86400000).toISOString()

  // Test orgs - mix of failing and working
  const orgs = [
    { name: 'Loyal Medical (working)', orgId: 1558, typeId: 24862 },
    { name: 'Choice Medical (working)', orgId: 5709, typeId: 33788 },
    { name: 'Elicare Lansdowne (working)', orgId: 4526, typeId: 36074 },
    { name: 'Denman Medical', orgId: 6555, typeId: 53892 },
    { name: 'Georgia Medical', orgId: 4753, typeId: 37732 },
    { name: 'Manna Clinic', orgId: 3041, typeId: 11190 },
  ]

  for (const org of orgs) {
    console.log(`[${org.name}] orgId=${org.orgId}, typeId=${org.typeId}`)

    // 1. Try the patient booking page to extract practitioner info
    const slugs = [
      org.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    ]

    // 2. Try the timeslots endpoint with various provider IDs
    let found = false
    for (const pid of [1, 2, 3, 4, 5, 10, 15, 20, 50, 100]) {
      const url = `https://api-ca.medeohealth.com/v3/timeslots/org/${org.orgId}/available/list?from=${from}&to=${to}&type=${org.typeId}&provider=${pid}&count=1&page=1`
      try {
        const res = await fetch(url, {
          headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
        })
        if (res.ok) {
          const data = await res.json()
          console.log(`  provider=${pid}: ${res.status} → ${data.items?.length || 0} items`)
          if (data.items?.length > 0) {
            console.log(`    First slot: ${data.items[0].starts_at}`)
            found = true
          }
        } else {
          const text = await res.text()
          if (!text.includes('Provider must be specified')) {
            console.log(`  provider=${pid}: ${res.status} → ${text.substring(0, 100)}`)
          }
        }
      } catch {}
    }

    if (!found) {
      // 3. Try fetching the patient portal API to get practitioner list
      try {
        // Try multiple possible endpoints for listing practitioners
        for (const endpoint of [
          `https://api-ca.medeohealth.com/v3/practitioners/org/${org.orgId}/list`,
          `https://api-ca.medeohealth.com/v3/org/${org.orgId}/practitioners`,
          `https://api-ca.medeohealth.com/v3/timeslots/org/${org.orgId}/practitioners`,
          `https://api-ca.medeohealth.com/v3/booking/org/${org.orgId}`,
          `https://api-ca.medeohealth.com/v3/booking/${org.orgId}/providers`,
        ]) {
          const res = await fetch(endpoint, {
            headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
          })
          if (res.ok) {
            const data = await res.json()
            console.log(`  Endpoint ${endpoint}: ${JSON.stringify(data).substring(0, 300)}`)
            found = true
            break
          }
        }
      } catch {}
    }

    if (!found) {
      // 4. Try the patient-facing booking embed
      try {
        const bookingUrl = `https://patient.medeohealth.com/api/v1/organizations/${org.orgId}/booking`
        const res = await fetch(bookingUrl, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'WalkInNow/1.0' },
        })
        if (res.ok) {
          const data = await res.json()
          console.log(`  Patient API: ${JSON.stringify(data).substring(0, 400)}`)
        } else {
          // Try without /booking
          const res2 = await fetch(`https://patient.medeohealth.com/api/v1/organizations/${org.orgId}`, {
            headers: { 'Accept': 'application/json' },
          })
          if (res2.ok) {
            const data2 = await res2.json()
            console.log(`  Patient API org: ${JSON.stringify(data2).substring(0, 400)}`)
          }
        }
      } catch {}
    }

    if (!found) console.log(`  No working approach found`)
    console.log()
  }
}

// ============ CORTICO UNDISCOVERABLE ============

async function fixUndiscoverableCortico() {
  console.log('\n========================================')
  console.log('CORTICO: Exhaustive probing for undiscovered')
  console.log('========================================\n')

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dow = tomorrow.getDay()
  if (dow === 0) tomorrow.setDate(tomorrow.getDate() + 1)
  if (dow === 6) tomorrow.setDate(tomorrow.getDate() + 2)
  const dateStr = formatDate(tomorrow)

  // All possible slugs to try - including non-walk-in ones
  const ALL_SLUGS = [
    'walk-in-clinic', 'walk-in', 'walkin', 'family-doctor',
    'specific-doctor-walk-in', 'same-day', 'first-available-walk-in',
    'same-day-appointment', 'walk-in---in-person', 'in-person-visit',
    'urgent', 'drop-in', 'appointment', 'book-appointment',
    'nurse-practitioner', 'np-appointment', 'telehealth', 'phone-visit',
    'virtual-walk-in', 'virtual', 'video-visit',
  ]

  const SAMPLE_PIDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 19, 20, 25, 30, 35, 40, 45, 50]

  const undiscovered = [
    'commercialdrivemedical', 'connectmd', 'fivepoints',
    'gardencitymed', 'ihealthmd', 'imeburnaby',
    'elicarelougheed', 'pacificheights', 'rockypoint',
    'vivacare', 'vycare', 'wellhealth', 'wellhealthgrandview',
    'tlc', 'royalcolumbia',
  ]

  for (const sd of undiscovered) {
    let found = false

    for (const slug of ALL_SLUGS) {
      // Test a batch of PIDs
      const results = await Promise.all(
        SAMPLE_PIDS.map(async (pid) => {
          const url = `https://${sd}.cortico.ca/api/async/available-appointment-slots/${pid}/${dateStr}/${slug}/`
          try {
            const res = await fetch(url, { headers: { 'User-Agent': 'WalkInNow/1.0' } })
            return { pid, ok: res.ok }
          } catch {
            return { pid, ok: false }
          }
        })
      )

      const hit = results.find(r => r.ok)
      if (hit) {
        console.log(`  ✓ ${sd}: PID=${hit.pid} with "${slug}"`)
        found = true
        break
      }
      await sleep(100)
    }

    if (!found) {
      console.log(`  ✗ ${sd}: exhausted all slugs`)
    }
  }
}

// ============ HEALTHWISE ============

async function fixHealthwise() {
  console.log('\n========================================')
  console.log('HEALTHWISE: Finding correct walk-in slug')
  console.log('========================================\n')

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dow = tomorrow.getDay()
  if (dow === 0) tomorrow.setDate(tomorrow.getDate() + 1)
  if (dow === 6) tomorrow.setDate(tomorrow.getDate() + 2)
  const dateStr = formatDate(tomorrow)

  const ALL_SLUGS = [
    'walk-in-clinic', 'walk-in', 'walkin', 'family-doctor',
    'specific-doctor-walk-in', 'same-day', 'first-available-walk-in',
    'same-day-appointment', 'walk-in---in-person', 'in-person-visit',
    'urgent', 'drop-in', 'appointment', 'book-appointment',
    'nurse-practitioner', 'np-appointment', 'telehealth',
    'virtual-walk-in', 'virtual', 'video-visit', 'phone-visit',
  ]

  // Known Healthwise PIDs: 114, 132, 153
  // Known locations: caulfeild-medical-clinic, orca-medical-clinic, garden-medical-clinic, coal-harbour-health-centre, mount-seymour-medical-clinic
  const pids = [114, 132, 153]
  const locations = ['caulfeild-medical-clinic', 'orca-medical-clinic', 'garden-medical-clinic', 'coal-harbour-health-centre', 'mount-seymour-medical-clinic']

  // Also try with MORE PIDs in case the known ones don't match the right workflow
  const morePids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]

  for (const loc of locations) {
    let found = false
    console.log(`Location: ${loc}`)

    for (const slug of ALL_SLUGS) {
      for (const pid of [...pids, ...morePids]) {
        const url = `https://healthwise.cortico.ca/api/async/available-appointment-slots/${pid}/${dateStr}/${slug}/?location=${loc}`
        try {
          const res = await fetch(url, { headers: { 'User-Agent': 'WalkInNow/1.0' } })
          if (res.ok) {
            console.log(`  ✓ PID=${pid} slug="${slug}": ${res.status}`)
            found = true
            break
          }
        } catch {}
      }
      if (found) break
    }

    if (!found) console.log(`  ✗ No working combo found`)
  }
}

async function main() {
  await fixMedeo()
  await fixHealthwise()
  await fixUndiscoverableCortico()
}

main()
