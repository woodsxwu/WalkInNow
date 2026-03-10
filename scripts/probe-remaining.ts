/**
 * Probe remaining Cortico clinics with correct slugs
 */

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const PROBE_PIDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 19, 20, 24, 25, 27, 30, 35, 39, 41, 42, 43, 45, 47, 49, 50, 51, 57, 60, 70, 72, 79, 82, 85, 88, 100, 103, 104, 105, 112, 114, 116, 120, 123, 125, 127, 130, 132, 134, 137, 148, 150, 153, 159, 160, 164, 165, 168, 173, 175, 200, 205, 210, 217, 222, 232, 238, 239, 240, 242, 249, 250]

async function probe(subdomain: string, slug: string, dateStr: string, location?: string): Promise<{pid: number, slug: string} | null> {
  for (let i = 0; i < PROBE_PIDS.length; i += 15) {
    const batch = PROBE_PIDS.slice(i, i + 15)
    const results = await Promise.all(
      batch.map(async (pid) => {
        const locParam = location ? `?location=${location}` : ''
        const url = `https://${subdomain}.cortico.ca/api/async/available-appointment-slots/${pid}/${dateStr}/${slug}/${locParam}`
        try {
          const res = await fetch(url, { headers: { 'User-Agent': 'WalkInNow/1.0' } })
          return { pid, ok: res.ok }
        } catch {
          return { pid, ok: false }
        }
      })
    )
    const hit = results.find(r => r.ok)
    if (hit) return { pid: hit.pid, slug }
  }
  return null
}

async function main() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dow = tomorrow.getDay()
  if (dow === 0) tomorrow.setDate(tomorrow.getDate() + 1)
  if (dow === 6) tomorrow.setDate(tomorrow.getDate() + 2)
  const dateStr = formatDate(tomorrow)

  console.log(`Using date: ${dateStr}\n`)

  // 1. Clinics that redirect to /book/family-doctor
  console.log('=== Testing family-doctor slug ===')
  const familyDoctorClinics = [
    'commercialdrivemedical', 'granvillemedical', 'frasercare',
    'maywoodmedical', 'focusmed', 'rockypoint',
  ]

  for (const sd of familyDoctorClinics) {
    const result = await probe(sd, 'family-doctor', dateStr)
    if (result) {
      console.log(`  ✓ ${sd}: PID=${result.pid} with family-doctor`)
    } else {
      console.log(`  ✗ ${sd}: no PIDs found with family-doctor`)
    }
  }

  // 2. Multi-location clinics - try to find their locations via API
  console.log('\n=== Testing multi-location clinics ===')
  const multiLoc = [
    { sd: 'vycare', locs: ['kingsway', 'broadway', 'brentwood'] },
    { sd: 'ihealthmd', locs: [] },
    { sd: 'imeburnaby', locs: ['burnaby'] },
    { sd: 'elicarerichmond', locs: ['richmond'] },
    { sd: 'elicarelougheed', locs: ['lougheed'] },
    { sd: 'wellhealth', locs: ['richmond'] },
    { sd: 'megafuclinic', locs: [] },
    { sd: 'drsheikprimacy', locs: [] },
    { sd: 'vivacare', locs: [] },
  ]

  const slugsToTry = ['walk-in-clinic', 'walk-in', 'family-doctor', 'specific-doctor-walk-in', 'same-day', 'first-available-walk-in']

  for (const { sd, locs } of multiLoc) {
    let found = false
    // Try without location first
    for (const slug of slugsToTry) {
      const result = await probe(sd, slug, dateStr)
      if (result) {
        console.log(`  ✓ ${sd}: PID=${result.pid} with ${slug} (no location)`)
        found = true
        break
      }
    }
    // Try with locations
    if (!found && locs.length > 0) {
      for (const loc of locs) {
        for (const slug of slugsToTry) {
          const result = await probe(sd, slug, dateStr, loc)
          if (result) {
            console.log(`  ✓ ${sd}: PID=${result.pid} with ${slug} (location=${loc})`)
            found = true
            break
          }
        }
        if (found) break
      }
    }
    if (!found) {
      console.log(`  ✗ ${sd}: nothing found`)
    }
  }

  // 3. Other clinics with booking pages but no PIDs
  console.log('\n=== Testing remaining clinics ===')
  const remaining = [
    { sd: 'fivepoints', slugs: ['family-doctor', 'prescription-refill', 'walk-in', 'walk-in-clinic'] },
    { sd: 'connectmd', slugs: ['in-person-visit', 'family-doctor', 'walk-in-clinic', 'walk-in'] },
    { sd: 'wellhealthgrandview', slugs: ['same-day-appointment-dr-ho', 'same-day', 'walk-in', 'family-doctor'] },
    { sd: 'gardencitymed', slugs: ['drivers-medical-exam-walk-in', 'walk-in', 'family-doctor', 'same-day'] },
    { sd: 'thrivemedical', slugs: ['walk-in', 'walk-in-clinic', 'family-doctor', 'same-day'] },
    { sd: 'pacificheights', slugs: ['same-day', 'walk-in', 'family-doctor', 'walk-in-clinic'] },
    { sd: 'healthwise', slugs: ['walk-in', 'walk-in-clinic', 'family-doctor', 'same-day'] },
  ]

  for (const { sd, slugs } of remaining) {
    let found = false
    for (const slug of slugs) {
      const result = await probe(sd, slug, dateStr)
      if (result) {
        console.log(`  ✓ ${sd}: PID=${result.pid} with ${slug}`)
        found = true
        break
      }
    }
    if (!found) {
      console.log(`  ✗ ${sd}: nothing found`)
    }
  }
}

main()
