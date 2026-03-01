/**
 * Scrape available walk-in clinic appointments from Cortico API.
 *
 * Uses discovered-providers.json (from discover-providers.ts) or
 * falls back to known provider IDs in clinics-config.ts.
 *
 * Usage:
 *   npx tsx scripts/scrape-appointments.ts              # scrape today
 *   npx tsx scripts/scrape-appointments.ts --days 7      # scrape next 7 days
 *   npx tsx scripts/scrape-appointments.ts --json        # output as JSON
 */

import { CLINICS, ClinicConfig } from './clinics-config'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'

interface DiscoveredProvider {
  subdomain: string
  providerId: number
  locationSlugs: string[]
  appointmentSlug: string // e.g., "walk-in-clinic", "specific-doctor-walk-in"
}

interface AppointmentSlot {
  start_time: string
  end_time: string
  value: string
  start_datetime: string
  provider_no: string
}

interface DaySlots {
  provider_no: string
  clinic_slots: AppointmentSlot[]
  video_slots: AppointmentSlot[]
  phone_slots: AppointmentSlot[]
  home_visit_slots: AppointmentSlot[]
}

interface ClinicResult {
  clinicName: string
  subdomain: string
  city: string
  address: string
  providerId: number
  locationSlug?: string
  date: string
  clinicSlots: AppointmentSlot[]
  videoSlots: AppointmentSlot[]
  phoneSlots: AppointmentSlot[]
  totalSlots: number
  nextAvailable: string | null
}

const CONCURRENCY = 10

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Vancouver',
  })
}

