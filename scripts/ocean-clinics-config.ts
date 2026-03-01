// Metro Vancouver clinics using OceanMD / CognisantMD for online booking
// Discovered by visiting clinic websites and finding ocean.cognisantmd.com booking links

export interface OceanClinicConfig {
  name: string
  uuid: string // OceanMD online-booking UUID
  city: string
  address: string
  postalCode: string
  latitude: number
  longitude: number
  phone?: string
  website?: string
}

export const OCEAN_CLINICS: OceanClinicConfig[] = [
  // === VANCOUVER ===
  {
    name: 'WELL Health Hastings Sunrise',
    uuid: 'c83f6178-ef92-4803-991e-f3de23843dea',
    city: 'Vancouver',
    address: 'Suite 102 – 2280 E Hastings Street, Vancouver, BC',
    postalCode: 'V5L 1V4',
    latitude: 49.2812,
    longitude: -123.0447,
    phone: '(604) 253-3166',
    website: 'https://wellclinics.ca/british-columbia/vancouver/hastings-sunrise-whmc/',
  },
  {
    name: 'Pacific Medical Clinic Grandview',
    uuid: '633ec2f7-2791-4ddb-b909-50d301aa5569',
    city: 'Vancouver',
    address: '3185 Grandview Hwy, Vancouver, BC',
    postalCode: 'V5M 2E9',
    latitude: 49.2580,
    longitude: -123.0445,
    phone: '(604) 434-2222',
    website: 'https://pacificmedicalvancouver.com/',
  },
]
