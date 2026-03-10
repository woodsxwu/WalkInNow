import { PrismaClient } from '../src/generated/prisma'

const p = new PrismaClient()

const UPDATES: Record<string, { slug: string; pids: number[] }> = {
  'Granville Medical Clinic': { slug: 'family-doctor', pids: [5, 48, 52, 64, 69] },
  'Fraser Care Clinic': { slug: 'family-doctor', pids: [10, 18, 28] },
  'Maywood Medical': { slug: 'family-doctor', pids: [2, 7, 13, 18, 19, 22, 24, 26, 30] },
  'Focus Medical Clinic': { slug: 'family-doctor', pids: [13, 20] },
  'Elicare Richmond Medical Clinic': { slug: 'family-doctor', pids: [1] },
  'Megafu Medical Clinic': { slug: 'family-doctor', pids: [6, 19, 24, 56] },
  'Primacy Medical Clinic': { slug: 'family-doctor', pids: [1] },
  'Thrive Medical Clinic': { slug: 'family-doctor', pids: [8, 30] },
}

// Map clinic names to subdomains
const SUBDOMAINS: Record<string, string> = {
  'Granville Medical Clinic': 'granvillemedical',
  'Fraser Care Clinic': 'frasercare',
  'Maywood Medical': 'maywoodmedical',
  'Focus Medical Clinic': 'focusmed',
  'Elicare Richmond Medical Clinic': 'elicarerichmond',
  'Megafu Medical Clinic': 'megafuclinic',
  'Primacy Medical Clinic': 'drsheikprimacy',
  'Thrive Medical Clinic': 'thrivemedical',
}

async function main() {
  for (const [name, { slug, pids }] of Object.entries(UPDATES)) {
    const subdomain = SUBDOMAINS[name]
    const providers = pids.map(id => ({ id, appointmentSlug: slug }))
    const apiConfig = { subdomain, providers, locationSlug: null }
    const apiUrlTemplate = `https://${subdomain}.cortico.ca/api/async/available-appointment-slots/${pids[0]}/{date}/${slug}/`

    const result = await p.clinic.updateMany({
      where: { name },
      data: {
        apiConfig,
        apiUrlTemplate,
        apiDateFormat: 'YYYY-MM-DD',
        availabilityLastFetchedAt: null,
      },
    })

    console.log(`${name}: updated ${result.count} row(s) (${pids.length} providers)`)
  }

  await p.$disconnect()
}

main()
