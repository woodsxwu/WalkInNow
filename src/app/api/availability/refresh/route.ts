import { NextResponse } from 'next/server'
import { refreshStaleClinicAvailability } from '@/lib/availability'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { clinicIds } = body as { clinicIds?: string[] }

    const result = await refreshStaleClinicAvailability(clinicIds)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in availability refresh:', error)
    return NextResponse.json(
      { error: 'Failed to refresh availability' },
      { status: 500 }
    )
  }
}
