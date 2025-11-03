import { useEffect, useState } from 'react'
import { listHistory, type ParkingRecord } from '../services/history'

export default function HistoryPage() {
  const [records, setRecords] = useState<ParkingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchPlate, setSearchPlate] = useState('')
  const role = localStorage.getItem('role') || 'user'

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory(plate?: string) {
    try {
      setLoading(true)
      const data = await listHistory(plate)
      setRecords(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch() {
    loadHistory(searchPlate || undefined)
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ'
  }

  if (loading) {
    return <div className="text-center py-8">Loading history...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {role === 'admin' ? 'Parking History (All)' : 'My Parking History'}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={searchPlate}
          onChange={(e) => setSearchPlate(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="border rounded px-3 py-2 flex-1"
          placeholder="Search by plate number"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 rounded bg-gray-900 text-white"
        >
          Search
        </button>
      </div>

      {error ? (
        <div className="text-center py-8 text-red-600">
          <p>{error}</p>
          <button
            onClick={() => loadHistory()}
            className="mt-4 px-4 py-2 rounded bg-gray-900 text-white"
          >
            Retry
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-gray-50 border rounded p-8 text-center text-gray-500">
          No parking records found.
        </div>
      ) : (
        <div className="bg-white border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-center">
                <th className="p-3 border-b">Plate</th>
                <th className="p-3 border-b">Slot</th>
                <th className="p-3 border-b">Entry Time</th>
                <th className="p-3 border-b">Exit Time</th>
                <th className="p-3 border-b">Fee</th>
                <th className="p-3 border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record._id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-center">{record.vehicleId.plateNumber}</td>
                  <td className="p-3 text-center">
                    {record.slotId ? record.slotId.code : '-'}
                  </td>
                  <td className="p-3 text-center">{formatDate(record.entryTime)}</td>
                  <td className="p-3 text-center">{formatDate(record.exitTime)}</td>
                  <td className="p-3 text-center">{formatCurrency(record.fee)}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        record.exitTime
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-green-200 text-green-700'
                      }`}
                    >
                      {record.exitTime ? 'Completed' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


