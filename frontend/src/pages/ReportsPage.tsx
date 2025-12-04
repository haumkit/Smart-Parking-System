import { useEffect, useState } from 'react'
import { loadStats, exportExcel, exportPdf } from '../services/reports'

interface StatItem {
  _id: {
    y: number
    m: number
    d: number
  }
  count: number
  revenue: number
}

export default function ReportsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<StatItem[]>([])

  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 6)

    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const fromStr = fmt(start)
    const toStr = fmt(end)

    setFrom(fromStr)
    setTo(toStr)
    handleLoad(fromStr, toStr)
  }, [])

  async function handleLoad(customFrom?: string, customTo?: string) {
    try {
      setLoading(true)
      setError(null)
      const data = await loadStats(customFrom ?? from, customTo ?? to)
      setItems(data.items || [])
    } catch (err) {
      console.error('Load stats error:', err)
      setError('Không thể tải báo cáo. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const totalVehicles = items.reduce((sum, it) => sum + (it.count || 0), 0)
  const totalRevenue = items.reduce((sum, it) => sum + (it.revenue || 0), 0)
  const avgVehiclesPerDay = items.length ? Math.round(totalVehicles / items.length) : 0

  function formatDateItem(it: StatItem) {
    const y = it._id.y
    const m = String(it._id.m).padStart(2, '0')
    const d = String(it._id.d).padStart(2, '0')
    return `${d}/${m}/${y}`
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-s font-medium text-slate-700">Từ ngày</label>
          <input
            className="border rounded px-3 py-2 text-s"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-s font-medium text-slate-700">Đến ngày</label>
          <input
            className="border rounded px-3 py-2 text-s"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button
          onClick={() => handleLoad()}
          className="px-3 py-2 rounded bg-gray-900 text-white text-s disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? 'Đang tải...' : 'Tải báo cáo'}
        </button>
        <button
          onClick={() => exportExcel(from, to)}
          className="px-3 py-2 rounded bg-blue-600 text-white text-s"
        >
          Xuất Excel
        </button>
        <button
          onClick={() => exportPdf(from, to)}
          className="px-3 py-2 rounded bg-red-600 text-white text-s"
        >
          Xuất PDF
        </button>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-50 border border-red-200 text-s text-red-700">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border rounded">
          <p className="text-s text-slate-500">Tổng lượt xe</p>
          <p className="text-2xl font-bold mt-1">{totalVehicles}</p>
        </div>
        <div className="p-4 bg-white border rounded">
          <p className="text-s text-slate-500">Tổng doanh thu</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="p-4 bg-white border rounded">
          <p className="text-s text-slate-500">Lượt xe trung bình / ngày</p>
          <p className="text-2xl font-bold mt-1">{avgVehiclesPerDay}</p>
        </div>
      </div>

      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-s">
          <thead>
            <tr className="bg-gray-100 text-center">
              <th className="p-2 border-b">Ngày</th>
              <th className="p-2 border-b">Số lượt xe</th>
              <th className="p-2 border-b">Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-center text-slate-500">
                  Không có dữ liệu trong khoảng thời gian này.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={`${it._id.y}-${it._id.m}-${it._id.d}`} className="border-b text-center">
                  <td className="p-2">{formatDateItem(it)}</td>
                  <td className="p-2">{it.count}</td>
                  <td className="p-2">{formatCurrency(it.revenue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


