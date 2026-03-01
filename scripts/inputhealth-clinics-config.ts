// Metro Vancouver clinics using InputHealth (TELUS CHR) for online booking
// Discovered by visiting clinic websites and finding *.inputhealth.com/ebooking links

export interface InputHealthClinicConfig {
  name: string
  clinicSlug: string // InputHealth domain prefix (e.g. 'cpdavie' for cpdavie.inputhealth.com)
  city: string
  address: string
  postalCode: string
  latitude: number
  longitude: number
  phone?: string
  website?: string
}

export const INPUTHEALTH_CLINICS: InputHealthClinicConfig[] = [
  // === VANCOUVER ===
  {
    name: 'Care Point Medical Davie',
    clinicSlug: 'cpdavie',
    city: 'Vancouver',
    address: '1123 Davie Street, Vancouver, BC',
    postalCode: 'V6E 1N2',
    latitude: 49.2779,
    longitude: -123.1291,
    phone: '(604) 915-9517',
    website: 'https://www.carepoint.ca/',
  },
  {
    name: 'Care Point Medical Grandview-Woodland',
    clinicSlug: 'carepoint',
    city: 'Vancouver',
    address: '1623 Commercial Drive, Vancouver, BC',
    postalCode: 'V5L 3Y3',
    latitude: 49.2715,
    longitude: -123.0697,
    phone: '(604) 254-5554',
    website: 'https://www.carepoint.ca/',
  },
  {
    name: 'Care Point Medical Collingwood',
    clinicSlug: 'carepoint',
    city: 'Vancouver',
    address: '5138 Joyce Street, Vancouver, BC',
    postalCode: 'V5R 4H1',
    latitude: 49.2340,
    longitude: -123.0308,
    phone: '(604) 568-3988',
    website: 'https://www.carepoint.ca/',
  },
]
