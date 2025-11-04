import { API_BASE, getAuthHeaders } from './api'

export interface PlateDetectionResult {
  plateNumber: string
  confidence: number
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  } | null
}

export interface SlotDetectionResult {
  code: string
  status: 'available' | 'occupied'
  confidence: number
}

export async function detectPlate(imageFile: File): Promise<PlateDetectionResult> {
  const formData = new FormData()
  formData.append('image', imageFile)

  const authHeaders = getAuthHeaders()
  const res = await fetch(`${API_BASE}/ai/plate`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  })

  if (!res.ok) {
    throw new Error(await res.text())
  }

  return res.json()
}

export async function detectSlots(imageFile: File): Promise<SlotDetectionResult[]> {
  const formData = new FormData()
  formData.append('image', imageFile)

  const authHeaders = getAuthHeaders()
  const res = await fetch(`${API_BASE}/ai/slots`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  })

  if (!res.ok) {
    throw new Error(await res.text())
  }

  const result = await res.json()
  return result.slots
}

