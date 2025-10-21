// Base interface that all booking system adapters must implement
export interface BookingSystemAdapter {
  providerName: string
  
  // Fetch available slots for a date range
  fetchAvailableSlots(config: {
    providerId: string
    startDate: Date
    endDate: Date
    apiConfig?: any
  }): Promise<AvailableSlot[]>
  
  // Find the next available slot
  findNextAvailableSlot(config: {
    providerId: string
    daysToCheck?: number
    apiConfig?: any
  }): Promise<AvailableSlot | null>
}

// Normalized slot format (what your app uses internally)
export interface AvailableSlot {
  startTime: Date
  endTime: Date
  type: 'in-person' | 'video' | 'phone'
  providerId?: string
  bookingUrl?: string
  metadata?: any // Provider-specific extra data
}

// Adapter registry
export class BookingSystemRegistry {
  private static adapters = new Map<string, BookingSystemAdapter>()
  
  static register(provider: string, adapter: BookingSystemAdapter) {
    this.adapters.set(provider, adapter)
  }
  
  static getAdapter(provider: string): BookingSystemAdapter | null {
    return this.adapters.get(provider) || null
  }
}
