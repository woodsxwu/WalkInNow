import { BookingSystemAdapter, AvailableSlot } from './types'
import { CarefinitiResponse, CarefinitiSlot } from '@/types/clinic'

export class CarefinitiAdapter implements BookingSystemAdapter {
  providerName = 'carefiniti'
  
  async fetchAvailableSlots(config: {
    providerId: string
    startDate: Date
    endDate: Date
    apiConfig?: any
  }): Promise<AvailableSlot[]> {
    const slots: AvailableSlot[] = []
    const location = config.apiConfig?.location || 'm'
    
    // Support custom URL template from apiConfig
    const urlTemplate = config.apiConfig?.urlTemplate || 
      'https://carefiniti.cortico.ca/api/async/available-appointment-slots/{providerId}/{date}/walk-in-clinic/?location={location}'
    
    const currentDate = new Date(config.startDate)
    while (currentDate <= config.endDate) {
      const dateStr = this.formatDate(currentDate)
      
      try {
        // Replace template variables
        const url = urlTemplate
          .replace('{providerId}', config.providerId)
          .replace('{date}', dateStr)
          .replace('{location}', location)
        
        const response = await fetch(url)
        
        if (response.ok) {
          const data: CarefinitiResponse = await response.json()
          const dayData = data[dateStr]
          
          if (dayData) {
            // Convert Carefiniti format to normalized format
            slots.push(...this.convertSlots(dayData.clinic_slots, 'in-person'))
            slots.push(...this.convertSlots(dayData.video_slots, 'video'))
            slots.push(...this.convertSlots(dayData.phone_slots, 'phone'))
          }
        }
      } catch (error) {
        console.error(`Error fetching Carefiniti slots for ${dateStr}:`, error)
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return slots.filter(slot => slot.startTime > new Date())
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

  private convertSlots(
    carefinitiSlots: CarefinitiSlot[],
    type: AvailableSlot['type']
  ): AvailableSlot[] {
    return carefinitiSlots.map(slot => ({
      startTime: new Date(slot.start_datetime),
      endTime: new Date(slot.start_datetime), // Carefiniti doesn't provide end time
      type,
      providerId: slot.provider_no,
      metadata: {
        value: slot.value,
        originalData: slot,
      },
    }))
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}
