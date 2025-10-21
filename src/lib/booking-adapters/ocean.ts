import { BookingSystemAdapter, AvailableSlot } from './types'

// Example adapter for Ocean Health booking system
export class OceanAdapter implements BookingSystemAdapter {
  providerName = 'ocean'
  private baseUrl = 'https://api.ocean.health' // Example URL

  async fetchAvailableSlots(config: {
    providerId: string
    startDate: Date
    endDate: Date
    apiConfig?: any
  }): Promise<AvailableSlot[]> {
    // Ocean might have a completely different API format
    // Example: POST request with date range
    try {
      const response = await fetch(`${this.baseUrl}/appointments/available`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: config.providerId,
          start_date: config.startDate.toISOString(),
          end_date: config.endDate.toISOString(),
          location_id: config.apiConfig?.locationId,
        }),
      })

      if (!response.ok) return []

      const data = await response.json()
      
      // Convert Ocean format to normalized format
      // Assuming Ocean returns: { slots: [{ time: '...', duration: 30, type: 'video' }] }
      return data.slots.map((slot: any) => ({
        startTime: new Date(slot.time),
        endTime: new Date(new Date(slot.time).getTime() + slot.duration * 60000),
        type: this.mapSlotType(slot.type),
        providerId: config.providerId,
        bookingUrl: `${this.baseUrl}/book/${slot.id}`,
        metadata: slot,
      }))
    } catch (error) {
      console.error('Error fetching Ocean slots:', error)
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
    // Map Ocean's type names to our normalized types
    const mapping: Record<string, AvailableSlot['type']> = {
      'virtual': 'video',
      'in_clinic': 'in-person',
      'telephone': 'phone',
    }
    return mapping[oceanType] || 'in-person'
  }
}
