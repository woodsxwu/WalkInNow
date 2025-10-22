import { Clinic, TimeSlotResponse, CarefinitiResponse, CarefinitiSlot, SlotsByType } from '@/types/clinic'

// Base URL for your API - update this when you have your actual API endpoint
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

/**
 * Fetch all clinics data
 */
export async function fetchClinics(): Promise<Clinic[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/clinics`)
    if (!response.ok) {
      throw new Error('Failed to fetch clinics')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching clinics:', error)
    throw error
  }
}

/**
 * Format date according to the clinic's date format (from database)
 */
function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  // Support common date formats
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
}

/**
 * Fetch available slots for a clinic using its API URL template
 */
export async function fetchClinicSlots(
  apiUrlTemplate: string,
  date: Date,
  dateFormat: string = 'YYYY-MM-DD'
): Promise<CarefinitiResponse> {
  try {
    const dateStr = formatDate(date, dateFormat)
    const url = apiUrlTemplate.replace('{date}', dateStr)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch slots: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error(`Error fetching slots:`, error)
    throw error
  }
}

/**
 * Find the next available time slot for a clinic
 */
export async function findNextAvailableSlot(
  apiUrlTemplate: string,
  dateFormat: string = 'YYYY-MM-DD',
  daysToCheck: number = 14
): Promise<{ date: string; slot: CarefinitiSlot } | null> {
  const today = new Date()
  const now = new Date()
  
  for (let i = 0; i < daysToCheck; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(today.getDate() + i)
    const dateStr = formatDate(checkDate, dateFormat)
    
    try {
      const response = await fetchClinicSlots(apiUrlTemplate, checkDate, dateFormat)
      const dayData = response[dateStr]
      
      if (!dayData) continue
      
      // Combine all slot types (clinic, video, phone)
      const allSlots = [
        ...dayData.clinic_slots,
        ...dayData.video_slots,
        ...dayData.phone_slots,
      ]
      
      // Filter slots that are in the future
      const availableSlots = allSlots.filter(slot => {
        const slotDateTime = new Date(slot.start_datetime)
        return slotDateTime > now
      })
      
      // Sort by start time and return the first one
      if (availableSlots.length > 0) {
        availableSlots.sort((a, b) => 
          new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
        )
        return { date: dateStr, slot: availableSlots[0] }
      }
    } catch (error) {
      console.error(`Error checking date ${dateStr}:`, error)
      continue
    }
  }
  
  return null
}

/**
 * Fetch time slot information for a specific clinic
 * @param clinicId - The ID of the clinic to fetch time slots for
 */
export async function fetchTimeSlot(clinicId: string): Promise<TimeSlotResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/timeslots/${clinicId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch time slot for clinic ${clinicId}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`Error fetching time slot for clinic ${clinicId}:`, error)
    throw error
  }
}

/**
 * Fetch time slots for multiple clinics
 * @param clinicIds - Array of clinic IDs
 */
export async function fetchTimeSlots(clinicIds: string[]): Promise<TimeSlotResponse[]> {
  try {
    const promises = clinicIds.map(id => fetchTimeSlot(id))
    return await Promise.all(promises)
  } catch (error) {
    console.error('Error fetching time slots:', error)
    throw error
  }
}

/**
 * Fetch all available slots for a clinic for multiple days (for calendar view)
 * Returns slots separated by type (clinic, phone, video)
 */
export async function fetchSlotsForDateRange(
  apiUrlTemplate: string,
  startDate: Date,
  days: number = 7,
  dateFormat: string = 'YYYY-MM-DD'
): Promise<Map<string, SlotsByType>> {
  const slotsMap = new Map<string, SlotsByType>()
  const now = new Date()
  
  const promises = Array.from({ length: days }, async (_, i) => {
    const checkDate = new Date(startDate)
    checkDate.setDate(startDate.getDate() + i)
    const dateStr = formatDate(checkDate, dateFormat)
    
    try {
      const response = await fetchClinicSlots(apiUrlTemplate, checkDate, dateFormat)
      const dayData = response[dateStr]
      
      if (dayData) {
        // Filter future slots only for each type
        const filterFutureSlots = (slots: CarefinitiSlot[]) => 
          slots.filter(slot => {
            const slotDateTime = new Date(slot.start_datetime)
            return slotDateTime > now
          })
        
        const clinicSlots = filterFutureSlots(dayData.clinic_slots)
        const phoneSlots = filterFutureSlots(dayData.phone_slots)
        const videoSlots = filterFutureSlots(dayData.video_slots)
        
        if (clinicSlots.length > 0 || phoneSlots.length > 0 || videoSlots.length > 0) {
          slotsMap.set(dateStr, {
            clinic: clinicSlots,
            phone: phoneSlots,
            video: videoSlots,
          })
        }
      }
    } catch (error) {
      console.error(`Error fetching slots for ${dateStr}:`, error)
    }
  })
  
  await Promise.all(promises)
  return slotsMap
}

/**
 * Update clinic data with time slot information
 * @param clinics - Array of clinics
 * @param timeSlots - Array of time slot responses
 */
export function mergeClinicsWithTimeSlots(
  clinics: Clinic[],
  timeSlots: TimeSlotResponse[]
): Clinic[] {
  const timeSlotMap = new Map(timeSlots.map(ts => [ts.clinicId, ts.nextAvailableSlot]))
  
  return clinics.map(clinic => ({
    ...clinic,
    nextAvailableSlot: clinic.isRealWalkIn ? undefined : timeSlotMap.get(clinic.id) || undefined,
  }))
}
