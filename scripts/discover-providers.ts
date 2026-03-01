/**
 * Discover valid provider IDs for each Cortico clinic subdomain.
 *
 * Three-phase discovery:
 *   Phase 1: Scrape each clinic's /book/ page to find appointment type slugs
 *   Phase 2: Quick probe - for unknown subdomains, test a few sample PIDs against common slugs
 *   Phase 3: Full scan - only scan with confirmed-working slugs, one subdomain at a time
 *
 * Results are saved to scripts/discovered-providers.json
 *
 * Usage:
 *   npx tsx scripts/discover-providers.ts           # full discovery
 *   npx tsx scripts/discover-providers.ts --resume   # only scan subdomains not yet in results
 */

import { CLINICS, getUniqueSubdomains } from './clinics-config'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const MAX_PROVIDER_ID = 300
const CONCURRENCY = 10
const DELAY_BETWEEN_BATCHES_MS = 300
const DELAY_BETWEEN_SUBDOMAINS_MS = 1000

// Common walk-in slugs across clinics
const COMMON_SLUGS = [
  'walk-in-clinic',
  'walk-in',
  'walkin',
  'specific-doctor-walk-in',
  'same-day',
  'walk-in---in-person',
  'first-available-walk-in',
  'same-day-appointment',
  'walk-inn',
  'in-person-visit',
]

// Sample PIDs to test during quick probe (covers typical ranges)
const PROBE_PIDS = [1, 2, 5, 9, 10, 12, 15, 16, 19, 20, 24, 25, 27, 30, 39, 41, 42, 43, 45, 47, 49, 50, 51, 57, 70, 72, 79, 82, 85, 88, 100, 103, 104, 105, 112, 114, 116, 123, 125, 127, 134, 150, 168, 200, 205, 210, 217, 222, 232, 238, 239, 240, 242, 249, 250]

interface DiscoveredProvider {
  subdomain: string
  providerId: number
  locationSlugs: string[]
  appointmentSlug: string
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function testProviderId(
  subdomain: string,
  providerId: number,
  date: string,
  appointmentSlug: string,
  locationSlug?: string
): Promise<boolean> {
  const locationParam = locationSlug ? `?location=${locationSlug}` : ''
  const url = `https://${subdomain}.cortico.ca/api/async/available-appointment-slots/${providerId}/${date}/${appointmentSlug}/${locationParam}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WalkInNow/1.0' },
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

/**
 * Phase 1: Scrape the booking page HTML for appointment type slugs.
 */
async function scrapeBookingPageSlugs(subdomain: string): Promise<string[]> {
  const url = `https://${subdomain}.cortico.ca/book/`
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WalkInNow/1.0' },
    })
    clearTimeout(timeout)
    if (!response.ok) return []

    const html = await response.text()

    const allSlugs = new Set<string>()
    for (const match of html.matchAll(/link="\/book\/([^"\/]+)\/"/g)) allSlugs.add(match[1])
    for (const match of html.matchAll(/href="\/book\/([^"\/]+)\/"/g)) allSlugs.add(match[1])

    // Prioritize walk-in related slugs
    const walkInKeywords = ['walk-in', 'walkin', 'walk_in', 'same-day', 'urgent', 'drop-in']
    const walkInSlugs = [...allSlugs].filter((slug) =>
      walkInKeywords.some((kw) => slug.toLowerCase().includes(kw))
    )
    return walkInSlugs.length > 0 ? walkInSlugs : [...allSlugs]
  } catch {
    return []
  }
}

/**
 * Phase 2: Quick probe - try sample PIDs against slugs to find which slug works.
 * Returns the first working slug (or empty if none work).
 */
