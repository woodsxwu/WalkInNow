import { BookingSystemAdapter, AvailableSlot } from './types'

/**
 * Adapter for OceanMD / CognisantMD online booking system.
 *
 * OceanMD is used by WELL Health clinics and others. Each clinic has a UUID
 * that identifies its online booking page at:
 *   https://ocean.cognisantmd.com/intake/patients.html#/{uuid}
 *
 * API endpoints:
 *   /svc/v1/online-booking/{uuid}/availability
 *   /svc/v1/online-booking/{uuid}/slots
 *   /svc/scheduling/available?ref={uuid}
 *
 * NOTE: These endpoints require session-based authentication (the patient
 * booking page is a SPA that initializes a session). Direct server-side
 * calls return 403 "Authentication Failed".
 *
 * Current approach: We attempt the API call. If it fails (403), we fall back
 * to returning null (no availability data). The clinic still appears in the
 * app with its booking URL so users can book directly.
 *
 * TODO: Investigate headless browser approach or session token acquisition
 * to fetch real-time availability data.
 */
export class OceanAdapter implements BookingSystemAdapter {
  providerName = 'ocean'
  private baseUrl = 'https://ocean.cognisantmd.com'

  async fetchAvailableSlots(config: {
    providerId: string
    startDate: Date
    endDate: Date
    apiConfig?: any
  }): Promise<AvailableSlot[]> {
    const uuid = config.apiConfig?.uuid || config.providerId

    try {
      // Try the availability endpoint
      const response = await fetch(
        `${this.baseUrl}/svc/v1/online-booking/${uuid}/availability`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        // Expected: 403 without session auth
        return []
      }

      const data = await response.json()

      // Map OceanMD slot format to normalized format
      if (Array.isArray(data.slots)) {
        return data.slots
          .filter((slot: any) => new Date(slot.startTime || slot.time) > new Date())
          .map((slot: any) => ({
            startTime: new Date(slot.startTime || slot.time),
            endTime: new Date(
              new Date(slot.startTime || slot.time).getTime() +
                (slot.duration || 15) * 60000
            ),
            type: this.mapSlotType(slot.type || slot.appointmentType),
            providerId: config.providerId,
            bookingUrl: `${this.baseUrl}/intake/patients.html#/${uuid}`,
            metadata: slot,
          }))
      }

      return []
    } catch (error) {
      console.error('OceanMD: Error fetching slots:', error)
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

  private mapSlotType(oceanType: string): AvailableSlot['type'] {
    const mapping: Record<string, AvailableSlot['type']> = {
      'virtual': 'video',
      'video': 'video',
      'in_clinic': 'in-person',
      'in-person': 'in-person',
      'telephone': 'phone',
      'phone': 'phone',
    }
    return mapping[oceanType?.toLowerCase()] || 'in-person'
  }
}
