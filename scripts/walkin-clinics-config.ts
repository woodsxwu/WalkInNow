// True walk-in clinics in Metro Vancouver — no online booking system
// These are added with isRealWalkIn: true
//
// UPCCs (Urgent and Primary Care Centres) accept regular patients for
// common issues (sore throats, colds, minor injuries, Rx refills).
// They are NOT emergency-only. Triage-based: seen by urgency, not first-come.

export interface WalkInClinicConfig {
  name: string
  city: string
  address: string
  postalCode: string
  latitude: number
  longitude: number
  phone?: string
  website?: string
  hours?: string // Human-readable hours summary
  isUPCC: boolean // Government-run Urgent & Primary Care Centre
}

export const WALKIN_CLINICS: WalkInClinicConfig[] = [
  // === UPCCs — Vancouver Coastal Health ===
  {
    name: 'Vancouver City Centre UPCC',
    city: 'Vancouver',
    address: '1290 Hornby Street, Vancouver, BC',
    postalCode: 'V6Z 0A3',
    latitude: 49.2756,
    longitude: -123.1276,
    phone: '(604) 416-1811',
    website: 'https://www.vch.ca/en/location/vancouver-city-centre-urgent-primary-care-centre',
    hours: 'Mon-Sat 8am-10pm, Sun 9am-5pm',
    isUPCC: true,
  },
  {
    name: 'Southeast Vancouver UPCC',
    city: 'Vancouver',
    address: '5880 Victoria Drive, Vancouver, BC',
    postalCode: 'V5P 3W3',
    latitude: 49.2284,
    longitude: -123.0654,
    phone: '(604) 709-6767',
    website: 'https://www.vch.ca/en/location/southeast-vancouver-urgent-primary-care-centre',
    hours: '7 days, 365 days/year',
    isUPCC: true,
  },
  {
    name: 'Northeast Vancouver UPCC',
    city: 'Vancouver',
    address: '102-2788 East Hastings Street, Vancouver, BC',
    postalCode: 'V5K 1Z8',
    latitude: 49.2812,
    longitude: -123.0387,
    phone: '(604) 216-3138',
    website: 'https://www.vch.ca/en/location/northeast-urgent-primary-care-centre',
    hours: 'Mon-Sat 8am-10pm, Sun 9am-5pm',
    isUPCC: true,
  },
  {
    name: 'North Vancouver UPCC',
    city: 'North Vancouver',
    address: '221 West Esplanade, North Vancouver, BC',
    postalCode: 'V7M 3J3',
    latitude: 49.3108,
    longitude: -123.0740,
    phone: '(604) 904-3737',
    website: 'https://www.vch.ca/en/location/north-vancouver-urgent-and-primary-care-centre',
    hours: 'Mon-Sat 8am-10pm, Sun 9am-5pm',
    isUPCC: true,
  },

  // === UPCCs — Fraser Health ===
  {
    name: 'Surrey-Newton UPCC',
    city: 'Surrey',
    address: '6830 King George Blvd, Surrey, BC',
    postalCode: 'V3W 4Z9',
    latitude: 49.1295,
    longitude: -122.8467,
    phone: '(604) 572-2625',
    website: 'https://www.fraserhealth.ca/Service-Directory/Locations/Surrey/surrey-newton-urgent-and-primary-care-centre',
    hours: 'Mon-Fri 2pm-9pm, Weekends/holidays 9am-9pm',
    isUPCC: true,
  },
  {
    name: 'Burnaby UPCC (Metrotown)',
    city: 'Burnaby',
    address: '102-4555 Kingsway, Burnaby, BC',
    postalCode: 'V5H 4T8',
    latitude: 49.2270,
    longitude: -123.0001,
    phone: '(604) 451-4888',
    website: 'https://www.fraserhealth.ca/Service-Directory/Locations/Burnaby/burnaby-urgent-primary-care-centre',
    hours: '9am-8pm, 7 days',
    isUPCC: true,
  },

  // === Other True Walk-In Clinics ===
  {
    name: 'Stein Medical Clinic',
    city: 'Vancouver',
    address: '800-777 Hornby Street, Vancouver, BC',
    postalCode: 'V6Z 1S4',
    latitude: 49.2818,
    longitude: -123.1224,
    phone: '(604) 637-8777',
    website: 'https://steinmedical.com/',
    hours: 'Mon-Fri 9am-5pm',
    isUPCC: false,
  },
  {
    name: 'Raven Song Community Health Centre',
    city: 'Vancouver',
    address: '2450 Ontario Street, Vancouver, BC',
    postalCode: 'V5T 4T7',
    latitude: 49.2618,
    longitude: -123.1014,
    phone: '(604) 709-6400',
    website: 'https://www.vch.ca/en/location/raven-song-community-health-centre',
    hours: 'Mon-Fri 8:30am-5pm',
    isUPCC: false,
  },
  {
    name: 'Three Bridges Community Health Centre',
    city: 'Vancouver',
    address: '1292 Hornby Street, Vancouver, BC',
    postalCode: 'V6Z 0A3',
    latitude: 49.2757,
    longitude: -123.1275,
    phone: '(604) 736-9844',
    website: 'https://www.vch.ca/en/location/three-bridges-community-health-centre',
    hours: 'Mon-Fri 8:30am-4:30pm',
    isUPCC: false,
  },
]