async function fetchSlots(
  subdomain: string,
  providerId: number,
  date: string,
  appointmentSlug: string,
  locationSlug?: string
): Promise<Record<string, DaySlots> | null> {
  const locationParam = locationSlug ? `?location=${locationSlug}` : ''
  const url = `https://${subdomain}.cortico.ca/api/async/available-appointment-slots/${providerId}/${date}/${appointmentSlug}/${locationParam}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'WalkInNow/1.0 (clinic availability checker)',
      },
    })

    clearTimeout(timeout)

    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

function loadProviders(): { subdomain: string; providerId: number; locationSlugs: string[]; appointmentSlug: string }[] {
  const discoveredPath = join(__dirname, 'discovered-providers.json')

  if (existsSync(discoveredPath)) {
    const data = JSON.parse(readFileSync(discoveredPath, 'utf-8'))
    console.log(`Loaded ${data.totalProviders} providers from discovered-providers.json (discovered: ${data.discoveredAt})\n`)
    return data.providers.map((p: any) => ({
      ...p,
      appointmentSlug: p.appointmentSlug || 'walk-in-clinic',
    }))
  }

  // Fallback to known provider IDs from config
  console.log('No discovered-providers.json found. Using known provider IDs from config.\n')
  console.log('Run "npx tsx scripts/discover-providers.ts" first for complete results.\n')

  return CLINICS.filter((c) => c.knownProviderIds?.length)
    .flatMap((c) =>
      c.knownProviderIds!.map((pid) => ({
        subdomain: c.subdomain,
        providerId: pid,
        locationSlugs: c.locations?.map((l) => l.slug) || [],
        appointmentSlug: 'walk-in-clinic',
      }))
    )
}

function findClinicInfo(subdomain: string, locationSlug?: string): ClinicConfig | undefined {
  if (locationSlug) {
    return CLINICS.find(
      (c) => c.subdomain === subdomain && c.locations?.some((l) => l.slug === locationSlug)
    )
  }
  return CLINICS.find((c) => c.subdomain === subdomain)
}

async function scrapeDate(
  providers: { subdomain: string; providerId: number; locationSlugs: string[]; appointmentSlug: string }[],
  date: string
): Promise<ClinicResult[]> {
  const results: ClinicResult[] = []

  // Build all fetch tasks
  const tasks: {
    subdomain: string
    providerId: number
    appointmentSlug: string
    locationSlug?: string
  }[] = []

  for (const provider of providers) {
    if (provider.locationSlugs.length > 0) {
      for (const slug of provider.locationSlugs) {
        tasks.push({ subdomain: provider.subdomain, providerId: provider.providerId, appointmentSlug: provider.appointmentSlug, locationSlug: slug })
      }
    } else {
      tasks.push({ subdomain: provider.subdomain, providerId: provider.providerId, appointmentSlug: provider.appointmentSlug })
    }
  }

  // Process in batches
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY)

    const batchResults = await Promise.all(
      batch.map(async (task) => {
        const data = await fetchSlots(task.subdomain, task.providerId, date, task.appointmentSlug, task.locationSlug)
        if (!data) return null

        const dayData = data[date]
        if (!dayData) return null

        const clinic = findClinicInfo(task.subdomain, task.locationSlug)
        const now = new Date()

        // Filter to future slots only
        const filterFuture = (slots: AppointmentSlot[]) =>
          slots.filter((s) => new Date(s.start_datetime) > now)

        const clinicSlots = filterFuture(dayData.clinic_slots || [])
        const videoSlots = filterFuture(dayData.video_slots || [])
        const phoneSlots = filterFuture(dayData.phone_slots || [])

        const allSlots = [...clinicSlots, ...videoSlots, ...phoneSlots]
        allSlots.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())

        return {
          clinicName: clinic?.name || `${task.subdomain} (${task.locationSlug || 'main'})`,
          subdomain: task.subdomain,
          city: clinic?.city || 'Unknown',
          address: clinic?.address || 'Unknown',
          providerId: task.providerId,
          locationSlug: task.locationSlug,
          date,
          clinicSlots,
          videoSlots,
          phoneSlots,
          totalSlots: allSlots.length,
          nextAvailable: allSlots.length > 0 ? allSlots[0].start_datetime : null,
        } as ClinicResult
      })
    )

    results.push(...batchResults.filter((r): r is ClinicResult => r !== null))
  }

  // Deduplicate: merge results with the same clinic+date by combining unique slots
  const deduped = new Map<string, ClinicResult>()
  for (const result of results) {
    const key = `${result.subdomain}:${result.locationSlug || ''}:${result.date}`
    const existing = deduped.get(key)
    if (!existing || result.totalSlots > existing.totalSlots) {
      // Keep the result with the most slots (different provider IDs often return same slots)
      deduped.set(key, result)
    }
  }

  return [...deduped.values()]
}

function printResults(results: ClinicResult[]) {
  // Sort by total available slots (most available first)
  const sorted = results.sort((a, b) => b.totalSlots - a.totalSlots)

  const withSlots = sorted.filter((r) => r.totalSlots > 0)
  const withoutSlots = sorted.filter((r) => r.totalSlots === 0)

  if (withSlots.length === 0) {
    console.log('No available walk-in appointments found.\n')
    return
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log(`  AVAILABLE WALK-IN APPOINTMENTS`)
  console.log(`${'='.repeat(80)}\n`)

  // Group by city
  const byCity = new Map<string, ClinicResult[]>()
  for (const r of withSlots) {
    const existing = byCity.get(r.city) || []
    existing.push(r)
    byCity.set(r.city, existing)
  }

  for (const [city, clinics] of byCity.entries()) {
    console.log(`\n--- ${city.toUpperCase()} ---\n`)

    for (const clinic of clinics) {
      const nextTime = clinic.nextAvailable ? formatTime(clinic.nextAvailable) : 'N/A'
      console.log(`  ${clinic.clinicName}`)
      console.log(`    Address: ${clinic.address}`)
      console.log(`    Date: ${clinic.date}`)
      console.log(
        `    Available: ${clinic.clinicSlots.length} in-person, ${clinic.videoSlots.length} video, ${clinic.phoneSlots.length} phone`
      )
      console.log(`    Next slot: ${nextTime}`)

      // Show first few time slots
      const allSlots = [...clinic.clinicSlots, ...clinic.videoSlots, ...clinic.phoneSlots]
        .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
        .slice(0, 5)

      if (allSlots.length > 0) {
        const times = allSlots.map((s) => formatTime(s.start_datetime)).join(', ')
        console.log(`    Times: ${times}${clinic.totalSlots > 5 ? ` ... (+${clinic.totalSlots - 5} more)` : ''}`)
      }

      console.log(`    Book: https://${clinic.subdomain}.cortico.ca/book/walk-in-clinic/${clinic.locationSlug ? `?location=${clinic.locationSlug}` : ''}`)
      console.log()
    }
  }

  console.log(`${'='.repeat(80)}`)
  console.log(`  Summary: ${withSlots.length} clinics with availability, ${withoutSlots.length} without`)
  console.log(`  Total available slots: ${withSlots.reduce((sum, r) => sum + r.totalSlots, 0)}`)
  console.log(`${'='.repeat(80)}\n`)
}

async function main() {
  const args = process.argv.slice(2)
  const daysToScrape = args.includes('--days')
    ? parseInt(args[args.indexOf('--days') + 1]) || 1
    : 1
  const jsonOutput = args.includes('--json')

  const providers = loadProviders()

  if (providers.length === 0) {
    console.log('No provider IDs available. Run discover-providers.ts first.')
    process.exit(1)
  }

  const allResults: ClinicResult[] = []

  for (let i = 0; i < daysToScrape; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const dateStr = formatDate(date)

    console.log(`Scraping appointments for ${dateStr}...`)
    const results = await scrapeDate(providers, dateStr)
    allResults.push(...results)
  }

  if (jsonOutput) {
    const outputPath = join(__dirname, 'appointments.json')
    const output = {
      scrapedAt: new Date().toISOString(),
      totalClinics: allResults.length,
      clinicsWithSlots: allResults.filter((r) => r.totalSlots > 0).length,
      totalSlots: allResults.reduce((sum, r) => sum + r.totalSlots, 0),
      results: allResults,
    }
    writeFileSync(outputPath, JSON.stringify(output, null, 2))
    console.log(`\nResults saved to: ${outputPath}`)
  } else {
    printResults(allResults)
  }
}

main().catch(console.error)
