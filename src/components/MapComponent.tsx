'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Clinic } from '@/types/clinic'

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom marker icons
const createCustomIcon = (isRealWalkIn: boolean) => {
  const color = isRealWalkIn ? '#10b981' : '#f59e0b'
  const svgIcon = `
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 9.375 12.5 28.125 12.5 28.125S25 21.875 25 12.5C25 5.596 19.404 0 12.5 0z" 
            fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="12.5" cy="12.5" r="6" fill="white"/>
    </svg>
  `
  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  })
}

interface MapComponentProps {
  clinics: Clinic[]
  onClinicSelect: (clinic: Clinic) => void
  selectedClinic: Clinic | null
}

// Component to handle map centering when clinic is selected
function MapController({ selectedClinic }: { selectedClinic: Clinic | null }) {
  const map = useMap()

  useEffect(() => {
    if (selectedClinic) {
      map.flyTo([selectedClinic.latitude, selectedClinic.longitude], 13, {
        duration: 1,
      })
    }
  }, [selectedClinic, map])

  return null
}

export default function MapComponent({ clinics, onClinicSelect, selectedClinic }: MapComponentProps) {
  // Center on BC, Canada
  const center: [number, number] = [49.2827, -123.1207]

  return (
    <MapContainer
      center={center}
      zoom={10}
      className="h-full w-full"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapController selectedClinic={selectedClinic} />

      {clinics.map((clinic) => (
        <Marker
          key={clinic.id}
          position={[clinic.latitude, clinic.longitude]}
          icon={createCustomIcon(clinic.isRealWalkIn)}
          eventHandlers={{
            click: () => onClinicSelect(clinic),
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-bold text-lg mb-1">{clinic.name}</h3>
              {clinic.isRealWalkIn && (
                <span className="inline-block bg-secondary text-white text-xs px-2 py-1 rounded mb-2">
                  Real Walk-In
                </span>
              )}
              <p className="text-sm mb-2">{clinic.address}</p>
              {clinic.phone && (
                <p className="text-sm mb-1">
                  <strong>Phone:</strong> {clinic.phone}
                </p>
              )}
              {!clinic.isRealWalkIn && clinic.nextAvailableSlot && (
                <p className="text-sm mb-2">
                  <strong>Next Available:</strong><br />
                  {new Date(clinic.nextAvailableSlot).toLocaleString()}
                </p>
              )}
              {clinic.website && (
                <a
                  href={clinic.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  Visit Website →
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
