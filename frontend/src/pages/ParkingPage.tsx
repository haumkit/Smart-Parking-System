import { useEffect, useState } from 'react'
import { listSlots } from '../services/parking'

type Slot = {
  _id: string
  code: string
  status: 'available' | 'occupied'
  vehicleId?: {
    _id: string
    plateNumber: string
  }
}

export default function ParkingPage() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const role = localStorage.getItem('role') || 'user'

  useEffect(() => {
    loadSlots()
  }, [])

  async function loadSlots() {
    try {
      setLoading(true)
      const data = await listSlots()
      setSlots(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load parking slots')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading parking slots...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>{error}</p>
        <button onClick={loadSlots} className="mt-4 px-4 py-2 rounded bg-gray-900 text-white">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {role === 'admin' ? 'All Parking Slots' : 'My Vehicle Location'}
        </h2>
        {role === 'admin' && (
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 rounded bg-blue-600 text-white">Suggest Slot</button>
            <button className="px-3 py-1 rounded bg-green-600 text-white">Check-In</button>
            <button className="px-3 py-1 rounded bg-amber-600 text-white">Check-Out</button>
          </div>
        )}
      </div>

      {role === 'user' && slots.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 text-center">
          <p className="text-blue-800">Your vehicle is not currently parked.</p>
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No parking slots found.</div>
      ) : (
        <div className="grid grid-cols-6 gap-2">
          {slots.map((slot) => (
            <div
              key={slot._id}
              className={`h-20 rounded border grid place-items-center text-sm p-2 ${
                slot.status === 'available'
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">{slot.code}</div>
                {slot.status === 'occupied' && slot.vehicleId && (
                  <div className="text-xs text-gray-600 mt-1">
                    {slot.vehicleId.plateNumber}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


