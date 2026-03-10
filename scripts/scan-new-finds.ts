/**
 * Full PID scan for newly found Cortico clinics, then update DB directly
 */
import { PrismaClient } from '../src/generated/prisma'
import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

const p = new PrismaClient()
const MAX_PID = 300
const CONCURRENCY = 10

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fullScan(subdomain: string, slug: string, dateStr: string): Promise<number[]> {
  const found: number[] = []
  const allPids = Array.from({ length: MAX_PID }, (_, i) => i + 1)

  for (let i = 0; i < allPids.length; i += CONCURRENCY) {
    const batch = allPids.slice(i, i + CONCURRENCY)
    if (i > 0) await sleep(300)

    const results = await Promise.all(
      batch.map(async (pid) => {
        const url = `https://${subdomain}.cortico.ca/api/async/available-appointment-slots/${pid}/${dateStr}/${slug}/`
        try {
          const res = await fetch(url, { headers: { 'User-Agent': 'WalkInNow/1.0' } })
          return { pid, ok: res.ok }
        } catch {
          return { pid, ok: false }
        }
      })
    )

    for (const { pid, ok } of results) {
      if (ok) {
        found.push(pid)
        console.log(`    ✓ PID=${pid}`)
      }
    }
  }

  return found
}

async function main() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dow = tomorrow.getDay()
  if (dow === 0) tomorrow.setDate(tomorrow.getDate() + 1)
  if (dow === 6) tomorrow.setDate(tomorrow.getDate() + 2)
  const dateStr = formatDate(tomorrow)

  const newFinds = [
    { subdomain: 'granvillemedical', slug: 'family-doctor' },
    { subdomain: 'frasercare', slug: 'family-doctor' },
    { subdomain: 'maywoodmedical', slug: 'family-doctor' },
    { subdomain: 'focusmed', slug: 'family-doctor' },
    { subdomain: 'elicarerichmond', slug: 'family-doctor' },
    { subdomain: 'megafuclinic', slug: 'family-doctor' },
    { subdomain: 'drsheikprimacy', slug: 'family-doctor' },
    { subdomain: 'thrivemedical', slug: 'family-doctor' },
  ]

  // Load existing discovered-providers.json
  const dpPath = join(__dirname, 'discovered-providers.json')
  const existing = JSON.parse(readFileSync(dpPath, 'utf-8'))

  for (const { subdomain, slug } of newFinds) {
    console.log(`[${subdomain}] Scanning PIDs 1-${MAX_PID} with "${slug}"...`)
    const pids = await fullScan(subdomain, slug, dateStr)

    if (pids.length === 0) {
      console.log(`  (no PIDs found)\n`)
      continue
    }

    // Add to discovered providers
    for (const pid of pids) {
      existing.providers.push({
        subdomain,
        providerId: pid,
        locationSlugs: [],
        appointmentSlug: slug,
      })
    }

    // Update the clinic in DB
    const providers = pids.map(id => ({ id, appointmentSlug: slug }))
    const apiConfig = {
      subdomain,
      providers,
      locationSlug: null,
    }
    const apiUrlTemplate = `https://${subdomain}.cortico.ca/api/async/available-appointment-slots/${pids[0]}/${'{date}'}/${slug}/`

    const updated = await p.clinic.updateMany({
      where: {
        apiProvider: 'cortico',
        apiConfig: { path: ['subdomain'], equals: subdomain },
      },
      data: {
        apiConfig,
        apiUrlTemplate,
        availabilityLastFetchedAt: null, // Force re-fetch
      },
    })

    console.log(`  Updated ${updated.count} clinic(s) in DB with ${pids.length} providers\n`)

    await sleep(1000)
  }

  // Save updated discovered-providers.json
  existing.totalProviders = existing.providers.length
  existing.discoveredAt = new Date().toISOString()
  writeFileSync(dpPath, JSON.stringify(existing, null, 2))
  console.log(`Saved ${existing.providers.length} total providers to discovered-providers.json`)

  await p.$disconnect()
}

main()
