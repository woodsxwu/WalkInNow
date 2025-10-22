'use client'

import { useEffect, useRef, useState } from 'react'
import { Clinic } from '@/types/clinic'

interface MapComponentProps {
  clinics: Clinic[]
  selectedClinic: Clinic | null
  onClinicSelect: (clinic: Clinic) => void
}

// Global flag to track if script is loading/loaded
let isScriptLoading = false
let isScriptLoaded = false

export default function MapComponent({ 
  clinics, 
  selectedClinic,
  onClinicSelect 
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const userMarkerRef = useRef<google.maps.Marker | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [apiKeyError, setApiKeyError] = useState(false)

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    
    // Check if API key is missing or is the placeholder
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      console.error('Google Maps API key is missing or invalid. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local')
      setApiKeyError(true)
      return
    }

    // Listen for Google Maps errors
    const handleGoogleMapsError = () => {
      console.error('Google Maps API error detected')
      setApiKeyError(true)
    }
    
    window.addEventListener('error', (e) => {
      if (e.message?.includes('Google Maps') || e.message?.includes('ApiNotActivatedMapError')) {
        handleGoogleMapsError()
      }
    })

    // Check if already loaded
    if (typeof window !== 'undefined' && (window as any).google?.maps?.Map) {
      setMapLoaded(true)
      isScriptLoaded = true
      return
    }

    // Check if script is already loading
    if (isScriptLoading) {
      const checkInterval = setInterval(() => {
        if (isScriptLoaded && (window as any).google?.maps?.Map) {
          setMapLoaded(true)
          clearInterval(checkInterval)
        }
      }, 100)
      return () => clearInterval(checkInterval)
    }

    // Load the script
    isScriptLoading = true
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      // Wait for google.maps to be fully available
      const checkGoogleMaps = () => {
        if ((window as any).google?.maps?.Map) {
          isScriptLoaded = true
          isScriptLoading = false
          setMapLoaded(true)
        } else {
          setTimeout(checkGoogleMaps, 50)
        }
      }
      checkGoogleMaps()
    }
    script.onerror = () => {
      console.error('Failed to load Google Maps script')
      isScriptLoading = false
      setApiKeyError(true)
    }
    document.head.appendChild(script)

    return () => {
      // Don't remove the script on unmount to prevent re-loading
    }
  }, [])

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.log('Location access denied or unavailable:', error)
          // Default to Vancouver, BC if location is denied
          setUserLocation({ lat: 49.2827, lng: -123.1207 })
        }
      )
    } else {
      // Default to Vancouver, BC
      setUserLocation({ lat: 49.2827, lng: -123.1207 })
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !userLocation || googleMapRef.current) return

    const google = (window as any).google
    if (!google) return

    // Create map centered on user location or BC
    const map = new google.maps.Map(mapRef.current, {
      center: userLocation,
      zoom: 11,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    })

    googleMapRef.current = map

    // Add user location marker
    const userMarker = new google.maps.Marker({
      position: userLocation,
      map: map,
      title: 'Your Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      zIndex: 1000,
    })

    userMarkerRef.current = userMarker

    // Add info window for user location
    const userInfoWindow = new google.maps.InfoWindow({
      content: '<div style="padding: 8px;"><strong>Your Location</strong></div>',
    })

    userMarker.addListener('click', () => {
      userInfoWindow.open(map, userMarker)
    })
  }, [mapLoaded, userLocation])

  // Update clinic markers
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return

    const google = (window as any).google
    if (!google) return

    console.log('=== MapComponent Debug ===')
    console.log('Total clinics received:', clinics.length)
    console.log('Clinics data:', clinics.map(c => ({
      name: c.name,
      lat: c.latitude,
      lng: c.longitude,
      hasCoords: !!(c.latitude && c.longitude)
    })))

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    // Add markers for each clinic
    const bounds = new google.maps.LatLngBounds()
    
    // Include user location in bounds
    if (userLocation) {
      bounds.extend(new google.maps.LatLng(userLocation.lat, userLocation.lng))
    }

    let markersAdded = 0
    clinics.forEach((clinic) => {
      if (!clinic.latitude || !clinic.longitude) {
        console.warn(`Skipping ${clinic.name} - missing coordinates:`, {
          lat: clinic.latitude,
          lng: clinic.longitude
        })
        return
      }

      markersAdded++
      const position = { lat: clinic.latitude, lng: clinic.longitude }
      
      console.log(`Adding marker for ${clinic.name} at`, position)
      
      // Create custom pin marker icon based on clinic type
      const pinColor = clinic.isRealWalkIn ? '#10b981' : '#eab308' // green for walk-in, yellow for booking
      const strokeColor = selectedClinic?.id === clinic.id ? '#1e40af' : '#ffffff'
      const strokeWidth = selectedClinic?.id === clinic.id ? 3 : 2
      
      // SVG path for a map pin shape
      const pinSVG = {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: pinColor,
        fillOpacity: 1,
        strokeColor: strokeColor,
        strokeWeight: strokeWidth,
        scale: 2,
        anchor: new google.maps.Point(12, 22), // Anchor point at bottom of pin
      }

      const marker = new google.maps.Marker({
        position,
        map: googleMapRef.current,
        title: clinic.name,
        icon: pinSVG,
        animation: selectedClinic?.id === clinic.id ? google.maps.Animation.BOUNCE : null,
        optimized: false, // Better rendering for custom SVG icons
      })

      // Create info window content
      const infoContent = `
        <div style="padding: 12px; max-width: 250px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px;">${clinic.name}</h3>
          <p style="margin: 4px 0; font-size: 13px; color: #666;">${clinic.address}</p>
          ${clinic.isRealWalkIn 
            ? '<p style="margin: 8px 0; padding: 4px 8px; background: #10b981; color: white; border-radius: 4px; display: inline-block; font-size: 12px;">✓ Walk-In Available</p>'
            : clinic.nextAvailableSlot 
              ? `<p style="margin: 8px 0; font-size: 12px; color: #666;"><strong>Next:</strong> ${new Date(clinic.nextAvailableSlot).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>`
              : ''
          }
          <button 
            onclick="window.dispatchEvent(new CustomEvent('clinic-marker-click', { detail: '${clinic.id}' }))"
            style="margin-top: 8px; padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; width: 100%;"
          >
            View Details
          </button>
        </div>
      `

      const infoWindow = new google.maps.InfoWindow({
        content: infoContent,
      })

      marker.addListener('click', () => {
        infoWindow.open(googleMapRef.current, marker)
        onClinicSelect(clinic)
      })

      // Open info window if this clinic is selected
      if (selectedClinic?.id === clinic.id) {
        infoWindow.open(googleMapRef.current, marker)
        googleMapRef.current?.panTo(position)
      }

      markersRef.current.push(marker)
      bounds.extend(position)
    })

    console.log(`Added ${markersAdded} markers out of ${clinics.length} clinics`)

    // Fit map to show all markers
    if (clinics.length > 0 && googleMapRef.current) {
      googleMapRef.current.fitBounds(bounds)
      
      // Don't zoom in too much if there's only one clinic
      google.maps.event.addListenerOnce(googleMapRef.current, 'bounds_changed', () => {
        const zoom = googleMapRef.current?.getZoom()
        if (zoom && zoom > 15) {
          googleMapRef.current?.setZoom(15)
        }
      })
    }
  }, [clinics, selectedClinic, mapLoaded, userLocation, onClinicSelect])

  // Handle custom event from info window button
  useEffect(() => {
    const handleMarkerClick = (event: Event) => {
      const customEvent = event as CustomEvent
      const clinicId = customEvent.detail
      const clinic = clinics.find((c) => c.id === clinicId)
      if (clinic) {
        onClinicSelect(clinic)
      }
    }

    window.addEventListener('clinic-marker-click', handleMarkerClick)
    return () => window.removeEventListener('clinic-marker-click', handleMarkerClick)
  }, [clinics, onClinicSelect])

  // Show API key error
  if (apiKeyError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Google Maps API Setup Required</h3>
          <p className="text-gray-600 mb-4">
            The Google Maps API needs to be enabled in your Google Cloud Console.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <p className="text-sm font-semibold text-blue-900 mb-2">Setup Instructions:</p>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Go to <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Google Cloud Console</a></li>
              <li>Create a new project or select existing one</li>
              <li className="font-bold">Enable these APIs:
                <ul className="ml-6 mt-1 space-y-1 list-disc">
                  <li>Maps JavaScript API</li>
                  <li>Places API (optional, for advanced features)</li>
                </ul>
              </li>
              <li>Go to "Credentials" → "Create Credentials" → "API Key"</li>
              <li>Copy your API key</li>
              <li>Open your <code className="bg-blue-100 px-1 rounded">.env.local</code> file</li>
              <li>Set <code className="bg-blue-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your API key</li>
              <li>Restart your development server</li>
            </ol>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-left mt-4">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> Google Maps requires billing enabled, but includes $200 free monthly credit (covers ~28,000 map loads).
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative">
      <div ref={mapRef} className="h-full w-full" />
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Legend */}
      {mapLoaded && (
        <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg p-4 z-10">
          <h3 className="font-bold text-sm mb-3 text-gray-700">Map Legend</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
              <span className="text-xs text-gray-700">Your Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-secondary border-2 border-white"></div>
              <span className="text-xs text-gray-700">Real Walk-In</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white"></div>
              <span className="text-xs text-gray-700">Booking Required</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
