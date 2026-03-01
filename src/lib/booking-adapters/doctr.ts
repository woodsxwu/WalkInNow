import { BookingSystemAdapter, AvailableSlot } from './types'

/**
 * Adapter for Doctr booking platform.
 *
 * Doctr is used by clinics like Maple Medical, Guildford Medical, and
 * some WELL Health / Clover Care locations.
 *
 * Patient booking page: https://app.doctr.ca/?ep=booking
 * Clinic profiles: https://www.doctr.ca/app/clinics/{id}/{name}/en
 *
 * API base: https://api.doctr.ca/api/
 * Known endpoints (from JS bundle analysis):
 *   /bookingRequests
 *   /bookingResources
 *   /consultation-availabilities
 *   /consultations
 *
 * The API requires bearer token authentication. The Doctr app is a React SPA
 * using Axios. Users must log in to access booking functionality.
 *
 * NOTE: Direct server-side calls without auth return 404/HTML error pages.
 *
 * TODO: Investigate if there's a public availability endpoint or if we
 * need to implement an auth flow to access consultation-availabilities.
 */
export class DoctrAdapter implements BookingSystemAdapter {
  providerName = 'doctr'
  private apiBaseUrl = 'https://api.doctr.ca/api'

  async fetchAvailableSlots(config: {
    providerId: string
    startDate: Date
    endDate: Date
    apiConfig?: any
  }): Promise<AvailableSlot[]> {
    const clinicId = config.apiConfig?.clinicId || config.providerId

    try {
      // Try the consultation-availabilities endpoint
      const response = await fetch(
        `${this.apiBaseUrl}/consultation-availabilities?clinicId=${clinicId}`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        // Expected: 401/403 without auth token
        return []
      }

      const data = await response.json()

      if (Array.isArray(data)) {
        return data
          .filter((slot: any) => {
            const slotTime = new Date(slot.appointmentDate || slot.date || slot.time)
            return slotTime > new Date()
          })
          .map((slot: any) => ({
            startTime: new Date(slot.appointmentDate || slot.date),
            endTime: new Date(slot.appointmentDate || slot.date),
            type: 'in-person' as const,
            providerId: config.providerId,
            bookingUrl: `https://app.doctr.ca/?ep=booking`,
            metadata: slot,
          }))
      }

      return []
    } catch (error) {
      console.error('Doctr: Error fetching slots:', error)
      return []
    }
  }

  async findNextAvailableSlot(config: {
    providerId: string
    daysToCheck?: number
    apiConfig?: any
  }): Promise<AvailableSlot | null> {
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + (config.daysToCheck || 14))

    const slots = await this.fetchAvailableSlots({
      providerId: config.providerId,
      startDate,
      endDate,
      apiConfig: config.apiConfig,
    })

    return slots.length > 0 ? slots[0] : null
  }
}
