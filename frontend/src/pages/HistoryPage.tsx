import { useEffect, useState, useCallback } from 'react'
import {
  listHistory,
  type ParkingRecord,
  type SaveHistoryPayload,
  createHistory,
  updateHistory,
  deleteHistory,
} from '../services/history'
import { exportExcel } from '../services/reports'

export default function HistoryPage() {
  const [records, setRecords] = useState<ParkingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchPlate, setSearchPlate] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [editingRecord, setEditingRecord] = useState<ParkingRecord | null>(null)
  const [form, setForm] = useState<{ plateNumber: string; entryTime: string; exitTime: string; fee: string; hourlyRate: string }>({
    plateNumber: '',
    entryTime: '',
    exitTime: '',
    fee: '0',
    hourlyRate: '',
  })
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [status, setStatus] = useState<'all' | 'completed' | 'pending'>('all')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<ParkingRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const role = localStorage.getItem('role') || 'user'

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 29) 
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const fromStr = fmt(start)
    const toStr = fmt(end)
    setFromDate(fromStr)
    setToDate(toStr)
    loadHistory(undefined, fromStr, toStr, 'all')
  }, [])

  async function loadHistory(plate?: string, from?: string, to?: string, s?: 'all' | 'completed' | 'pending') {
    try {
      setLoading(true)
      const data = await listHistory({
        plate,
        from,
        to,
        status: s === 'all' ? undefined : s,
      })
      setRecords(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  function clearFilters() {
    setSearchPlate('')
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 29) 
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const fromStr = fmt(start)
    const toStr = fmt(end)
    setFromDate(fromStr)
    setToDate(toStr)
    setStatus('all')
    loadHistory(undefined, fromStr, toStr, 'all')
  }

  function handleSearch() {
    loadHistory(searchPlate || undefined, fromDate || undefined, toDate || undefined, status)
  }

  async function handleExportHistory() {
    try {
      await exportExcel(fromDate || undefined, toDate || undefined)
      showToast('Đã xuất lịch sử thành công', 'success')
    } catch (err) {
      console.error('Export history error:', err)
      showToast('Không thể xuất lịch sử. Vui lòng thử lại.', 'error')
    }
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
/*
  function toInputDateTime(value: string | null) {
    if (!value) return ''
    const d = new Date(value)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  function handleOpenAdd() {
    setEditingRecord(null)
    setForm({
      plateNumber: '',
      entryTime: toInputDateTime(new Date().toISOString()),
      exitTime: '',
      fee: '0',
      hourlyRate: '',
    })
    setModalError(null)
    setModalOpen(true)
  }

  function handleOpenEdit(record: ParkingRecord) {
    setEditingRecord(record)
    setForm({
      plateNumber: record.vehicleId?.plateNumber || '',
      entryTime: toInputDateTime(record.entryTime),
      exitTime: toInputDateTime(record.exitTime),
      fee: String(record.fee ?? 0),
      hourlyRate: String(record.hourlyRate ?? ''),
    })
    setModalError(null)
    setModalOpen(true)
  }
 */
  function handleCloseModal() {
    setModalOpen(false)
    setEditingRecord(null)
  }

  async function handleSave() {
    try {
      setModalSaving(true)
      setModalError(null)

      const payload: SaveHistoryPayload = {
        plateNumber: form.plateNumber.trim(),
        entryTime: form.entryTime ? new Date(form.entryTime).toISOString() : '',
        exitTime: form.exitTime ? new Date(form.exitTime).toISOString() : null,
        fee: Number(form.fee) || 0,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null,
      }

      if (!payload.plateNumber || !payload.entryTime) {
        setModalError('Biển số và thời gian vào là bắt buộc')
        setModalSaving(false)
        return
      }

      if (editingRecord) {
        await updateHistory(editingRecord._id, payload)
        showToast('Đã cập nhật lịch sử thành công', 'success')
      } else {
        await createHistory(payload)
        showToast('Đã thêm lịch sử thành công', 'success')
      }

      await loadHistory(searchPlate || undefined)
      setModalOpen(false)
      setEditingRecord(null)
    } catch (err) {
      console.error('Save history error:', err)
      const errorMsg = err instanceof Error ? err.message : 'Không thể lưu lịch sử. Vui lòng thử lại.'
      setModalError(errorMsg)
      showToast(errorMsg, 'error')
    } finally {
      setModalSaving(false)
    }
  }

  function handleDelete(record: ParkingRecord) {
    setRecordToDelete(record)
    setDeleteConfirmOpen(true)
  }

  async function confirmDelete() {
    if (!recordToDelete) return
    
    try {
      setDeleting(true)
      await deleteHistory(recordToDelete._id)
      setRecords((prev) => prev.filter((r) => r._id !== recordToDelete._id))
      setDeleteConfirmOpen(false)
      setRecordToDelete(null)
      showToast('Đã xóa bản ghi lịch sử thành công', 'success')
    } catch (err) {
      console.error('Delete history error:', err)
      const errorMsg = err instanceof Error ? err.message : 'Không thể xóa bản ghi. Vui lòng thử lại.'
      showToast(errorMsg, 'error')
    } finally {
      setDeleting(false)
    }
  }

  function cancelDelete() {
    setDeleteConfirmOpen(false)
    setRecordToDelete(null)
  }

  if (loading) {
    return <div className="text-center py-8">Đang tải lịch sử...</div>
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`fixed top-4 right-4 text-xl px-6 py-4 rounded shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
      
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20">
          <div className="bg-white rounded shadow-lg w-full max-w-md p-4">
            <h3 className="text-lg font-semibold mb-3">
              {editingRecord ? 'Sửa lịch sử' : 'Thêm lịch sử'}
            </h3>

            {modalError && (
              <div className="mb-2 text-s text-red-600">
                {modalError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Biển số</label>
                <input
                  value={form.plateNumber}
                  onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="VD: 30A-12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Thời gian vào</label>
                <input
                  type="datetime-local"
                  value={form.entryTime}
                  onChange={(e) => setForm((f) => ({ ...f, entryTime: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Thời gian ra (tùy chọn)</label>
                <input
                  type="datetime-local"
                  value={form.exitTime}
                  onChange={(e) => setForm((f) => ({ ...f, exitTime: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tiền (VND)</label>
                <input
                  type="number"
                  min={0}
                  value={form.fee}
                  onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Giá (1 giờ) - VND (tùy chọn)</label>
                <input
                  type="number"
                  min={0}
                  value={form.hourlyRate}
                  onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Giá theo giờ khi xe vào"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 rounded border text-sm"
                disabled={modalSaving}
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={modalSaving}
                className="px-4 py-2 rounded bg-green-600 text-white text-sm disabled:bg-gray-400"
              >
                {modalSaving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="mt-2 text-xl font-semibold">
          {role === 'admin' ? 'Lịch sử bãi đỗ' : 'Lịch sử bãi đỗ của tôi'}
        </h2>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-s block font-medium text-slate-700 mb-1">Biển số</label>
          <input
            type="text"
            value={searchPlate}
            onChange={(e) => setSearchPlate(e.target.value)}
            className="border rounded px-3 py-2 text-s"
            placeholder="Nhập biển số"
          />
        </div>
        <div>
          <label className="text-s block font-medium text-slate-700 mb-1">Từ ngày</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border rounded px-3 py-2 text-s"
          />
        </div>
        <div>
          <label className="text-s block font-medium text-slate-700 mb-1">Đến ngày</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border rounded px-3 py-2 text-s"
          />
        </div>
        <div>
          <label className="text-s block font-medium text-slate-700 mb-1">Trạng thái</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="border rounded px-3 py-2 text-s"
          >
            <option value="all">Tất cả</option>
            <option value="completed">Hoàn thành</option>
            <option value="pending">Đang gửi</option>
          </select>
        </div>
        <button
          onClick={handleSearch}
          className="px-3 py-2 rounded bg-gray-900 text-white text-s disabled:bg-gray-400"
        >
          Tìm kiếm
        </button>
        <button
          onClick={clearFilters}
          className="px-3 py-2 rounded bg-white text-gray-800 text-s border"
        >
          Xóa lọc
        </button>
        { role === 'admin' && (
          <button
            onClick={handleExportHistory}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Xuất lịch sử
          </button>
        )}
        {/* {role === 'admin' && (
          <button onClick={handleOpenAdd} className="px-4 py-2 rounded bg-green-600 text-white">
            Thêm
          </button>
        )} */}
      </div>


      {error ? (
        <div className="text-center py-8 text-red-600">
          <p>{error}</p>
          <button
            onClick={() => loadHistory()}
            className="mt-4 px-4 py-2 rounded bg-gray-900 text-white"
          >
            Thử lại
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-gray-50 border rounded p-8 text-center text-gray-500">
          Không tìm thấy lịch sử bãi đỗ.
        </div>
      ) : (
        <div className="bg-white border rounded overflow-hidden">
          <table className="w-full text-s">
            <thead>
              <tr className="bg-gray-100 text-center">
                <th className="p-3 border-b">Biển số</th>
                <th className="p-3 border-b">Thời gian vào</th>
                <th className="p-3 border-b">Thời gian ra</th>
                <th className="p-3 border-b">Giá (1 giờ)</th>
                <th className="p-3 border-b">Tiền</th>
                <th className="p-3 border-b">Trạng thái</th>
                {role === 'admin' && <th className="p-3 border-b">Hành động</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record._id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-center">{record.vehicleId?.plateNumber || 'N/A'}</td>
                  <td className="p-3 text-center">{formatDate(record.entryTime)}</td>
                  <td className="p-3 text-center">{formatDate(record.exitTime)}</td>
                  <td className="p-3 text-center">
                    {record.hourlyRate != null ? formatCurrency(record.hourlyRate) : '-'}
                  </td>
                  <td className="p-3 text-center">{formatCurrency(record.fee)}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-s ${
                        record.exitTime
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-green-200 text-green-700'
                      }`}
                    >
                      {record.exitTime ? 'Hoàn thành' : 'Đang gửi'}
                    </span>
                  </td>
                  {role === 'admin' && (
                    <td className="p-2 text-center">
                      {record.exitTime ? (
                        <button
                          onClick={() => handleDelete(record)}
                          className="px-3 py-1 rounded bg-red-600 text-white text-s"
                        >
                          Xóa
                        </button>
                      ) : (
                        <span className="text-s text-gray-400">Không thể xóa</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirmOpen && recordToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 max-w-md">
            <h3 className="text-xl font-semibold mb-2">Xóa bản ghi lịch sử</h3>
            <div className="rounded p-3 mb-4 text-sm">
              <div className="grid gap-3">
                <div>
                  <span className="font-medium">Biển số:</span>{' '}
                  <span>{recordToDelete.vehicleId?.plateNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Vào lúc:</span>{' '}
                  <span>{formatDate(recordToDelete.entryTime)}</span>
                </div>
                {recordToDelete.exitTime && (
                  <div>
                    <span className="font-medium">Ra lúc:</span>{' '}
                    <span>{formatDate(recordToDelete.exitTime)}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium">Phí:</span>{' '}
                  <span>{formatCurrency(recordToDelete.fee)}</span>
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
    </div>
  )
}


