// Metro Vancouver clinics using Doctr for online booking
// Discovered by visiting clinic websites and finding doctr.ca booking links

export interface DoctrClinicConfig {
  name: string
  clinicId: string // Doctr clinic ID
  city: string
  address: string
  postalCode: string
  latitude: number
  longitude: number
  phone?: string
  website?: string
}

export const DOCTR_CLINICS: DoctrClinicConfig[] = [
  // === VANCOUVER ===
  {
    name: 'Maple Medical Clinic',
    clinicId: '739408',
    city: 'Vancouver',
    address: '#103, 2025 W Broadway, Vancouver, BC',
    postalCode: 'V6J 1Z6',
    latitude: 49.2636,
    longitude: -123.1500,
    phone: '(604) 730-9769',
    website: 'https://www.doctr.ca/app/clinics/739408/Maple-Medical-Clinic/en',
  },

  // === SURREY ===
  {
    name: 'Guildford Medical Clinic',
    clinicId: 'guildford', // TODO: discover actual Doctr clinic ID
    city: 'Surrey',
    address: '14650 104th Avenue, Surrey, BC',
    postalCode: 'V3R 1M3',
    latitude: 49.1878,
    longitude: -122.8014,
    phone: '(604) 582-8985',
    website: 'https://www.doctr.ca/',
  },
  {
    name: 'Clover Care Medical Clinic',
    clinicId: 'clovercare', // TODO: discover actual Doctr clinic ID
    city: 'Surrey',
    address: '17770 56th Avenue, Surrey, BC',
    postalCode: 'V3S 1C7',
    latitude: 49.1043,
    longitude: -122.7225,
    phone: '(604) 574-7883',
    website: 'https://www.doctr.ca/',
  },
]
