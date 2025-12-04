import { useEffect, useState } from 'react'
import {
  listHistory,
  type ParkingRecord,
  type SaveHistoryPayload,
  createHistory,
  updateHistory,
  deleteHistory,
} from '../services/history'

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
      plateNumber: record.vehicleId.plateNumber,
      entryTime: toInputDateTime(record.entryTime),
      exitTime: toInputDateTime(record.exitTime),
      fee: String(record.fee ?? 0),
      hourlyRate: String(record.hourlyRate ?? ''),
    })
    setModalError(null)
    setModalOpen(true)
  }

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
      } else {
        await createHistory(payload)
      }

      await loadHistory(searchPlate || undefined)
      setModalOpen(false)
      setEditingRecord(null)
    } catch (err) {
      console.error('Save history error:', err)
      setModalError('Không thể lưu lịch sử. Vui lòng thử lại.')
    } finally {
      setModalSaving(false)
    }
  }

  async function handleDelete(record: ParkingRecord) {
    if (!window.confirm('Bạn có chắc muốn xóa bản ghi này không?')) return
    try {
      await deleteHistory(record._id)
      setRecords((prev) => prev.filter((r) => r._id !== record._id))
    } catch (err) {
      console.error('Delete history error:', err)
      alert('Không thể xóa bản ghi. Vui lòng thử lại.')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Đang tải lịch sử...</div>
  }

  return (
    <div className="space-y-4">

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
        <h2 className="text-xl font-semibold">
          {role === 'admin' ? 'Lịch sử bãi đỗ (Tất cả)' : 'Lịch sử bãi đỗ của tôi'}
        </h2>
        {role === 'admin' && (
          <button onClick={handleOpenAdd} className="px-4 py-2 rounded bg-green-600 text-white">
            Thêm
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={searchPlate}
          onChange={(e) => setSearchPlate(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="border rounded px-3 py-2 flex-1"
          placeholder="Tìm kiếm theo biển số"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 rounded bg-gray-900 text-white"
        >
          Tìm kiếm
        </button>
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
                  <td className="p-3 text-center">{record.vehicleId.plateNumber}</td>
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
                      {record.exitTime ? 'Hoàn thành' : 'Đang hoạt động'}
                    </span>
                  </td>
                  {role === 'admin' && (
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleOpenEdit(record)}
                        className="px-3 py-1 mr-2 rounded bg-green-600 text-white text-s"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(record)}
                        className="px-3 py-1 rounded bg-red-600 text-white text-s"
                      >
                        Xóa
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


