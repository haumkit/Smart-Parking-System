import { apiGet, apiPost, apiPut, API_BASE, getAuthHeaders } from './api'

export interface WalkInEntryResponse {
  success: boolean
  plateNumber: string
  vehicleId: string
  recordId: string
  entryTime: string
  entryTimeVN?: string
  confidence?: number
}

export interface WalkInExitResponse {
  success: boolean
  plateNumber: string
  recordId: string
  entryTime: string
  exitTime: string
  durationHours: number
  durationMinutes: number
  fee: number
}

export async function walkInEntry(imageFile: File): Promise<WalkInEntryResponse> {
  const formData = new FormData()
  formData.append('image', imageFile)

  const authHeaders = getAuthHeaders()
  const res = await fetch(`${API_BASE}/parking/walkin/entry`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  })

  if (!res.ok) {
    throw new Error('Xe đã trong bãi')
  }

  return res.json()
}

export async function walkInExit(imageFile: File): Promise<WalkInExitResponse> {
  const formData = new FormData()
  formData.append('image', imageFile)

  const authHeaders = getAuthHeaders()
  const res = await fetch(`${API_BASE}/parking/walkin/exit`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  })

  if (!res.ok) {
    throw new Error('Xe chưa vào bãi')
  }

  return res.json()
}

export interface AvailableSlot {
  slotNum: number
  code: string
  status: 'available' | 'occupied'
}

export interface AvailableSlotsResponse {
  success: boolean
  count: number
  slots: AvailableSlot[]
}

export async function listSlots() {
  return apiGet('/parking/slots')
}

export async function listAvailableSlots(): Promise<AvailableSlotsResponse> {
  return apiGet('/parking/slots/available')
}

export async function suggestSlot() {
  return apiGet('/parking/suggest')
}

export async function checkIn(vehicleId: string, slotId: string) {
  return apiPost('/parking/check-in', { vehicleId, slotId })
}

export async function checkOut(recordId: string, pricingMode: 'per_hour' | 'per_30min') {
  return apiPost('/parking/check-out', { recordId, pricingMode })
}

export interface ConfirmEntryResponse {
  success: boolean
  plateNumber: string
  vehicleId: string
  recordId: string
  entryTime: string
  entryTimeVN?: string
  hourlyRate?: number
  hasMonthlyPass?: boolean
}

export interface ConfirmExitResponse {
  success: boolean
  plateNumber: string
  recordId: string
  entryTime: string
  exitTime: string
  durationHours: number
  durationMinutes: number
  fee: number
  hourlyRate?: number
  hasMonthlyPass?: boolean
}

export async function confirmEntryByPlate(plateNumber: string): Promise<ConfirmEntryResponse> {
  return apiPost('/parking/confirm-entry', { plateNumber })
}

export async function confirmExitByPlate(plateNumber: string): Promise<ConfirmExitResponse> {
  return apiPost('/parking/confirm-exit', { plateNumber })
}

export async function getHourlyRate(): Promise<{ success: boolean; hourlyRate: number }> {
  return apiGet('/parking/rate')
}

export async function updateHourlyRate(hourlyRate: number): Promise<{ success: boolean; hourlyRate: number }> {
  return apiPut('/parking/rate', { hourlyRate })
}


