import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const clinics = await prisma.clinic.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(clinics)
  } catch (error) {
    console.error('Error fetching clinics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clinics' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Require authentication for creating clinics
    await requireAuth()
    
    const body = await request.json()
    
    const clinic = await prisma.clinic.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        address: body.address,
        city: body.city,
        province: body.province,
        postalCode: body.postalCode,
        phone: body.phone,
        email: body.email,
        website: body.website,
        isRealWalkIn: body.isRealWalkIn ?? false,
        acceptsNewPatients: body.acceptsNewPatients ?? true,
        appointmentTypes: body.appointmentTypes,
        apiUrlTemplate: body.apiUrlTemplate,
        apiDateFormat: body.apiDateFormat,
      },
    })

    return NextResponse.json(clinic, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error creating clinic:', error)
    return NextResponse.json(
      { error: 'Failed to create clinic' },
      { status: 500 }
    )
  }
}
