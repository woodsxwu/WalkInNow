import { BookingSystemAdapter, AvailableSlot } from './types'

/**
 * Adapter for InputHealth (TELUS CHR) eBooking system.
 *
 * InputHealth is used by Care Point Medical and other clinics. Each clinic
 * has a domain like: https://{clinicSlug}.inputhealth.com/ebooking
 *
 * The backend uses a private GraphQL API with JWT RS512 auth (paid Enterprise
 * API). However, the patient-facing eBooking page (Backbone.js SPA) makes
 * AJAX calls to fetch available schedules without patient auth.
 *
 * Known internal API paths (from JS bundle analysis):
 *   /public/appointments/schedules
 *   /public/appointments/:id/schedules
 *   /ebooking/schedules (returns JSON with X-Requested-With header)
 *
 * NOTE: Direct server-side calls currently return the SPA HTML instead of
 * JSON data. The eBooking page requires browser JS execution to initialize
 * the API session.
 *
 * TODO: Capture exact API calls from browser DevTools to implement
 * server-side availability fetching.
 */
export class InputHealthAdapter implements BookingSystemAdapter {
  providerName = 'inputhealth'

  async fetchAvailableSlots(config: {
    providerId: string
    startDate: Date
    endDate: Date
    apiConfig?: any
  }): Promise<AvailableSlot[]> {
    const clinicSlug = config.apiConfig?.clinicSlug || config.providerId
    const baseUrl = `https://${clinicSlug}.inputhealth.com`

    try {
      const from = config.startDate.toISOString().split('T')[0]
      const to = config.endDate.toISOString().split('T')[0]

      // Attempt the public schedules endpoint
      const response = await fetch(
        `${baseUrl}/public/appointments/schedules?from=${from}&to=${to}`,
        {
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
        }
      )

      if (!response.ok) return []

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        // Got HTML SPA page instead of JSON — endpoint needs browser session
        return []
      }

      const data = await response.json()

      // Expected: array of schedule objects with time slots
      if (Array.isArray(data)) {
        return data
          .filter((slot: any) => {
            const slotTime = new Date(slot.starts_at || slot.start_time || slot.time)
            return slotTime > new Date()
          })
          .map((slot: any) => ({
            startTime: new Date(slot.starts_at || slot.start_time),
            endTime: new Date(slot.ends_at || slot.end_time || slot.starts_at),
            type: 'in-person' as const,
            providerId: slot.practitioner_id?.toString() || config.providerId,
            bookingUrl: `${baseUrl}/ebooking`,
            metadata: slot,
          }))
      }

      return []
    } catch (error) {
      console.error('InputHealth: Error fetching slots:', error)
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
