export interface Clinic {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  
  // Location
  address: string;
  city: string;
  province: string;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  
  // Contact
  phone?: string | null;
  fax?: string | null;
  email?: string | null;
  website?: string | null;
  bookingUrl?: string | null;
  
  // Booking & availability
  isRealWalkIn: boolean; // true if no booking required
  acceptsNewPatients: boolean;
  appointmentTypes?: any; // JSON field: ['in-person', 'phone', 'video']
  
  // API Integration (legacy)
  apiUrlTemplate?: string | null;
  apiDateFormat?: string | null;
  
  // Metadata
  isActive: boolean;
  lastVerifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations (optional, when included)
  hours?: ClinicHours[];
  services?: ClinicService[];
  providers?: Provider[];
  
  // Runtime fields (not in DB, added by frontend)
  nextAvailableSlot?: string; // ISO date string - calculated at runtime
  providerId?: string; // Added at runtime for calendar functionality
  location?: string; // Added at runtime for API calls
}

export interface ClinicHours {
  id: string;
  clinicId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  openTime?: string | null;
  closeTime?: string | null;
  isClosed: boolean;
  notes?: string | null;
}

export interface ClinicService {
  id: string;
  clinicId: string;
  serviceType: string; // 'walk-in', 'lab', 'x-ray', 'prescriptions', etc.
  isAvailable: boolean;
  notes?: string | null;
}

export interface Provider {
  id: string;
  clinicId: string;
  name: string;
  credentials?: string | null;
  specialization?: string | null;
  carefinitiProviderNo?: string | null;
  isAcceptingPatients: boolean;
  scheduleNotes?: string | null;
}

export interface TimeSlotResponse {
  clinicId: string;
  nextAvailableSlot: string | null;
  availableSlots?: CarefinitiSlot[];
}

// Carefiniti API specific types
export interface CarefinitiSlot {
  start_time: string;
  end_time: string;
  value: string;
  start_datetime: string;
  provider_no: string;
}

export interface CarefinitiDaySlots {
  provider_no: string;
  clinic_slots: CarefinitiSlot[];
  video_slots: CarefinitiSlot[];
  phone_slots: CarefinitiSlot[];
  home_visit_slots: CarefinitiSlot[];
}

export interface CarefinitiResponse {
  [date: string]: CarefinitiDaySlots;
}

export interface SlotsByType {
  clinic: CarefinitiSlot[];
  phone: CarefinitiSlot[];
  video: CarefinitiSlot[];
}
