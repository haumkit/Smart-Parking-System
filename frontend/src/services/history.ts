import { apiGet, apiPost, apiPut, apiDelete } from './api'

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
  hourlyRate?: number | null
  pricingMode: 'per_hour'
  createdAt: string
}

export async function listHistory(plate?: string): Promise<ParkingRecord[]> {
  const params = plate ? `?plate=${encodeURIComponent(plate)}` : ''
  return apiGet(`/history${params}`)
}

export interface SaveHistoryPayload {
  plateNumber: string
  entryTime: string
  exitTime?: string | null
  fee: number
  hourlyRate?: number | null
}

export async function createHistory(payload: SaveHistoryPayload): Promise<ParkingRecord> {
  return apiPost('/history', payload)
}

export async function updateHistory(id: string, payload: Partial<SaveHistoryPayload>): Promise<ParkingRecord> {
  return apiPut(`/history/${id}`, payload)
}

export async function deleteHistory(id: string): Promise<{ success: boolean }> {
  return apiDelete(`/history/${id}`)
}

