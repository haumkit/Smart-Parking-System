import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../services/api'

interface MonthlyPass {
  _id: string
  vehicleId: { _id: string; plateNumber: string }
  startDate: string
  endDate: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  price: number
}

interface Vehicle {
  _id: string
  plateNumber: string
}

export default function MyMonthlyPassPage() {
  const [passes, setPasses] = useState<MonthlyPass[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [months, setMonths] = useState(1)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [passesData, vehiclesData] = await Promise.all([
        apiGet('/monthly-pass/my'),
        apiGet('/vehicles/my'),
      ])
      setPasses(passesData)
      setVehicles(vehiclesData)
    } catch {
      showToast('Lỗi tải dữ liệu', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRequest = async () => {
    if (!selectedVehicleId) {
      showToast('Vui lòng chọn phương tiện', 'error')
      return
    }
    try {
      await apiPost('/monthly-pass/request', { vehicleId: selectedVehicleId, months })
      showToast('Đã gửi đề xuất mua vé tháng', 'success')
      setShowForm(false)
      setSelectedVehicleId('')
      setMonths(1)
      loadData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi gửi đề xuất', 'error')
    }
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('vi-VN')
  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN').format(price) + ' đ'

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-200 text-yellow-700',
      approved: 'bg-green-200 text-green-700',
      rejected: 'bg-red-200 text-red-700',
      expired: 'bg-gray-200 text-gray-700',
    }
    const labels: Record<string, string> = {
      pending: 'Chờ duyệt',
      approved: 'Còn hạn',
      rejected: 'Từ chối',
      expired: 'Hết hạn',
    }
    return (
      <span className={`px-2 py-1 rounded text-s ${styles[status] || 'bg-gray-200 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Vé tháng của tôi</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 ml-auto rounded bg-green-600 text-white hover:bg-green-700"
        >
          Đề xuất mua vé
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20">
          <div className="bg-white rounded shadow-lg w-full max-w-md p-4">
            <h3 className="text-lg font-semibold mb-3">Đề xuất mua vé tháng</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Phương tiện</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">-- Chọn phương tiện --</option>
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.plateNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số tháng</label>
                <input
                  type="number"
                  min={1}
                  value={months}
                  onChange={(e) => setMonths(parseInt(e.target.value) || 1)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="text-sm text-gray-600">Giá: {formatPrice(500000 * months)}</div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded border text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleRequest}
                className="px-4 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700"
              >
                Gửi đề xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : passes.length === 0 ? (
        <div className="bg-gray-50 border rounded p-8 text-center text-gray-500">
          Bạn chưa có vé tháng nào
        </div>
      ) : (
        <div className="bg-white border rounded overflow-hidden">
          <table className="w-full text-s">
            <thead>
              <tr className="bg-gray-100 text-center">
                <th className="p-3 border-b">Biển số</th>
                <th className="p-3 border-b">Ngày bắt đầu</th>
                <th className="p-3 border-b">Ngày kết thúc</th>
                <th className="p-3 border-b">Giá</th>
                <th className="p-3 border-b">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((pass) => (
                <tr key={pass._id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-center font-mono">{pass.vehicleId?.plateNumber || 'N/A'}</td>
                  <td className="p-3 text-center">{formatDate(pass.startDate)}</td>
                  <td className="p-3 text-center">{formatDate(pass.endDate)}</td>
                  <td className="p-3 text-center">{formatPrice(pass.price)}</td>
                  <td className="p-3 text-center">{getStatusBadge(pass.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

