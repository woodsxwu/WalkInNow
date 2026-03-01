import { prisma } from '@/lib/db'

const MEDEO_API_KEY = process.env.MEDEO_API_KEY || 'c193fd4eb7624bba8c4af5b5cf0ae7eb'
const MEDEO_BASE_URL = 'https://api-ca.medeohealth.com'

const BATCH_SIZE = 3
const BATCH_DELAY_MS = 1000
const STALENESS_THRESHOLD_MS = 2 * 60 * 60 * 1000 // 2 hours

export interface MedeoTimeslot {
  id: number
  starts_at: string
  ends_at: string
  practitioner_id: number
  organization_id: number
  available: boolean
}

export interface CorticoApiConfig {
  subdomain: string
  providers: { id: number; appointmentSlug: string }[]
  locationSlug: string | null
}

function buildCorticoUrls(config: CorticoApiConfig, dateStr: string): string[] {
  return config.providers.map((p) => {
    const base = `https://${config.subdomain}.cortico.ca/api/async/available-appointment-slots/${p.id}/${dateStr}/${p.appointmentSlug}/`
    return config.locationSlug ? `${base}?location=${config.locationSlug}` : base
  })
}

export async function fetchMedeoAvailability(
  orgId: number,
  typeId: number,
  daysToCheck: number = 14
): Promise<string | null> {
  const now = new Date()
  const from = now.toISOString()
  const to = new Date(now.getTime() + daysToCheck * 86400000).toISOString()

  const url = `${MEDEO_BASE_URL}/v3/timeslots/org/${orgId}/available/list?from=${from}&to=${to}&type=${typeId}&count=1&page=1`

  const response = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
    next: { revalidate: 300 },
  })

  if (!response.ok) return null

  const data = await response.json()
  const items: MedeoTimeslot[] = data.items || []

  if (items.length === 0) return null

  return items[0].starts_at
}

export async function fetchCorticoAvailability(
  apiUrlTemplate: string,
  dateFormat: string = 'YYYY-MM-DD',
  daysToCheck: number = 14,
  apiConfig?: CorticoApiConfig | null
): Promise<string | null> {
  const now = new Date()

  for (let i = 0; i < daysToCheck; i++) {
    const checkDate = new Date(now)
    checkDate.setDate(now.getDate() + i)

    const year = checkDate.getFullYear()
    const month = String(checkDate.getMonth() + 1).padStart(2, '0')
    const day = String(checkDate.getDate()).padStart(2, '0')
    const dateStr = dateFormat
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)

    const urls = apiConfig?.providers?.length
      ? buildCorticoUrls(apiConfig, dateStr)
      : [apiUrlTemplate.replace('{date}', dateStr)]

    try {
      const responses = await Promise.allSettled(
        urls.map((url) => fetch(url, { next: { revalidate: 300 } }))
      )

      let allSlots: any[] = []

      for (const result of responses) {
        if (result.status !== 'fulfilled' || !result.value.ok) continue
        const data = await result.value.json()
        const dayData = data[dateStr]
        if (!dayData) continue

        allSlots.push(
          ...(dayData.clinic_slots || []),
          ...(dayData.video_slots || []),
          ...(dayData.phone_slots || []),
        )
      }

      const futureSlots = allSlots.filter(
        (slot: any) => new Date(slot.start_datetime) > now
      )

      if (futureSlots.length > 0) {
        futureSlots.sort(
          (a: any, b: any) =>
            new Date(a.start_datetime).getTime() -
            new Date(b.start_datetime).getTime()
        )
        return futureSlots[0].start_datetime
      }
    } catch {
      continue
    }
  }

  return null
}

/**
 * Fetch the next available slot for a single clinic, dispatching to the
 * correct provider function based on clinic.apiProvider.
 */
export async function fetchNextAvailableSlot(clinic: {
  apiProvider: string | null
  apiUrlTemplate: string | null
  apiDateFormat: string | null
  apiConfig: any
}): Promise<string | null> {
  if (clinic.apiProvider === 'medeo' && clinic.apiConfig) {
    const config = clinic.apiConfig as { orgId: number; typeId: number }
    return fetchMedeoAvailability(config.orgId, config.typeId)
  } else if (clinic.apiProvider === 'ocean' && clinic.apiConfig) {
    return fetchOceanAvailability(clinic.apiConfig)
  } else if (clinic.apiProvider === 'inputhealth' && clinic.apiConfig) {
    return fetchInputHealthAvailability(clinic.apiConfig)
  } else if (clinic.apiProvider === 'doctr' && clinic.apiConfig) {
    return fetchDoctrAvailability(clinic.apiConfig)
  } else if (clinic.apiUrlTemplate) {
    const corticoConfig = clinic.apiConfig as CorticoApiConfig | null
    return fetchCorticoAvailability(
      clinic.apiUrlTemplate,
      clinic.apiDateFormat || 'YYYY-MM-DD',
      14,
      corticoConfig
    )
  }
  return null
}