async function quickProbe(
  subdomain: string,
  slugsToTry: string[],
  locationSlugs: string[],
  date: string
): Promise<{ slug: string; samplePid: number } | null> {
  for (const slug of slugsToTry) {
    // Test a batch of sample PIDs at once
    for (let i = 0; i < PROBE_PIDS.length; i += CONCURRENCY) {
      const batch = PROBE_PIDS.slice(i, i + CONCURRENCY)
      const results = await Promise.all(
        batch.map(async (pid) => {
          let ok = await testProviderId(subdomain, pid, date, slug)
          if (!ok && locationSlugs.length > 0) {
            for (const loc of locationSlugs) {
              ok = await testProviderId(subdomain, pid, date, slug, loc)
              if (ok) break
            }
          }
          return { pid, ok }
        })
      )
      const hit = results.find((r) => r.ok)
      if (hit) return { slug, samplePid: hit.pid }
      await sleep(200)
    }
  }
  return null
}

/**
 * Phase 3: Full scan of provider IDs 1-MAX for a confirmed working slug.
 */
async function fullScan(
  subdomain: string,
  appointmentSlug: string,
  locationSlugs: string[],
  date: string
): Promise<DiscoveredProvider[]> {
  const discovered: DiscoveredProvider[] = []
  const allPids = Array.from({ length: MAX_PROVIDER_ID }, (_, i) => i + 1)

  for (let i = 0; i < allPids.length; i += CONCURRENCY) {
    const batch = allPids.slice(i, i + CONCURRENCY)
    if (i > 0) await sleep(DELAY_BETWEEN_BATCHES_MS)

    const results = await Promise.all(
      batch.map(async (pid) => {
        let ok = await testProviderId(subdomain, pid, date, appointmentSlug)
        if (!ok && locationSlugs.length > 0) {
          for (const loc of locationSlugs) {
            ok = await testProviderId(subdomain, pid, date, appointmentSlug, loc)
            if (ok) break
          }
        }
        return { pid, ok }
      })
    )

    for (const { pid, ok } of results) {
      if (!ok) continue

      // Determine which location slugs work for this PID
      const validLocs: string[] = []
      if (locationSlugs.length > 0) {
        for (const loc of locationSlugs) {
          if (await testProviderId(subdomain, pid, date, appointmentSlug, loc)) {
            validLocs.push(loc)
          }
        }
      }

      discovered.push({
        subdomain,
        providerId: pid,
        locationSlugs: validLocs,
        appointmentSlug,
      })
      console.log(
        `    ✓ PID=${pid}` +
          (validLocs.length > 0 ? ` locations=[${validLocs.join(', ')}]` : '')
      )
    }
  }

  return discovered
}

function loadExistingResults(): DiscoveredProvider[] {
  const path = join(__dirname, 'discovered-providers.json')
  if (existsSync(path)) {
    const data = JSON.parse(readFileSync(path, 'utf-8'))
    return data.providers || []
  }
  return []
}

