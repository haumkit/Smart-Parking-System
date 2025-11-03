import { apiGet } from './api'

export interface ParkingRecord {
  _id: string
  vehicleId: {
    _id: string
    plateNumber: string
  }
  slotId: {
    _id: string
    code: string
  } | null
  entryTime: string
  exitTime: string | null
  fee: number
  pricingMode: 'per_hour' | 'per_30min'
  createdAt: string
}

export async function listHistory(plate?: string): Promise<ParkingRecord[]> {
  const params = plate ? `?plate=${encodeURIComponent(plate)}` : ''
  return apiGet(`/history${params}`)
}

