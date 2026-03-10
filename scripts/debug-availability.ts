import { PrismaClient } from '../src/generated/prisma'

const p = new PrismaClient()

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function debugCortico() {
  console.log('=== Debugging Cortico clinics with providers but no slots ===\n')

  const clinics = await p.clinic.findMany({
    where: {
      isActive: true,
      isRealWalkIn: false,
      apiProvider: 'cortico',
      nextAvailableSlot: null,
      apiConfig: { not: { equals: null } },
    },
    select: { name: true, apiUrlTemplate: true, apiConfig: true, apiDateFormat: true },
  })

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  // Make sure it's a weekday
  const dow = tomorrow.getDay()
  if (dow === 0) tomorrow.setDate(tomorrow.getDate() + 1)
  if (dow === 6) tomorrow.setDate(tomorrow.getDate() + 2)
  const dateStr = formatDate(tomorrow)

  for (const clinic of clinics.slice(0, 10)) {
    const config = clinic.apiConfig as any
    if (!config?.providers?.length) {
      console.log(`[${clinic.name}] No providers in apiConfig`)
      continue
    }

    console.log(`[${clinic.name}] subdomain=${config.subdomain}, ${config.providers.length} providers`)

    // Test first provider
    const provider = config.providers[0]
    const locationParam = config.locationSlug ? `?location=${config.locationSlug}` : ''
    const url = `https://${config.subdomain}.cortico.ca/api/async/available-appointment-slots/${provider.id}/${dateStr}/${provider.appointmentSlug}/${locationParam}`

    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'WalkInNow/1.0' } })
      console.log(`  URL: ${url}`)
      console.log(`  Status: ${res.status}`)
      if (res.ok) {
        const data = await res.json()
        const dayData = data[dateStr]
        if (dayData) {
          const clinicSlots = dayData.clinic_slots?.length || 0
          const videoSlots = dayData.video_slots?.length || 0
          const phoneSlots = dayData.phone_slots?.length || 0
          console.log(`  Slots: clinic=${clinicSlots}, video=${videoSlots}, phone=${phoneSlots}`)
          if (clinicSlots > 0) {
            console.log(`  First slot: ${JSON.stringify(dayData.clinic_slots[0])}`)
          }
        } else {
          console.log(`  No data for date ${dateStr}. Keys: ${Object.keys(data).join(', ')}`)
        }
      } else {
        const text = await res.text()
        console.log(`  Error body: ${text.substring(0, 200)}`)
      }
    } catch (e: any) {
      console.log(`  Fetch error: ${e.message}`)
    }
    console.log()
  }
}

async function debugMedeo() {
  console.log('\n=== Debugging Medeo clinics ===\n')

  const MEDEO_API_KEY = process.env.MEDEO_API_KEY || 'c193fd4eb7624bba8c4af5b5cf0ae7eb'

  const clinics = await p.clinic.findMany({
    where: {
      isActive: true,
      isRealWalkIn: false,
      apiProvider: 'medeo',
      nextAvailableSlot: null,
    },
    select: { name: true, apiConfig: true },
  })

  const now = new Date()
  const from = now.toISOString()
  const to = new Date(now.getTime() + 14 * 86400000).toISOString()

  for (const clinic of clinics.slice(0, 5)) {
    const config = clinic.apiConfig as any
    if (!config?.orgId) {
      console.log(`[${clinic.name}] No orgId`)
      continue
    }

    const url = `https://api-ca.medeohealth.com/v3/timeslots/org/${config.orgId}/available/list?from=${from}&to=${to}&type=${config.typeId}&count=1&page=1`
    console.log(`[${clinic.name}] orgId=${config.orgId}, typeId=${config.typeId}`)

    try {
      const res = await fetch(url, {
        headers: { 'Ocp-Apim-Subscription-Key': MEDEO_API_KEY },
      })
      console.log(`  Status: ${res.status}`)
      if (res.ok) {
        const data = await res.json()
        console.log(`  Items: ${data.items?.length || 0}`)
        if (data.items?.length > 0) {
          console.log(`  First: ${data.items[0].starts_at}`)
        }
      } else {
        const text = await res.text()
        console.log(`  Error: ${text.substring(0, 300)}`)
      }
    } catch (e: any) {
      console.log(`  Fetch error: ${e.message}`)
    }
    console.log()
  }
}

async function main() {
  await debugCortico()
  await debugMedeo()
  await p.$disconnect()
}

main()
