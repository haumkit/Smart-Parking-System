import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../services/api'
import { connectSlotDetectionStream, type SlotDetectionResponse } from '../services/ai'

interface Slot {
  _id: string
  slotNum: number
  code: string
  status: 'available' | 'occupied'
}

export default function ParkingStatusPage() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)

  const loadSlots = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet('/parking/slots')
      setSlots(data)
    } catch {
      console.error('Lỗi tải trạng thái bãi đỗ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSlots()
  }, [loadSlots])

  // Reuse slot SSE (như trang admin) để cập nhật realtime
  useEffect(() => {
    let es: EventSource | null = null
    try {
      es = connectSlotDetectionStream('parking', (data: SlotDetectionResponse) => {
        if (Array.isArray(data?.slots)) {
          const mapped: Slot[] = data.slots.map((s) => ({
            _id: s.code,
            slotNum: parseInt(String(s.code).replace(/^S/i, ''), 10) || 0,
            code: s.code,
            status: s.status === 'occupied' ? 'occupied' : 'available',
          }))
          setSlots(mapped)
          setLoading(false)
        }
      })
      es.onerror = () => {
        console.warn('SSE slot bị lỗi, fallback polling giữ nguyên')
      }
    } catch (err) {
      console.error('Không thể mở SSE slot:', err)
    }
    return () => {
      if (es) es.close()
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      loadSlots()
    }, 15000) // auto-refresh every 15s
    return () => clearInterval(id)
  }, [loadSlots])


  const clusters = [
    { label: 'Cụm A', ids: [24, 25, 26, 27, 18] },
    { label: 'Cụm B', ids: [23, 22, 21, 20, 19] },
    { label: 'Cụm C', ids: [28, 29, 30, 31, 32] },
  ]

  const slotByNum: Record<number, Slot> = {}
  for (const s of slots) {
    slotByNum[s.slotNum] = s
  }

  const totalAvailable = slots.filter((s) => s.status === 'available').length
  const totalOccupied = slots.filter((s) => s.status === 'occupied').length

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mt-3 mb-4 flex gap-5 justify-center">
        <div className="w-24 h-24 bg-green-100 border border-green-400 rounded-lg py-4 text-center border-2">
          <div className="text-3xl font-bold text-green-700">{totalAvailable}</div>
          <div className="text-green-600">Ô trống</div>
        </div>
        <div className="w-24 h-24 bg-red-100 border border-red-400 rounded-lg px-6 py-4 text-center border-2">
          <div className="text-3xl font-bold text-red-700">{totalOccupied}</div>
          <div className="text-red-600">Có xe</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">Đang tải...</div>
      ) : slots.length === 0 ? (
        <div className="text-center py-4 text-gray-500">Không có dữ liệu bãi đỗ</div>
      ) : (
        <div className="space-y-2">
          {clusters.map((cluster) => {
            const clusterSlots = cluster.ids.map((id) => slotByNum[id]).filter(Boolean)
            const freeCount = clusterSlots.filter((s) => s?.status === 'available').length

            return (
              <div key={cluster.label} className="bg-white rounded-lg border px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg">{cluster.label}</span>
                  <span className="text-gray-600">
                    Trống: <span className="font-semibold text-green-700">{freeCount}</span> /{' '}
                    {cluster.ids.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                  {cluster.ids.map((id) => {
                    const slot = slotByNum[id]
                    if (!slot) {
                      return (
                        <div
                          key={id}
                          className="w-24 h-24 flex items-center justify-center rounded border bg-gray-100 text-gray-400"
                        >
                          {id}
                        </div>
                      )
                    }
                    return (
                      <div
                        key={id}
                        className={`w-24 h-24 flex flex-col items-center justify-center rounded border-2 ${
                          slot.status === 'occupied'
                            ? 'bg-red-100 border-red-400 text-red-700'
                            : 'bg-green-100 border-green-400 text-green-700'
                        }`}
                      >
                        <span className="font-bold text-lg">{id}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

