import { NextResponse } from 'next/server'
import { refreshStaleClinicAvailability } from '@/lib/availability'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await refreshStaleClinicAvailability()
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron refresh failed:', error)
    return NextResponse.json(
      { error: 'Cron refresh failed' },
      { status: 500 }
    )
  }
}
