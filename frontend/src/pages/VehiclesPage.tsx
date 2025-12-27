import { useState, useEffect, useCallback, useRef } from 'react'
import type { Vehicle } from '../services/vehicle'
import {
  listVehicles,
  listPendingVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  approveVehicle,
  rejectVehicle,
} from '../services/vehicle'
import { searchUsers, type User } from '../services/user'

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending'>('all')

  // Form
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [plateNumber, setPlateNumber] = useState('')
  const [ownerSearch, setOwnerSearch] = useState('')
  const [ownerId, setOwnerId] = useState<string>('')
  const [ownerSuggestions, setOwnerSuggestions] = useState<User[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchTimeoutRef = useRef<number | null>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  
  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Reject confirmation
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false)
  const [vehicleToReject, setVehicleToReject] = useState<Vehicle | null>(null)
  const [rejecting, setRejecting] = useState(false)

  const isValidPlate = useCallback((plate: string) => {
    return /^[1-9][0-9][A-HK-NP-TVXYZ][0-9]{4,5}$/.test(plate.toUpperCase())
  }, [])
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = filterStatus === 'pending' 
        ? await listPendingVehicles()
        : await listVehicles()
      setVehicles(data)
    } catch {
      showToast('Lỗi tải dữ liệu', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast, filterStatus])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Search users khi nhập
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (ownerSearch.trim().length > 0) {
      searchTimeoutRef.current = window.setTimeout(async () => {
        try {
          const users = await searchUsers(ownerSearch)
          setOwnerSuggestions(users)
          setShowSuggestions(true)
        } catch {
          setOwnerSuggestions([])
        }
      }, 300)
    } else {
      setOwnerSuggestions([])
      setShowSuggestions(false)
    }

    return () => {
      if (searchTimeoutRef.current !== null) {
        window.clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [ownerSearch])

  // Đóng suggestions khi click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = async () => {
    if (!plateNumber.trim()) {
      showToast('Vui lòng nhập biển số', 'error')
      return
    }
    if(!isValidPlate(plateNumber)){
      showToast('Biển số không hợp lệ', 'error')
      return
    }
    try {
      const data: { plateNumber: string; ownerId?: string } = {
        plateNumber: plateNumber.trim().toUpperCase(),
      }
      if (ownerId) {
        data.ownerId = ownerId
      }
      
      if (editId) {
        await updateVehicle(editId, data)
        showToast('Đã cập nhật phương tiện', 'success')
      } else {
        await createVehicle(data)
        showToast('Đã thêm phương tiện', 'success')
      }
      setShowForm(false)
      setEditId(null)
      setPlateNumber('')
      setOwnerSearch('')
      setOwnerId('')
      loadData()
    } catch {
      showToast('Lỗi lưu phương tiện', 'error')
    }
  }

  const handleEdit = (v: Vehicle) => {
    setEditId(v._id)
    setPlateNumber(v.plateNumber)
    if (typeof v.ownerId === 'object' && v.ownerId) {
      setOwnerId(v.ownerId._id)
      setOwnerSearch(v.ownerId.name || v.ownerId.email || '')
    } else if (typeof v.ownerId === 'string') {
      setOwnerId(v.ownerId)
      setOwnerSearch('')
    } else {
      setOwnerId('')
      setOwnerSearch('')
    }
    setShowForm(true)
  }

  const handleSelectOwner = (user: User) => {
    setOwnerId(user._id)
    setOwnerSearch(user.name || user.email)
    setShowSuggestions(false)
  }

  /* const handleDelete = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle)
    setDeleteConfirmOpen(true)
  }
 */
  async function confirmDelete() {
    if (!vehicleToDelete) return
    
    try {
      setDeleting(true)
      await deleteVehicle(vehicleToDelete._id)
      showToast('Đã xóa phương tiện', 'success')
      setDeleteConfirmOpen(false)
      setVehicleToDelete(null)
      loadData()
    } catch {
      showToast('Lỗi xóa phương tiện', 'error')
    } finally {
      setDeleting(false)
    }
  }

  function cancelDelete() {
    setDeleteConfirmOpen(false)
    setVehicleToDelete(null)
  }

  const handleApprove = async (id: string) => {
    try {
      await approveVehicle(id)
      showToast('Đã duyệt phương tiện', 'success')
      loadData()
    } catch {
      showToast('Lỗi duyệt phương tiện', 'error')
    }
  }

  const handleReject = (vehicle: Vehicle) => {
    setVehicleToReject(vehicle)
    setRejectConfirmOpen(true)
  }

  async function confirmReject() {
    if (!vehicleToReject) return
    
    try {
      setRejecting(true)
      await rejectVehicle(vehicleToReject._id)
      showToast('Đã từ chối phương tiện', 'success')
      setRejectConfirmOpen(false)
      setVehicleToReject(null)
      loadData()
    } catch {
      showToast('Lỗi từ chối phương tiện', 'error')
    } finally {
      setRejecting(false)
    }
  }

  function cancelReject() {
    setRejectConfirmOpen(false)
    setVehicleToReject(null)
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
          className={`fixed top-3 text-xl right-4 px-6 py-4 rounded shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Quản lý phương tiện</h2>
        
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-s font-medium text-slate-700">Trạng thái</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending')}
            className="border rounded px-3 py-2 text-s"
          >
            <option value="all">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
          </select>
        </div>
        <button
          onClick={() => {
            setEditId(null)
            setPlateNumber('')
            setOwnerSearch('')
            setOwnerId('')
            setShowForm(true)
          }}
          className="px-4 py-2  ml-auto rounded bg-green-600 text-white hover:bg-green-700"
        >
          Thêm phương tiện
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 w-80 max-w-md">
            <h2 className="text-2xl font-semibold mb-4">
              {editId ? 'Sửa phương tiện' : 'Thêm phương tiện'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Biển số</label>
                <input
                  type="text"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="VD: 51G12345"
                  className="w-full border rounded px-3 py-2 font-mono"
                />
              </div>
              <div className="relative" ref={suggestionsRef}>
                <label className="block font-medium mb-1">Chủ xe</label>
                <input
                  type="text"
                  value={ownerSearch}
                  onChange={(e) => {
                    setOwnerSearch(e.target.value)
                    setOwnerId('')
                  }}
                  onFocus={() => {
                    if (ownerSuggestions.length > 0) {
                      setShowSuggestions(true)
                    }
                  }}
                  placeholder="Nhập tên hoặc email để tìm..."
                  className="w-full border rounded px-3 py-2"
                />
                {showSuggestions && ownerSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-auto">
                    {ownerSuggestions.map((user) => (
                      <div
                        key={user._id}
                        onClick={() => handleSelectOwner(user)}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                      >
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                {editId ? 'Cập nhật' : 'Thêm'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditId(null)
                  setPlateNumber('')
                  setOwnerSearch('')
                  setOwnerId('')
                  setShowSuggestions(false)
                }}
                className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : vehicles.length === 0 ? (
        <div className="bg-gray-50 border rounded p-8 text-center text-gray-500">
          Không có phương tiện nào
        </div>
      ) : (
        <div className="bg-white border rounded overflow-hidden">
          <table className="w-full text-s">
            <thead>
              <tr className="bg-gray-100 text-center">
                <th className="p-3 border-b">STT</th>
                <th className="p-3 border-b">Biển số</th>
                <th className="p-3 border-b">Người đăng ký</th>
                <th className="p-3 border-b">Ngày đăng ký</th>
                <th className="p-3 border-b">Trạng thái</th>
                <th className="p-3 border-b">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v, idx) => (
                <tr key={v._id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-center">{idx + 1}</td>
                  <td className="p-3 text-center font-semibold">{v.plateNumber}</td>
                  <td className="p-3 text-center">
                    {typeof v.ownerId === 'object' && v.ownerId
                      ? v.ownerId.name || v.ownerId.email || 'N/A'
                      : 'N/A'}
                  </td>
                  <td className="p-3 text-center">{formatDate(v.registeredTime || v.createdAt)}</td>
                  <td className="p-3 text-center">{getStatusBadge(v.status)}</td>
                  <td className="p-2 text-center">
                    {v.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleApprove(v._id)}
                          className="px-3 py-1 mr-2 rounded bg-green-600 text-white text-s"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleReject(v)}
                          className="px-3 py-1 rounded bg-red-600 text-white text-s"
                        >
                          Từ chối
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(v)}
                          className="px-3 py-1 mr-2 rounded bg-green-600 text-white text-s"
                        >
                          Sửa
                        </button>
                        {/* <button
                          onClick={() => handleDelete(v)}
                          className="px-3 py-1 rounded bg-red-600 text-white text-s"
                        >
                          Xóa
                        </button> */}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && vehicleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-72 max-w-sm">
            <h3 className="text-xl font-semibold mb-2">Xóa phương tiện</h3>
            <div className="rounded p-3 mb-4 text-sm">
              <div className="grid gap-3">
                <div>
                  <span className="font-medium">Biển số:</span>{' '}
                  <span>{vehicleToDelete.plateNumber}</span>
                </div>
                <div>
                  <span className="font-medium">Người đăng ký:</span>{' '}
                  <span>
                    {typeof vehicleToDelete.ownerId === 'object' && vehicleToDelete.ownerId
                      ? vehicleToDelete.ownerId.name || vehicleToDelete.ownerId.email || 'N/A'
                      : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Ngày đăng ký:</span>{' '}
                  <span>{formatDate(vehicleToDelete.registeredTime || vehicleToDelete.createdAt)}</span>
                </div>
                <div>
                  <span className="font-medium">Trạng thái:</span>{' '}
                  {getStatusBadge(vehicleToDelete.status)}
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={cancelDelete}
                disabled={deleting}
                className="px-10 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-10 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {rejectConfirmOpen && vehicleToReject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-72 max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Bạn có chắc chắn muốn từ chối phương tiện này không?</h3>
            <div className="rounded p-3 mb-4 text-sm">
              <div className="grid gap-3">
                <div>
                  <span className="font-medium">Biển số:</span>{' '}
                  <span>{vehicleToReject.plateNumber}</span>
                </div>
                <div>
                  <span className="font-medium">Người đăng ký:</span>{' '}
                  <span>
                    {typeof vehicleToReject.ownerId === 'object' && vehicleToReject.ownerId
                      ? vehicleToReject.ownerId.name || vehicleToReject.ownerId.email || 'N/A'
                      : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Ngày đăng ký:</span>{' '}
                  <span>{formatDate(vehicleToReject.registeredTime || vehicleToReject.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={cancelReject}
                disabled={rejecting}
                className="px-10 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={confirmReject}
                disabled={rejecting}
                className="px-8 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejecting ? 'Đang từ chối...' : 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

