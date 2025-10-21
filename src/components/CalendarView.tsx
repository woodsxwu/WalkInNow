'use client'

import { useState, useEffect } from 'react'
import { CarefinitiSlot, SlotsByType } from '@/types/clinic'
import { fetchSlotsForDateRange } from '@/lib/api'

interface CalendarViewProps {
  providerId: string
  location?: string
  onClose: () => void
  clinicName: string
  bookingUrl?: string
}

type AppointmentType = 'clinic' | 'phone' | 'video'

export default function CalendarView({ 
  providerId, 
  location = 'm', 
  onClose, 
  clinicName,
  bookingUrl 
}: CalendarViewProps) {
  const [slotsMap, setSlotsMap] = useState<Map<string, SlotsByType>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(new Date())
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('clinic')

  useEffect(() => {
    loadSlots()
  }, [providerId, location, startDate])

  async function loadSlots() {
    setLoading(true)
    try {
      const slots = await fetchSlotsForDateRange(providerId, startDate, 7, location)
      setSlotsMap(slots)
    } catch (error) {
      console.error('Error loading slots:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatDateShort(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00')
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`
  }

  function formatDateLong(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00')
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  }

  function goToNextWeek() {
    const nextWeek = new Date(startDate)
    nextWeek.setDate(startDate.getDate() + 7)
    setStartDate(nextWeek)
    setSelectedDate(null)
  }

  function goToPrevWeek() {
    const prevWeek = new Date(startDate)
    prevWeek.setDate(startDate.getDate() - 7)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (prevWeek >= today) {
      setStartDate(prevWeek)
      setSelectedDate(null)
    }
  }

  const selectedDaySlots = selectedDate ? slotsMap.get(selectedDate) : null
  const selectedSlots = selectedDaySlots ? selectedDaySlots[appointmentType] || [] : []
  
  // Count total slots for the selected date
  const totalSlotsForDate = selectedDaySlots 
    ? selectedDaySlots.clinic.length + selectedDaySlots.phone.length + selectedDaySlots.video.length
    : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-primary text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{clinicName}</h2>
              <p className="text-sm opacity-90 mt-1">Select a date to view available appointment times</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-gray-500">Loading available slots...</p>
            </div>
          ) : (
            <div>
              {/* Week Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={goToPrevWeek}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={startDate <= new Date()}
                >
                  ← Previous Week
                </button>
                <span className="font-semibold text-gray-700">
                  {formatDateShort(startDate.toISOString().split('T')[0])} - {formatDateShort(new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
                </span>
                <button
                  onClick={goToNextWeek}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Next Week →
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {Array.from({ length: 7 }, (_, i) => {
                  const date = new Date(startDate)
                  date.setDate(startDate.getDate() + i)
                  const dateStr = date.toISOString().split('T')[0]
                  const daySlots = slotsMap.get(dateStr)
                  const totalSlots = daySlots 
                    ? daySlots.clinic.length + daySlots.phone.length + daySlots.video.length
                    : 0
                  const hasSlots = totalSlots > 0
                  const isSelected = selectedDate === dateStr
                  const isToday = dateStr === new Date().toISOString().split('T')[0]

                  return (
                    <div
                      key={dateStr}
                      className={`border-2 rounded-lg p-3 text-center cursor-pointer transition ${
                        isSelected
                          ? 'border-primary bg-blue-50'
                          : hasSlots
                          ? 'border-gray-300 hover:border-primary hover:shadow-md'
                          : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                      }`}
                      onClick={() => hasSlots && setSelectedDate(dateStr)}
                    >
                      <div className={`text-xs font-medium mb-1 ${isToday ? 'text-primary' : 'text-gray-600'}`}>
                        {formatDateShort(dateStr).split(',')[0]}
                      </div>
                      <div className={`text-2xl font-bold mb-1 ${isSelected ? 'text-primary' : 'text-gray-800'}`}>
                        {date.getDate()}
                      </div>
                      <div className={`text-xs font-semibold ${hasSlots ? 'text-secondary' : 'text-gray-400'}`}>
                        {hasSlots ? `${totalSlots} slot${totalSlots !== 1 ? 's' : ''}` : 'No slots'}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Selected Date Slots */}
              {selectedDate && selectedDaySlots && (
                <div className="border-t pt-6">
                  <h3 className="font-bold text-xl mb-4 text-gray-800">
                    {formatDateLong(selectedDate)}
                  </h3>
                  
                  {/* Appointment Type Tabs */}
                  <div className="flex gap-2 mb-4 border-b">
                    <button
                      onClick={() => setAppointmentType('clinic')}
                      className={`px-4 py-2 font-semibold transition border-b-2 ${
                        appointmentType === 'clinic'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      🏥 In-Person ({selectedDaySlots.clinic.length})
                    </button>
                    <button
                      onClick={() => setAppointmentType('phone')}
                      className={`px-4 py-2 font-semibold transition border-b-2 ${
                        appointmentType === 'phone'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      📞 Phone ({selectedDaySlots.phone.length})
                    </button>
                    {selectedDaySlots.video.length > 0 && (
                      <button
                        onClick={() => setAppointmentType('video')}
                        className={`px-4 py-2 font-semibold transition border-b-2 ${
                          appointmentType === 'video'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        💻 Video ({selectedDaySlots.video.length})
                      </button>
                    )}
                  </div>

                  {/* Time Slots Grid */}
                  {selectedSlots.length > 0 ? (
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-80 overflow-y-auto p-2">
                      {selectedSlots.map((slot, idx) => (
                        <button
                          key={idx}
                          className="border-2 border-gray-300 rounded-lg px-3 py-3 text-sm font-medium text-center hover:bg-primary hover:text-white hover:border-primary transition cursor-pointer"
                          onClick={() => {
                            if (bookingUrl) {
                              window.open(bookingUrl, '_blank')
                            }
                          }}
                        >
                          {slot.start_time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No {appointmentType === 'clinic' ? 'in-person' : appointmentType} appointments available for this date.
                    </div>
                  )}

                  {bookingUrl && selectedSlots.length > 0 && (
                    <div className="mt-6 text-center">
                      <a
                        href={bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-primary text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold shadow-md"
                      >
                        Book Appointment Online →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {!selectedDate && (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg">Select a date above to view available time slots</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
