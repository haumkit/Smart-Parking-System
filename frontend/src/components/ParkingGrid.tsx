type Slot = { id: string; code: string; status: 'available' | 'occupied' }

export default function ParkingGrid({ slots }: { slots: Slot[] }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {slots.map((s) => (
        <div key={s.id} className={`h-16 rounded border grid place-items-center text-sm ${s.status === 'available' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>{s.code}</div>
      ))}
    </div>
  )
}


