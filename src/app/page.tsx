'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { Clinic } from '@/types/clinic'
import { getClinicAvailability } from '@/lib/booking-adapters'
import CalendarView from '@/components/CalendarView'

// Import map component dynamically to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <p className="text-lg">Loading map...</p>
    </div>
  ),
})

export default function Home() {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [hoveredClinicId, setHoveredClinicId] = useState<string | null>(null)

  useEffect(() => {
    loadClinics()
  }, [])

  async function loadClinics() {
    setLoading(true)
    try {
      // Fetch clinics from the database API
      const response = await fetch('/api/clinics')
      if (!response.ok) {
        throw new Error('Failed to fetch clinics')
      }
      
      const clinicsFromDb: Clinic[] = await response.json()

      // Fetch next available slots for clinics with booking systems
      const clinicsWithSlots = await Promise.all(
        clinicsFromDb.map(async (clinic) => {
          if (!clinic.isRealWalkIn && clinic.apiProvider && clinic.providerId) {
            try {
              // Use the adapter system - works with any booking provider!
              const nextSlot = await getClinicAvailability({
                apiProvider: clinic.apiProvider,
                providerId: clinic.providerId,
                apiConfig: clinic.apiConfig,
                daysToCheck: 14,
              })
              
              if (nextSlot) {
                return {
                  ...clinic,
                  nextAvailableSlot: nextSlot.startTime.toISOString(),
                }
              }
            } catch (error) {
              console.error(`Error fetching availability for ${clinic.name}:`, error)
            }
          }
          return clinic
        })
      )

      setClinics(clinicsWithSlots)
    } catch (error) {
      console.error('Failed to load clinics:', error)
      setClinics([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  function handleViewCalendar(clinic: Clinic) {
    setShowCalendar(true)
  }

  // Sort clinics: Real walk-ins first, then by next available slot
  const sortedClinics = [...clinics].sort((a, b) => {
    if (a.isRealWalkIn && !b.isRealWalkIn) return -1
    if (!a.isRealWalkIn && b.isRealWalkIn) return 1
    if (!a.isRealWalkIn && !b.isRealWalkIn && a.nextAvailableSlot && b.nextAvailableSlot) {
      return new Date(a.nextAvailableSlot).getTime() - new Date(b.nextAvailableSlot).getTime()
    }
    return 0
  })

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-primary text-white p-4 shadow-lg z-20 relative">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Walk-In Clinics BC</h1>
          <p className="text-sm opacity-90">Find available walk-in clinics near you</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar - Clinic List */}
        <div className="w-96 bg-white shadow-lg overflow-y-auto z-10 relative">
          <div className="p-4">
            {/* Legend */}
            <div className="mb-4 pb-4 border-b">
              <h2 className="text-sm font-bold mb-2 text-gray-700">LEGEND</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-secondary"></div>
                  <span className="text-xs text-gray-600">Real Walk-In (No booking)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-xs text-gray-600">Booking Required</span>
                </div>
              </div>
            </div>

            {/* Clinic Rankings */}
            <div>
              <h2 className="text-sm font-bold mb-3 text-gray-700">
                CLINICS ({clinics.length})
              </h2>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-500">Loading clinics...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedClinics.map((clinic, index) => (
                    <div
                      key={clinic.id}
                      onClick={() => setSelectedClinic(clinic)}
                      onMouseEnter={() => setHoveredClinicId(clinic.id)}
                      onMouseLeave={() => setHoveredClinicId(null)}
                      className={`p-3 rounded-lg cursor-pointer transition border ${
                        selectedClinic?.id === clinic.id
                          ? 'bg-blue-50 border-primary shadow-md'
                          : hoveredClinicId === clinic.id
                          ? 'bg-gray-50 border-gray-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          clinic.isRealWalkIn ? 'bg-secondary text-white' : 'bg-yellow-500 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 truncate">
                            {clinic.name}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {clinic.address}
                          </p>
                          {clinic.isRealWalkIn ? (
                            <div className="mt-2">
                              <span className="inline-block bg-secondary text-white text-xs px-2 py-0.5 rounded">
                                ✓ Walk-In Available
                              </span>
                            </div>
                          ) : clinic.nextAvailableSlot ? (
                            <p className="text-xs text-gray-500 mt-2">
                              <span className="font-medium">Next available:</span> {new Date(clinic.nextAvailableSlot).toLocaleString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: 'numeric', 
                                minute: '2-digit' 
                              })}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detail Panel - Appears when clinic is selected */}
        {selectedClinic && (
          <div className="w-96 bg-white shadow-2xl overflow-y-auto z-10 relative border-l">
            <div className="p-6">
              {/* Close button */}
              <button
                onClick={() => setSelectedClinic(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="space-y-4">
                {/* Clinic Name */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedClinic.name}</h2>
                  {selectedClinic.isRealWalkIn && (
                    <span className="inline-block bg-secondary text-white text-xs px-3 py-1 rounded-full mt-2">
                      Real Walk-In Clinic
                    </span>
                  )}
                </div>

                {/* Address */}
                <div className="pt-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Address</h3>
                  <p className="text-sm text-gray-900">{selectedClinic.address}</p>
                </div>

                {/* Phone */}
                {selectedClinic.phone && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Phone</h3>
                    <a 
                      href={`tel:${selectedClinic.phone}`} 
                      className="text-sm text-primary hover:underline"
                    >
                      {selectedClinic.phone}
                    </a>
                  </div>
                )}

                {/* Hours */}
                {selectedClinic.hours && selectedClinic.hours.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Hours</h3>
                    <div className="text-sm text-gray-900">
                      {selectedClinic.hours.map((hour) => (
                        <div key={hour.id}>
                          {hour.isClosed ? 'Closed' : `${hour.openTime} - ${hour.closeTime}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Available Slot */}
                {!selectedClinic.isRealWalkIn && selectedClinic.nextAvailableSlot && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase mb-1">
                      Next Available Appointment
                    </h3>
                    <p className="text-lg font-bold text-gray-900">
                      {new Date(selectedClinic.nextAvailableSlot).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  {!selectedClinic.isRealWalkIn && selectedClinic.providerId && (
                    <button
                      onClick={() => handleViewCalendar(selectedClinic)}
                      className="w-full bg-primary text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2"
                    >
                      <span>📅</span>
                      <span>View All Available Times</span>
                    </button>
                  )}

                  {selectedClinic.website && (
                    <a 
                      href={selectedClinic.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full bg-white border-2 border-primary text-primary px-4 py-3 rounded-lg hover:bg-blue-50 transition font-semibold text-center"
                    >
                      Visit Website
                    </a>
                  )}

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedClinic.latitude},${selectedClinic.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-white border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition font-semibold text-center"
                  >
                    Get Directions
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p>Loading clinics...</p>
            </div>
          ) : (
            <MapComponent 
              clinics={clinics} 
              onClinicSelect={setSelectedClinic}
              selectedClinic={selectedClinic}
            />
          )}
        </div>
      </div>

      {/* Calendar Modal */}
      {showCalendar && selectedClinic?.providerId && (
        <CalendarView
          providerId={selectedClinic.providerId}
          location="m"
          onClose={() => setShowCalendar(false)}
          clinicName={selectedClinic.name}
          bookingUrl={selectedClinic.bookingUrl || undefined}
        />
      )}
    </div>
  )
}