/**
 * Fetch availability from OceanMD / CognisantMD.
 * NOTE: Currently returns null as the API requires session auth.
 * The clinic will still appear with its booking URL for direct user access.
 */
async function fetchOceanAvailability(
  apiConfig: { uuid: string }
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://ocean.cognisantmd.com/svc/v1/online-booking/${apiConfig.uuid}/availability`,
      { headers: { 'Accept': 'application/json' } }
    )
    if (!response.ok) return null

    const data = await response.json()
    if (data.slots?.length > 0) {
      const now = new Date()
      const futureSlots = data.slots
        .filter((s: any) => new Date(s.startTime || s.time) > now)
        .sort((a: any, b: any) =>
          new Date(a.startTime || a.time).getTime() -
          new Date(b.startTime || b.time).getTime()
        )
      return futureSlots.length > 0
        ? (futureSlots[0].startTime || futureSlots[0].time)
        : null
    }
    return null
  } catch {
    return null
  }
}

/**
 * Fetch availability from InputHealth (TELUS CHR).
 * NOTE: Currently returns null as the eBooking API requires browser session.
 */
async function fetchInputHealthAvailability(
  apiConfig: { clinicSlug: string }
): Promise<string | null> {
  try {
    const now = new Date()
    const to = new Date(now.getTime() + 14 * 86400000)
    const fromStr = now.toISOString().split('T')[0]
    const toStr = to.toISOString().split('T')[0]

    const response = await fetch(
      `https://${apiConfig.clinicSlug}.inputhealth.com/public/appointments/schedules?from=${fromStr}&to=${toStr}`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      }
    )
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return null

    const data = await response.json()
    if (Array.isArray(data) && data.length > 0) {
      return data[0].starts_at || data[0].start_time || null
    }
    return null
  } catch {
    return null
  }
}

/**
 * Fetch availability from Doctr.
 * NOTE: Currently returns null as the API requires auth token.
 */
async function fetchDoctrAvailability(
  apiConfig: { clinicId: string }
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.doctr.ca/api/consultation-availabilities?clinicId=${apiConfig.clinicId}`,
      { headers: { 'Accept': 'application/json' } }
    )
    if (!response.ok) return null

    const data = await response.json()
    if (Array.isArray(data) && data.length > 0) {
      return data[0].appointmentDate || data[0].date || null
    }
    return null
  } catch {
    return null
  }
}

/**
 * Refresh availability for stale clinics with rate-limiting.
 * Processes in batches of BATCH_SIZE with BATCH_DELAY_MS between batches.
 */
export async function refreshStaleClinicAvailability(
  clinicIds?: string[]
): Promise<{ refreshed: number; errors: number }> {
  const staleThreshold = new Date(Date.now() - STALENESS_THRESHOLD_MS)

  const where: any = {
    isActive: true,
    isRealWalkIn: false,
    AND: [
      {
        OR: [
          { apiUrlTemplate: { not: null } },
          { apiProvider: { not: null } },
        ],
      },
      {
        OR: [
          { availabilityLastFetchedAt: null },
          { availabilityLastFetchedAt: { lt: staleThreshold } },
        ],
      },
    ],
  }

  if (clinicIds?.length) {
    where.id = { in: clinicIds }
  }

  const clinics = await prisma.clinic.findMany({
    where,
    select: {
      id: true,
      apiProvider: true,
      apiUrlTemplate: true,
      apiDateFormat: true,
      apiConfig: true,
    },
  })

  let refreshed = 0
  let errors = 0

  for (let i = 0; i < clinics.length; i += BATCH_SIZE) {
    const batch = clinics.slice(i, i + BATCH_SIZE)

    const results = await Promise.allSettled(
      batch.map(async (clinic) => {
        const nextSlot = await fetchNextAvailableSlot(clinic)
        await prisma.clinic.update({
          where: { id: clinic.id },
          data: {
            nextAvailableSlot: nextSlot ? new Date(nextSlot) : null,
            availabilityLastFetchedAt: new Date(),
          },
        })
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled') refreshed++
      else errors++
    }

    // Delay between batches (skip after last batch)
    if (i + BATCH_SIZE < clinics.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  return { refreshed, errors }
}
