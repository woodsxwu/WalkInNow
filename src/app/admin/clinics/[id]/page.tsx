'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Clinic {
  id: string
  name: string
  slug: string
  description?: string
  address: string
  city: string
  province: string
  postalCode?: string
  phone?: string
  email?: string
  website?: string
  isRealWalkIn: boolean
  acceptsNewPatients: boolean
  appointmentTypes: string[]
  apiUrlTemplate?: string
  apiDateFormat?: string
}

export default function EditClinic() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [clinic, setClinic] = useState<Clinic | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && params.id) {
      fetchClinic()
    }
  }, [status, params.id])

  const fetchClinic = async () => {
    try {
      const response = await fetch(`/api/clinics/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setClinic(data)
      } else {
        setError('Failed to load clinic')
      }
    } catch (err) {
      setError('Failed to load clinic')
      console.error(err)
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    const clinicData = {
      name: formData.get('name'),
      slug: formData.get('slug'),
      description: formData.get('description'),
      address: formData.get('address'),
      city: formData.get('city'),
      province: formData.get('province'),
      postalCode: formData.get('postalCode'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      website: formData.get('website'),
      isRealWalkIn: formData.get('isRealWalkIn') === 'true',
      acceptsNewPatients: formData.get('acceptsNewPatients') === 'true',
      appointmentTypes: formData.get('appointmentTypes') ? 
        (formData.get('appointmentTypes') as string).split(',').map(s => s.trim()) : [],
      apiUrlTemplate: formData.get('apiUrlTemplate') || null,
      apiDateFormat: formData.get('apiDateFormat') || null,
    }

    try {
      const response = await fetch(`/api/clinics/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clinicData),
      })

      if (!response.ok) {
        throw new Error('Failed to update clinic')
      }

      router.push('/admin/dashboard')
    } catch (err) {
      setError('Failed to update clinic. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session || !clinic) {
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
          <h2 className="text-2xl font-bold mb-6">Edit Clinic</h2>

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
                    defaultValue={clinic.name}
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
                    defaultValue={clinic.slug}
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
                    defaultValue={clinic.description || ''}
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
                    defaultValue={clinic.address}
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
                    defaultValue={clinic.city}
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
                    defaultValue={clinic.province}
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
                    defaultValue={clinic.postalCode || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., K2B 7J1"
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
                    defaultValue={clinic.phone || ''}
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
                    defaultValue={clinic.email || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., info@clinic.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    defaultValue={clinic.website || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://www.clinic.com"
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
                    defaultValue={clinic.isRealWalkIn ? 'true' : 'false'}
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
                    defaultValue={clinic.acceptsNewPatients ? 'true' : 'false'}
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
                    defaultValue={clinic.appointmentTypes?.join(', ') || ''}
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
              <p className="text-sm text-gray-600 mb-4">
                Configure the clinic's booking API. The system will automatically fetch availability using the URL template you provide.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API URL Template
                  </label>
                  <input
                    type="text"
                    name="apiUrlTemplate"
                    defaultValue={clinic.apiUrlTemplate || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Full URL with everything except dates"
                  />
                  <div className="text-xs text-gray-600 mt-2 space-y-1">
                    <p className="font-medium">Examples:</p>
                    <p className="font-mono bg-gray-50 p-2 rounded">
                      Cortico: https://carefiniti.cortico.ca/api/async/available-appointment-slots/127/{'{date}'}/walk-in-clinic/?location=m
                    </p>
                    <p className="font-mono bg-gray-50 p-2 rounded">
                      MedeoHealth: https://api-ca.medeohealth.com/v3/timeslots/org/1558/available/list?from={'{from}'}&to={'{to}'}&type=53324&count=100&page=1
                    </p>
                    <p className="mt-2">Use placeholders: {'{date}'}, {'{from}'}, {'{to}'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Format
                  </label>
                  <select
                    name="apiDateFormat"
                    defaultValue={clinic.apiDateFormat || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select format...</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g., 2025-10-27)</option>
                    <option value="ISO8601">ISO8601 (e.g., 2025-10-27T11:00:00.000-07:00)</option>
                    <option value="YYYY/MM/DD">YYYY/MM/DD (e.g., 2025/10/27)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    How dates should be formatted in the API URL
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
                {loading ? 'Updating...' : 'Update Clinic'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
