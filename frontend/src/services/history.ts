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

export async function listHistory(opts?: {
  plate?: string
  from?: string
  to?: string
  status?: 'completed' | 'pending'
}): Promise<ParkingRecord[]> {
  const params = new URLSearchParams()
  if (opts?.plate) params.set('plate', opts.plate)
  if (opts?.from) params.set('from', opts.from)
  if (opts?.to) params.set('to', opts.to)
  if (opts?.status) params.set('status', opts.status)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiGet(`/history${qs}`)
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

