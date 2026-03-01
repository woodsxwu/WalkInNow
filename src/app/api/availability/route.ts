import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const MEDEO_API_KEY = process.env.MEDEO_API_KEY || 'c193fd4eb7624bba8c4af5b5cf0ae7eb'
const MEDEO_BASE_URL = 'https://api-ca.medeohealth.com'

interface MedeoTimeslot {
  id: number
  starts_at: string
  ends_at: string
  practitioner_id: number
  organization_id: number
  available: boolean
}

async function fetchMedeoAvailability(
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
    next: { revalidate: 300 }, // cache for 5 minutes
  })

  if (!response.ok) return null

  const data = await response.json()
  const items: MedeoTimeslot[] = data.items || []

  if (items.length === 0) return null

  // Return the earliest available slot
  return items[0].starts_at
}

interface CorticoApiConfig {
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

async function fetchCorticoAvailability(
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

    // Build URLs for all providers, or fall back to single template
    const urls = apiConfig?.providers?.length
      ? buildCorticoUrls(apiConfig, dateStr)
      : [apiUrlTemplate.replace('{date}', dateStr)]

    try {
      // Fetch all providers in parallel for this day
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

// GET /api/availability?clinicId=...
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clinicId = searchParams.get('clinicId')

  if (!clinicId) {
    return NextResponse.json(
      { error: 'clinicId is required' },
      { status: 400 }
    )
  }

  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        apiProvider: true,
        apiUrlTemplate: true,
        apiDateFormat: true,
        apiConfig: true,
        isRealWalkIn: true,
      },
    })

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
    }

    if (clinic.isRealWalkIn) {
      return NextResponse.json({ clinicId, nextAvailableSlot: null })
    }

    let nextSlot: string | null = null

    if (clinic.apiProvider === 'medeo' && clinic.apiConfig) {
      const config = clinic.apiConfig as { orgId: number; typeId: number }
      nextSlot = await fetchMedeoAvailability(config.orgId, config.typeId)
    } else if (clinic.apiUrlTemplate) {
      const corticoConfig = clinic.apiConfig as CorticoApiConfig | null
      nextSlot = await fetchCorticoAvailability(
        clinic.apiUrlTemplate,
        clinic.apiDateFormat || 'YYYY-MM-DD',
        14,
        corticoConfig
      )
    }

    return NextResponse.json({ clinicId, nextAvailableSlot: nextSlot })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    )
  }
}
