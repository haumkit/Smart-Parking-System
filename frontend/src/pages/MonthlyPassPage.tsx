import { useState, useEffect, useCallback } from 'react'
import type { MonthlyPass } from '../services/monthlyPass'
import {
  listAllPasses,
  approvePass,
  rejectPass,
  createManualPass,
  extendPass,
} from '../services/monthlyPass'
import type { Vehicle } from '../services/vehicle'
import { listVehicles } from '../services/vehicle'

export default function MonthlyPassPage() {
  const [passes, setPasses] = useState<MonthlyPass[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Form thêm mới
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [months, setMonths] = useState(1)
  
  // Extend modal
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [passToExtend, setPassToExtend] = useState<MonthlyPass | null>(null)
  const [extendMonths, setExtendMonths] = useState(1)
  const [extending, setExtending] = useState(false)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [passesData, vehiclesData] = await Promise.all([
        listAllPasses(filterStatus || undefined),
        listVehicles(),
      ])
      setPasses(passesData)
      setVehicles(vehiclesData)
    } catch {
      showToast('Lỗi tải dữ liệu', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleApprove = async (id: string) => {
    try {
      await approvePass(id)
      showToast('Đã duyệt vé tháng', 'success')
      loadData()
    } catch {
      showToast('Lỗi duyệt vé', 'error')
    }
  }

  const handleReject = async (id: string) => {
    try {
      await rejectPass(id)
      showToast('Đã từ chối vé tháng', 'success')
      loadData()
    } catch {
      showToast('Lỗi từ chối vé', 'error')
    }
  }

  const handleExtend = (pass: MonthlyPass) => {
    setPassToExtend(pass)
    setExtendMonths(1)
    setShowExtendModal(true)
  }

  async function confirmExtend() {
    if (!passToExtend || extendMonths < 1) {
      showToast('Vui lòng nhập số tháng hợp lệ', 'error')
      return
    }
    
    try {
      setExtending(true)
      await extendPass(passToExtend._id, extendMonths)
      showToast('Đã gia hạn vé tháng', 'success')
      setShowExtendModal(false)
      setPassToExtend(null)
      setExtendMonths(1)
      loadData()
    } catch {
      showToast('Lỗi gia hạn vé', 'error')
    } finally {
      setExtending(false)
    }
  }

  function cancelExtend() {
    setShowExtendModal(false)
    setPassToExtend(null)
    setExtendMonths(1)
  }

  const handleAddManual = async () => {
    if (!selectedVehicleId) {
      showToast('Vui lòng chọn phương tiện', 'error')
      return
    }
    try {
      await createManualPass(selectedVehicleId, months)
      showToast('Đã tạo vé tháng', 'success')
      setShowAddForm(false)
      setSelectedVehicleId('')
      setMonths(1)
      loadData()
    } catch {
      showToast('Lỗi tạo vé tháng', 'error')
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('vi-VN')
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ'
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-200 text-yellow-700',
      approved: 'bg-green-200 text-green-700',
      rejected: 'bg-red-200 text-red-700',
      expired: 'bg-gray-200 text-gray-700',
    }
    const labels: Record<string, string> = {
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
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
      {/* Toast */}
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
        <h2 className="text-xl font-semibold">Quản lý vé tháng</h2>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-s font-medium text-slate-700">Trạng thái</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded px-3 py-2 text-s"
          >
            <option value="">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
            <option value="expired">Hết hạn</option>
          </select>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
        >
          Thêm vé tháng
        </button>
      </div>


      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20">
          <div className="bg-white rounded shadow-lg w-full max-w-md p-4">
            <h3 className="text-lg font-semibold mb-3">Thêm vé tháng</h3>
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
              <div className="text-sm text-gray-600">
                Giá: {formatPrice(500000 * months)}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded border text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleAddManual}
                className="px-4 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700"
              >
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : passes.length === 0 ? (
        <div className="bg-gray-50 border rounded p-8 text-center text-gray-500">
          Không có vé tháng nào
        </div>
      ) : (
        <div className="bg-white border rounded overflow-hidden">
          <table className="w-full text-s">
            <thead>
              <tr className="bg-gray-100 text-center">
                <th className="p-3 border-b">Biển số</th>
                <th className="p-3 border-b">Người đăng ký</th>
                <th className="p-3 border-b">Ngày bắt đầu</th>
                <th className="p-3 border-b">Ngày kết thúc</th>
                <th className="p-3 border-b">Giá</th>
                <th className="p-3 border-b">Trạng thái</th>
                <th className="p-3 border-b">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((pass) => (
                <tr key={pass._id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-center font-mono">
                    {pass.vehicleId?.plateNumber || 'N/A'}
                  </td>
                  <td className="p-3 text-center">
                    {pass.userId?.name || pass.userId?.email || 'N/A'}
                  </td>
                  <td className="p-3 text-center">{formatDate(pass.startDate)}</td>
                  <td className="p-3 text-center">{formatDate(pass.endDate)}</td>
                  <td className="p-3 text-center">{formatPrice(pass.price)}</td>
                  <td className="p-3 text-center">{getStatusBadge(pass.status)}</td>
                  <td className="p-2 text-center">
                    {pass.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(pass._id)}
                          className="px-3 py-1 mr-2 rounded bg-green-600 text-white text-s"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleReject(pass._id)}
                          className="px-3 py-1 rounded bg-red-600 text-white text-s"
                        >
                          Từ chối
                        </button>
                      </>
                    )}
                    {pass.status === 'approved' && (
                      <button
                        onClick={() => handleExtend(pass)}
                        className="px-3 py-1 rounded bg-blue-600 text-white text-s"
                      >
                        Gia hạn
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Extend Modal */}
      {showExtendModal && passToExtend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-5 w-80 max-w-md">
            <h3 className="text-2xl font-semibold ">Gia hạn vé tháng</h3>
            <div className="rounded p-3 text-s ">
              <div className="grid gap-2">
                <div>
                  <span className="font-medium">Biển số:</span>{' '}
                  <span>{passToExtend.vehicleId?.plateNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Người đăng ký:</span>{' '}
                  <span>{passToExtend.userId?.name || passToExtend.userId?.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Ngày kết thúc hiện tại:</span>{' '}
                  <span>{formatDate(passToExtend.endDate)}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Số tháng gia hạn</label>
                <input
                  type="number"
                  min={1}
                  value={extendMonths}
                  onChange={(e) => setExtendMonths(parseInt(e.target.value) || 1)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Nhập số tháng"
                />
              </div>
              <div className="text-sm text-gray-600  rounded">
                <div>Giá gia hạn: {formatPrice(500000 * extendMonths)}</div>
                <div className="mt-1">
                  Ngày kết thúc mới: {(() => {
                    const currentEnd = new Date(passToExtend.endDate)
                    const newEnd = new Date(currentEnd)
                    newEnd.setMonth(newEnd.getMonth() + extendMonths)
                    return newEnd.toLocaleDateString('vi-VN')
                  })()}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={cancelExtend}
                disabled={extending}
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={confirmExtend}
                disabled={extending || extendMonths < 1}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {extending ? 'Đang gia hạn...' : 'Gia hạn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

