'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function NewClinic() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    // Build apiConfig JSON from form fields
    let apiConfig = null
    const apiProvider = formData.get('apiProvider')
    
    if (apiProvider && apiProvider !== '') {
      // Try to parse custom JSON if provided
      const customConfig = formData.get('apiConfigJson') as string
      if (customConfig && customConfig.trim()) {
        try {
          apiConfig = JSON.parse(customConfig)
        } catch (err) {
          setError('Invalid JSON in API Configuration. Please check the format.')
          setLoading(false)
          return
        }
      } else {
        // Build basic config from simple fields
        apiConfig = {}
        const location = formData.get('apiLocation')
        if (location) apiConfig.location = location
      }
    }
    
    const clinicData = {
      name: formData.get('name'),
      slug: formData.get('slug'),
      description: formData.get('description'),
      address: formData.get('address'),
      city: formData.get('city'),
      province: formData.get('province'),
      postalCode: formData.get('postalCode'),
      latitude: parseFloat(formData.get('latitude') as string),
      longitude: parseFloat(formData.get('longitude') as string),
      phone: formData.get('phone'),
      email: formData.get('email'),
      website: formData.get('website'),
      bookingUrl: formData.get('bookingUrl'),
      isRealWalkIn: formData.get('isRealWalkIn') === 'true',
      acceptsNewPatients: formData.get('acceptsNewPatients') === 'true',
      appointmentTypes: formData.get('appointmentTypes') ? 
        (formData.get('appointmentTypes') as string).split(',').map(s => s.trim()) : [],
      apiProvider: formData.get('apiProvider') || null,
      providerId: formData.get('providerId') || null,
      apiEndpoint: formData.get('apiEndpoint') || null,
      apiConfig: apiConfig,
    }

    try {
      const response = await fetch('/api/clinics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clinicData),
      })

      if (!response.ok) {
        throw new Error('Failed to create clinic')
      }

      router.push('/admin/dashboard')
    } catch (err) {
      setError('Failed to create clinic. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold mb-6">Add New Clinic</h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clinic Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Appletree Medical Group"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug (URL-friendly name) *
                  </label>
                  <input
                    type="text"
                    name="slug"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., appletree-carling"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of the clinic..."
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="text-lg font-medium mb-4">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 2910 Carling Ave"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Ottawa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Province *
                  </label>
                  <input
                    type="text"
                    name="province"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., ON"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., K2B 7J1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 45.3515"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., -75.7880"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 613-596-8000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., info@clinic.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://www.clinic.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Booking URL
                  </label>
                  <input
                    type="url"
                    name="bookingUrl"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://booking.clinic.com"
                  />
                </div>
              </div>
            </div>

            {/* Availability Settings */}
            <div>
              <h3 className="text-lg font-medium mb-4">Availability Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clinic Type *
                  </label>
                  <select
                    name="isRealWalkIn"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="false">Appointment Required</option>
                    <option value="true">Real Walk-in (No Booking)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accepting New Patients *
                  </label>
                  <select
                    name="acceptsNewPatients"
                    defaultValue="true"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Appointment Types (comma-separated)
                  </label>
                  <input
                    type="text"
                    name="appointmentTypes"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., in-person, video, phone"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter types separated by commas (e.g., in-person, video, phone)
                  </p>
                </div>
              </div>
            </div>

            {/* API Integration (Optional) */}
            <div>
              <h3 className="text-lg font-medium mb-4">API Integration (Optional)</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Provider
                    </label>
                    <select
                      name="apiProvider"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">None</option>
                      <option value="carefiniti">Carefiniti/Cortico</option>
                      <option value="ocean">Ocean</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provider ID
                    </label>
                    <input
                      type="text"
                      name="providerId"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 127"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The clinic's ID in the booking system
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Code (for Carefiniti)
                  </label>
                  <input
                    type="text"
                    name="apiLocation"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., m"
                    defaultValue="m"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Usually 'm' for main location. Leave as 'm' if unsure.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Endpoint (Optional)
                  </label>
                  <input
                    type="url"
                    name="apiEndpoint"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Leave empty to use default"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Override the default API endpoint URL
                  </p>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Advanced: Custom API Configuration (JSON)
                  </label>
                  <textarea
                    name="apiConfigJson"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder='e.g., {"location": "m", "urlTemplate": "https://..."}'
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: For advanced configurations, enter custom JSON here. This will override the simple fields above.
                    <br />
                    Example: <code className="bg-gray-100 px-1 rounded">{"{"}"location": "m", "urlTemplate": "https://custom-url/{"{providerId}"}/{"{date}"}/?location={"{location}"}"{"}"}</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => router.push('/admin/dashboard')}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
              >
                {loading ? 'Creating...' : 'Create Clinic'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
