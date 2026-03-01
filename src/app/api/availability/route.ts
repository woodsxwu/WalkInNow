import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchNextAvailableSlot } from '@/lib/availability'

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

    const nextSlot = await fetchNextAvailableSlot(clinic)

    // Write back to DB to warm the cache
    await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        nextAvailableSlot: nextSlot ? new Date(nextSlot) : null,
        availabilityLastFetchedAt: new Date(),
      },
    })

    return NextResponse.json({ clinicId, nextAvailableSlot: nextSlot })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    )
  }
}
