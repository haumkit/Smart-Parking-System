export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input className="border rounded px-3 py-2" type="date" />
        <input className="border rounded px-3 py-2" type="date" />
        <button className="px-3 py-2 rounded bg-gray-900 text-white">Load Stats</button>
        <button className="px-3 py-2 rounded bg-blue-600 text-white">Export Excel</button>
        <button className="px-3 py-2 rounded bg-red-600 text-white">Export PDF</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-white border rounded">Daily Vehicles Chart (stub)</div>
        <div className="p-4 bg-white border rounded">Revenue Chart (stub)</div>
      </div>
    </div>
  )
}


