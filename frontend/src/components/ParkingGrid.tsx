type Slot = { id: string; code: string; status: 'available' | 'occupied'; vehicleId?: { plateNumber?: string } }

export default function ParkingGrid({ slots }: { slots: Slot[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {slots.map((s) => (
        <div
          key={s.id}
          className={`relative p-3 rounded-lg border shadow-sm flex flex-col items-center justify-center transition-transform hover:scale-[1.02] ${
            s.status === 'available'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="text-sm text-gray-600">Slot</div>
          <div className="text-xl font-semibold mt-1">{s.code}</div>
          {s.status === 'occupied' && s.vehicleId?.plateNumber && (
            <div className="mt-2 text-xs text-gray-700 bg-white/60 px-2 py-1 rounded">
              {s.vehicleId.plateNumber}
            </div>
          )}
          <div className="absolute top-2 right-2 text-xs font-medium px-2 py-1 rounded-full">
            {s.status === 'available' ? <span className="text-green-700">●</span> : <span className="text-red-700">●</span>}
          </div>
        </div>
      ))}
    </div>
  )
}


