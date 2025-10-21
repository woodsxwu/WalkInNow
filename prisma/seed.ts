import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing data
  await prisma.provider.deleteMany()
  await prisma.clinicService.deleteMany()
  await prisma.clinicHours.deleteMany()
  await prisma.clinic.deleteMany()

  console.log('✅ Cleared existing data')

  // Create clinics
  const appletree = await prisma.clinic.create({
    data: {
      name: 'Appletree Medical Group - Carling',
      slug: 'appletree-carling',
      description: 'Walk-in clinic and family practice offering comprehensive medical services',
      address: '2910 Carling Ave',
      city: 'Ottawa',
      province: 'ON',
      postalCode: 'K2B 7J1',
      latitude: 45.3515,
      longitude: -75.7880,
      phone: '613-596-8000',
      website: 'https://appletreemedicalgroup.com',
      bookingUrl: 'https://carefiniti.cortico.ca',
      isRealWalkIn: false,
      acceptsNewPatients: true,
      appointmentTypes: ['in-person', 'video', 'phone'],
      apiProvider: 'carefiniti',
      providerId: '3040',
      apiEndpoint: 'https://carefiniti.cortico.ca/api/async/available-appointment-slots',
      apiConfig: {
        location: 'm',
      },
      hours: {
        create: [
          { dayOfWeek: 1, openTime: '08:00', closeTime: '20:00' }, // Monday
          { dayOfWeek: 2, openTime: '08:00', closeTime: '20:00' }, // Tuesday
          { dayOfWeek: 3, openTime: '08:00', closeTime: '20:00' }, // Wednesday
          { dayOfWeek: 4, openTime: '08:00', closeTime: '20:00' }, // Thursday
          { dayOfWeek: 5, openTime: '08:00', closeTime: '20:00' }, // Friday
          { dayOfWeek: 6, openTime: '09:00', closeTime: '17:00' }, // Saturday
          { dayOfWeek: 0, openTime: '10:00', closeTime: '16:00' }, // Sunday
        ],
      },
      services: {
        create: [
          { serviceType: 'walk-in', isAvailable: true },
          { serviceType: 'family-medicine', isAvailable: true },
          { serviceType: 'lab-services', isAvailable: true },
          { serviceType: 'prescriptions', isAvailable: true },
        ],
      },
    },
  })

  const medicalOne = await prisma.clinic.create({
    data: {
      name: 'Medical One Walk-in Clinic',
      slug: 'medical-one-toronto',
      description: 'Quick access walk-in clinic in downtown Toronto',
      address: '123 King Street West',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M5H 1A1',
      latitude: 43.6489,
      longitude: -79.3817,
      phone: '416-555-0100',
      website: 'https://medicalone.ca',
      isRealWalkIn: true, // No booking required
      acceptsNewPatients: true,
      appointmentTypes: ['in-person'],
      apiProvider: 'none',
      hours: {
        create: [
          { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00' },
          { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00' },
          { dayOfWeek: 3, openTime: '09:00', closeTime: '17:00' },
          { dayOfWeek: 4, openTime: '09:00', closeTime: '17:00' },
          { dayOfWeek: 5, openTime: '09:00', closeTime: '17:00' },
          { dayOfWeek: 6, isClosed: true },
          { dayOfWeek: 0, isClosed: true },
        ],
      },
      services: {
        create: [
          { serviceType: 'walk-in', isAvailable: true },
          { serviceType: 'minor-procedures', isAvailable: true },
        ],
      },
    },
  })

  const bayviewVillage = await prisma.clinic.create({
    data: {
      name: 'Bayview Village Walk-in Clinic',
      slug: 'bayview-village-clinic',
      description: 'Family-friendly walk-in clinic in North York',
      address: '2901 Bayview Ave',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M2K 1E6',
      latitude: 43.7731,
      longitude: -79.3850,
      phone: '416-555-0200',
      isRealWalkIn: false,
      acceptsNewPatients: true,
      appointmentTypes: ['in-person', 'phone'],
      apiProvider: 'carefiniti',
      providerId: '3050',
      apiEndpoint: 'https://carefiniti.cortico.ca/api/async/available-appointment-slots',
      apiConfig: {
        location: 'm',
      },
      hours: {
        create: [
          { dayOfWeek: 1, openTime: '08:00', closeTime: '20:00' },
          { dayOfWeek: 2, openTime: '08:00', closeTime: '20:00' },
          { dayOfWeek: 3, openTime: '08:00', closeTime: '20:00' },
          { dayOfWeek: 4, openTime: '08:00', closeTime: '20:00' },
          { dayOfWeek: 5, openTime: '08:00', closeTime: '20:00' },
          { dayOfWeek: 6, openTime: '09:00', closeTime: '15:00' },
          { dayOfWeek: 0, isClosed: true },
        ],
      },
      services: {
        create: [
          { serviceType: 'walk-in', isAvailable: true },
          { serviceType: 'family-medicine', isAvailable: true },
          { serviceType: 'pediatrics', isAvailable: true },
        ],
      },
    },
  })

  console.log('✅ Created clinics:', {
    appletree: appletree.id,
    medicalOne: medicalOne.id,
    bayviewVillage: bayviewVillage.id,
  })

  console.log('🎉 Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
