/**
 * Seed the database with clinic data from clinics-config and discovered providers.
 *
 * Usage:
 *   npx tsx scripts/seed-db.ts
 *
 * Prerequisites:
 *   - Database must be running (docker compose up -d)
 *   - Prisma migrations must be applied (npx prisma migrate dev)
 *   - Optionally run discover-providers.ts first for complete provider data
 */

import { PrismaClient, Prisma } from '../src/generated/prisma'
import { CLINICS } from './clinics-config'
import { MEDEO_CLINICS } from './medeo-clinics-config'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

interface DiscoveredProvider {
  subdomain: string
  providerId: number
  locationSlugs: string[]
  appointmentSlug: string
}

function loadDiscoveredProviders(): DiscoveredProvider[] {
  const path = join(__dirname, 'discovered-providers.json')
  if (existsSync(path)) {
    const data = JSON.parse(readFileSync(path, 'utf-8'))
    return data.providers
  }
  return []
}

function buildApiUrlTemplate(
  subdomain: string,
  providerId: number,
  appointmentSlug: string,
  locationSlug?: string
): string {
  const base = `https://${subdomain}.cortico.ca/api/async/available-appointment-slots/${providerId}/{date}/${appointmentSlug}/`
  return locationSlug ? `${base}?location=${locationSlug}` : base
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function main() {
  const discoveredProviders = loadDiscoveredProviders()
  console.log(`Loaded ${discoveredProviders.length} discovered providers`)

  // Build a lookup: subdomain -> provider IDs
  const providerLookup = new Map<string, DiscoveredProvider[]>()
  for (const dp of discoveredProviders) {
    const existing = providerLookup.get(dp.subdomain) || []
    existing.push(dp)
    providerLookup.set(dp.subdomain, existing)
  }

  let created = 0
  let updated = 0
  let skipped = 0

  for (const clinic of CLINICS) {
    const slug = slugify(clinic.name)

    // Collect ALL providers for this clinic's subdomain
    const discovered = providerLookup.get(clinic.subdomain) || []
    let locationSlug: string | undefined
    let providers: { id: number; appointmentSlug: string }[] = []

    if (discovered.length > 0) {
      if (clinic.locations && clinic.locations.length > 0) {
        locationSlug = clinic.locations[0].slug
        // For multi-location clinics, filter providers that match this location
        const matching = discovered.filter((d) =>
          d.locationSlugs.includes(locationSlug!)
        )
        if (matching.length > 0) {
          providers = matching.map((d) => ({
            id: d.providerId,
            appointmentSlug: d.appointmentSlug,
          }))
        }
      }

      // If no location-specific match, use ALL providers for this subdomain
      if (providers.length === 0) {
        providers = discovered.map((d) => ({
          id: d.providerId,
          appointmentSlug: d.appointmentSlug,
        }))
        if (discovered[0].locationSlugs.length > 0) {
          locationSlug = discovered[0].locationSlugs[0]
        }
      }
    }

    // Fallback to known provider IDs from config
    if (providers.length === 0 && clinic.knownProviderIds?.length) {
      providers = clinic.knownProviderIds.map((id) => ({
        id,
        appointmentSlug: 'walk-in-clinic',
      }))
      if (clinic.locations?.length) {
        locationSlug = clinic.locations[0].slug
      }
    }

    // Build API URL template using first provider (backward compat)
    const apiUrlTemplate = providers.length > 0
      ? buildApiUrlTemplate(clinic.subdomain, providers[0].id, providers[0].appointmentSlug, locationSlug)
      : null

    // Store all providers in apiConfig for multi-provider queries
    const apiConfig: Prisma.InputJsonValue | typeof Prisma.DbNull = providers.length > 0
      ? {
          subdomain: clinic.subdomain,
          providers: providers.map((p) => ({ id: p.id, appointmentSlug: p.appointmentSlug })),
          locationSlug: locationSlug || null,
        }
      : Prisma.DbNull

    const data = {
      name: clinic.name,
      slug,
      address: clinic.address,
      city: clinic.city,
      province: 'BC',
      latitude: clinic.latitude,
      longitude: clinic.longitude,
      isRealWalkIn: false, // uses booking system
      acceptsNewPatients: true,
      appointmentTypes: ['in-person', 'phone', 'video'],
      apiProvider: 'cortico',
      apiUrlTemplate,
      apiDateFormat: 'YYYY-MM-DD',
      apiConfig,
      isActive: true,
      phone: clinic.phone || null,
      website: `https://${clinic.subdomain}.cortico.ca/book/`,
    }

    try {
      const existing = await prisma.clinic.findUnique({ where: { slug } })

      if (existing) {
        await prisma.clinic.update({
          where: { slug },
          data,
        })
        updated++
        console.log(`  Updated: ${clinic.name} (${providers.length} providers)`)
      } else {
        await prisma.clinic.create({ data })
        created++
        console.log(`  Created: ${clinic.name} (${providers.length} providers)`)
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Unique constraint violation - slug collision, append city
        const newSlug = `${slug}-${slugify(clinic.subdomain)}`
        try {
          const existing = await prisma.clinic.findUnique({ where: { slug: newSlug } })
          if (existing) {
            await prisma.clinic.update({
              where: { slug: newSlug },
              data: { ...data, slug: newSlug },
            })
            updated++
          } else {
            await prisma.clinic.create({ data: { ...data, slug: newSlug } })
            created++
          }
          console.log(`  Created: ${clinic.name} (slug: ${newSlug})`)
        } catch (e) {
          console.error(`  Failed: ${clinic.name} - ${e}`)
          skipped++
        }
      } else {
        console.error(`  Failed: ${clinic.name} - ${error.message}`)
        skipped++
      }
    }
  }

  // === Seed Medeo clinics ===
  console.log(`\nSeeding ${MEDEO_CLINICS.length} Medeo clinics...`)
  for (const clinic of MEDEO_CLINICS) {
    const slug = slugify(clinic.name)

    const data = {
      name: clinic.name,
      slug,
      address: clinic.address,
      city: clinic.city,
      province: 'BC',
      postalCode: clinic.postalCode,
      latitude: clinic.latitude,
      longitude: clinic.longitude,
      isRealWalkIn: false,
      acceptsNewPatients: true,
      appointmentTypes: ['in-person'],
      apiProvider: 'medeo',
      apiConfig: { orgId: clinic.orgId, typeId: clinic.typeId },
      apiDateFormat: 'ISO8601',
      isActive: true,
      phone: clinic.phone || null,
      website: `https://patient.medeohealth.com/booking/${clinic.slug}`,
    }

    try {
      const existing = await prisma.clinic.findUnique({ where: { slug } })

      if (existing) {
        await prisma.clinic.update({ where: { slug }, data })
        updated++
        console.log(`  Updated: ${clinic.name} (Medeo org=${clinic.orgId})`)
      } else {
        await prisma.clinic.create({ data })
        created++
        console.log(`  Created: ${clinic.name} (Medeo org=${clinic.orgId})`)
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        const newSlug = `${slug}-medeo`
        try {
          const existing = await prisma.clinic.findUnique({ where: { slug: newSlug } })
          if (existing) {
            await prisma.clinic.update({ where: { slug: newSlug }, data: { ...data, slug: newSlug } })
            updated++
          } else {
            await prisma.clinic.create({ data: { ...data, slug: newSlug } })
            created++
          }
          console.log(`  Created: ${clinic.name} (slug: ${newSlug})`)
        } catch (e) {
          console.error(`  Failed: ${clinic.name} - ${e}`)
          skipped++
        }
      } else {
        console.error(`  Failed: ${clinic.name} - ${error.message}`)
        skipped++
      }
    }
  }

  const totalClinics = CLINICS.length + MEDEO_CLINICS.length
  console.log(`\n${'='.repeat(50)}`)
  console.log(`Seed complete!`)
  console.log(`  Created: ${created}`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Total clinics in config: ${totalClinics} (${CLINICS.length} Cortico + ${MEDEO_CLINICS.length} Medeo)`)
  console.log(`${'='.repeat(50)}\n`)

  // Show clinics without API integration
  const withoutApi = CLINICS.filter((c) => {
    const discovered = providerLookup.get(c.subdomain) || []
    return discovered.length === 0 && !c.knownProviderIds?.length
  })

  if (withoutApi.length > 0) {
    console.log(`Clinics without provider IDs (run discover-providers.ts to find them):`)
    for (const c of withoutApi) {
      console.log(`  - ${c.name} (${c.subdomain}.cortico.ca)`)
    }
  }

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
