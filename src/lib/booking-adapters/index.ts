import { BookingSystemRegistry, BookingSystemAdapter, AvailableSlot } from './types'
import { CarefinitiAdapter } from './carefiniti'
import { OceanAdapter } from './ocean'

// Register all available adapters
BookingSystemRegistry.register('carefiniti', new CarefinitiAdapter())
BookingSystemRegistry.register('ocean', new OceanAdapter())

// Helper function to get slots for any clinic
export async function getClinicAvailability(clinic: {
  apiProvider?: string | null
  providerId?: string | null
  apiConfig?: any
  daysToCheck?: number
}): Promise<AvailableSlot | null> {
  if (!clinic.apiProvider || !clinic.providerId) {
    return null // Clinic doesn't have booking system integration
  }

  const adapter = BookingSystemRegistry.getAdapter(clinic.apiProvider)
  if (!adapter) {
    console.warn(`No adapter found for provider: ${clinic.apiProvider}`)
    return null
  }

  try {
    return await adapter.findNextAvailableSlot({
      providerId: clinic.providerId,
      daysToCheck: clinic.daysToCheck || 14,
      apiConfig: clinic.apiConfig,
    })
  } catch (error) {
    console.error(`Error fetching availability for ${clinic.apiProvider}:`, error)
    return null
  }
}

// Export types and registry for direct use
export { BookingSystemRegistry, type BookingSystemAdapter, type AvailableSlot }