async function main() {
  const args = process.argv.slice(2)
  const isResume = args.includes('--resume')

  // Use a weekday for discovery
  const discoveryDate = new Date()
  const dow = discoveryDate.getDay()
  if (dow === 0) discoveryDate.setDate(discoveryDate.getDate() + 1)
  if (dow === 6) discoveryDate.setDate(discoveryDate.getDate() + 2)
  const dateStr = formatDate(discoveryDate)

  const subdomains = getUniqueSubdomains()

  // Load existing results for --resume mode
  let existingProviders: DiscoveredProvider[] = []
  const alreadyScanned = new Set<string>()
  if (isResume) {
    existingProviders = loadExistingResults()
    for (const p of existingProviders) alreadyScanned.add(p.subdomain)
    console.log(`\nResume mode: keeping ${existingProviders.length} existing entries from ${alreadyScanned.size} subdomains`)
    console.log(`Scanning remaining ${subdomains.length - alreadyScanned.size} subdomains...\n`)
  }

  console.log(`Using date: ${dateStr}\n`)

  // ── Phase 1: Scrape booking pages for slugs ──
  console.log('Phase 1: Scraping booking pages for appointment slugs...\n')

  const subdomainSlugs = new Map<string, string[]>()
  for (let i = 0; i < subdomains.length; i += 5) {
    const batch = subdomains.slice(i, i + 5)
    const results = await Promise.all(
      batch.map(async (sd) => ({ sd, slugs: await scrapeBookingPageSlugs(sd) }))
    )
    for (const { sd, slugs } of results) {
      subdomainSlugs.set(sd, slugs)
      const display = slugs.length > 0 ? `[${slugs.join(', ')}]` : '(none - will probe)'
      console.log(`  ${sd}: ${display}`)
    }
  }

  // ── Phase 2 & 3: For each subdomain, probe then full scan ──
  console.log('\nPhase 2+3: Probing and scanning each subdomain...\n')

  const allDiscovered: DiscoveredProvider[] = [...existingProviders]

  for (const subdomain of subdomains) {
    if (isResume && alreadyScanned.has(subdomain)) continue

    const clinicsForSubdomain = CLINICS.filter((c) => c.subdomain === subdomain)
    const locationSlugs = clinicsForSubdomain.flatMap((c) => c.locations?.map((l) => l.slug) || [])

    let pageSlugs = subdomainSlugs.get(subdomain) || []

    // Build the list of slugs to try
    let slugsToScan: string[] = []

    if (pageSlugs.length > 0) {
      // We have slugs from the booking page - use them directly
      slugsToScan = pageSlugs
      console.log(`[${subdomain}] Using page slugs: [${pageSlugs.join(', ')}]`)
    } else {
      // No slugs from page - quick probe with common slugs
      console.log(`[${subdomain}] No page slugs, probing with ${COMMON_SLUGS.length} common slugs...`)
      const probeResult = await quickProbe(subdomain, COMMON_SLUGS, locationSlugs, dateStr)
      if (probeResult) {
        slugsToScan = [probeResult.slug]
        console.log(`  → Probe hit: slug="${probeResult.slug}" (PID=${probeResult.samplePid})`)
      } else {
        console.log(`  → No working slug found, skipping`)
        await sleep(DELAY_BETWEEN_SUBDOMAINS_MS)
        continue
      }
    }

    // Full scan with each working slug
    for (const slug of slugsToScan) {
      console.log(`  Scanning PIDs 1-${MAX_PROVIDER_ID} with slug="${slug}"...`)
      const found = await fullScan(subdomain, slug, locationSlugs, dateStr)
      allDiscovered.push(...found)

      if (found.length === 0) {
        console.log(`    (no valid PIDs found)`)
      }
    }

    await sleep(DELAY_BETWEEN_SUBDOMAINS_MS)
  }

  // Save
  const outputPath = join(__dirname, 'discovered-providers.json')
  const uniqueKey = (d: DiscoveredProvider) => `${d.subdomain}:${d.providerId}:${d.appointmentSlug}`
  const seen = new Set<string>()
  const deduped = allDiscovered.filter((d) => {
    const k = uniqueKey(d)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  const output = {
    discoveredAt: new Date().toISOString(),
    dateUsed: dateStr,
    totalProviders: deduped.length,
    providers: deduped.sort((a, b) => a.subdomain.localeCompare(b.subdomain)),
  }
  writeFileSync(outputPath, JSON.stringify(output, null, 2))

  // Summary
  const bySubdomain = new Map<string, Map<string, number[]>>()
  for (const d of deduped) {
    if (!bySubdomain.has(d.subdomain)) bySubdomain.set(d.subdomain, new Map())
    const slugMap = bySubdomain.get(d.subdomain)!
    if (!slugMap.has(d.appointmentSlug)) slugMap.set(d.appointmentSlug, [])
    slugMap.get(d.appointmentSlug)!.push(d.providerId)
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Discovery complete!`)
  console.log(`Found ${deduped.length} provider entries across ${bySubdomain.size} subdomains`)
  console.log(`Results saved to: ${outputPath}`)
  console.log(`${'='.repeat(60)}\n`)

  for (const [sd, slugMap] of bySubdomain.entries()) {
    for (const [slug, pids] of slugMap.entries()) {
      console.log(`  ${sd} (${slug}): PIDs [${pids.join(', ')}]`)
    }
  }

  const foundSubdomains = new Set(deduped.map((d) => d.subdomain))
  const missing = subdomains.filter((s) => !foundSubdomains.has(s))
  if (missing.length > 0) {
    console.log(`\nSubdomains with no results (${missing.length}):`)
    for (const s of missing) console.log(`  - ${s}.cortico.ca`)
  }
}

main().catch(console.error)
