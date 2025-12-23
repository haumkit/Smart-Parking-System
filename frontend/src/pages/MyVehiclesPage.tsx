import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../services/api'

interface Vehicle {
  _id: string
  plateNumber: string
  registeredTime: string
  createdAt: string
  status?: 'pending' | 'approved' | 'rejected'
}

export default function MyVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [plateNumber, setPlateNumber] = useState('')

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet('/vehicles/my')
      setVehicles(data)
    } catch {
      showToast('Lỗi tải dữ liệu', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSubmit = async () => {
    if (!plateNumber.trim()) {
      showToast('Vui lòng nhập biển số', 'error')
      return
    }
    try {
      await apiPost('/vehicles/my', { plateNumber: plateNumber.trim().toUpperCase() })
      showToast('Đã gửi đề xuất đăng ký phương tiện. Vui lòng chờ admin duyệt.', 'success')
      setShowForm(false)
      setPlateNumber('')
      loadData()
    } catch (err) {
      let errorMsg = 'Lỗi đăng ký phương tiện'
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message)
          if (parsed?.message) {
            errorMsg = parsed.message
          }
        } catch {
          errorMsg = err.message
        }
      }
      showToast(errorMsg, 'error')
    }
  }


  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('vi-VN')
  }

  const getStatusBadge = (status?: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-200 text-yellow-700',
      approved: 'bg-green-200 text-green-700',
      rejected: 'bg-red-200 text-red-700',
    }
    const labels: Record<string, string> = {
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      rejected: 'Từ chối',
    }
    const s = status || 'approved'
    return (
      <span className={`px-2 py-1 rounded text-s ${styles[s] || 'bg-gray-200 text-gray-700'}`}>
        {labels[s] || 'Đã duyệt'}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`fixed top-4 text-xl right-4 px-6 py-4 rounded shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Phương tiện của tôi</h2>
        <button
          onClick={() => {
            setPlateNumber('')
            setShowForm(true)
          }}
          className="px-4 py-2 ml-auto rounded bg-green-600 text-white hover:bg-green-700"
        >
          Đăng ký phương tiện
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20">
          <div className="bg-white rounded shadow-lg w-full max-w-md p-4">
            <h3 className="text-lg font-semibold mb-3">Đăng ký phương tiện</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Biển số</label>
                <input
                  type="text"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="VD: 51G12345"
                  className="w-full border rounded px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowForm(false)
                  setPlateNumber('')
                }}
                className="px-4 py-2 rounded border text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700"
              >
                Đăng ký
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : vehicles.length === 0 ? (
        <div className="bg-gray-50 border rounded p-8 text-center text-gray-500">
          Bạn chưa có phương tiện nào
        </div>
      ) : (
        <div className="bg-white border rounded overflow-hidden">
          <table className="w-full text-s">
            <thead>
              <tr className="bg-gray-100 text-center">
                <th className="p-3 border-b">STT</th>
                <th className="p-3 border-b">Biển số</th>
                <th className="p-3 border-b">Ngày đăng ký</th>
                <th className="p-3 border-b">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v, idx) => (
                <tr key={v._id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-center">{idx + 1}</td>
                  <td className="p-3 text-center font-mono font-semibold">{v.plateNumber}</td>
                  <td className="p-3 text-center">{formatDate(v.registeredTime || v.createdAt)}</td>
                  <td className="p-3 text-center">{getStatusBadge(v.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

