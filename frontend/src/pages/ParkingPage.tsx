import { useEffect, useState } from 'react'
import { listSlots, suggestSlot } from '../services/parking'
import ParkingGrid from '../components/ParkingGrid'

type Slot = {
  _id: string
  code: string
  status: 'available' | 'occupied'
  vehicleId?: {
    _id: string
    plateNumber: string
  } | null
}

export default function ParkingPage() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const role = localStorage.getItem('role') || 'user'
  const [suggested, setSuggested] = useState<Slot | null>(null)

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

  async function handleSuggest() {
    try {
      setLoading(true)
      const s = await suggestSlot()
      setSuggested(s)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No slot suggested')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading parking slots...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{role === 'admin' ? 'All Parking Slots' : 'My Vehicle Location'}</h2>
          <p className="text-sm text-muted">Quick overview of parking slots and their status</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={loadSlots} className="px-4 py-2 rounded bg-gray-800 text-white text-sm">Refresh</button>
          {role === 'admin' && (
            <>
              <button onClick={handleSuggest} className="px-4 py-2 rounded bg-blue-600 text-white text-sm">Suggest Slot</button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {suggested && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          Suggested slot: <strong>{suggested.code}</strong>
        </div>
      )}

      {slots.length === 0 ? (
        <div className="bg-gray-50 border rounded p-8 text-center text-gray-500">No parking slots found.</div>
      ) : (
        <div className="card">
          <ParkingGrid
            slots={slots.map((s) => ({
              id: s._id,
              code: s.code,
              // Cast status về literal union để khớp với ParkingGrid
              status: s.status as 'available' | 'occupied',
              // Chuẩn hoá vehicleId thành object có plateNumber hoặc undefined
              vehicleId: s.vehicleId ? { plateNumber: s.vehicleId.plateNumber } : undefined,
            }))}
          />
        </div>
      )}
    </div>
  )
}