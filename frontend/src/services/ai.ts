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
  plateImageBase64?: string | null
  debugImageBase64?: string | null
}

export interface SlotDetectionResult {
  code: string
  status: 'available' | 'occupied'
  confidence: number
}

export interface SlotDetectionResponse {
  slots: SlotDetectionResult[]
  totalSlots?: number | null
  freeSlots?: number | null
  occupiedSlots?: number | null
  detectedCars?: number | null
  timestamp?: string
  processedImageBase64?: string | null
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

export async function detectSlots(imageFile: File): Promise<SlotDetectionResponse> {
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
  return result as SlotDetectionResponse
}

export async function detectSlotsFromCamera(
  cameraId: 'parking'
): Promise<SlotDetectionResponse> {
  const authHeaders = getAuthHeaders()
  const res = await fetch(`${API_BASE}/ai/slots/from-camera/${cameraId}`, {
    method: 'GET',
    headers: authHeaders,
  })

  if (!res.ok) {
    throw new Error(await res.text())
  }

  const result = await res.json()
  return {
    slots: result.slots || [],
    totalSlots: result.totalSlots ?? null,
    freeSlots: result.freeSlots ?? null,
    occupiedSlots: result.occupiedSlots ?? null,
    detectedCars: result.detectedCars ?? null,
    processedImageBase64: result.processedImageBase64 ?? null,
  } as SlotDetectionResponse
}

export async function detectPlateFromCamera(
  cameraId: 'entry' | 'exit'
): Promise<PlateDetectionResult> {
  const authHeaders = getAuthHeaders()
  const res = await fetch(`${API_BASE}/ai/plate/from-camera/${cameraId}`, {
    method: 'GET',
    headers: authHeaders,
  })

  if (!res.ok) {
    throw new Error(await res.text())
  }

  return res.json()
}

export function connectPlateDetectionStream(
  cameraId: 'entry' | 'exit',
  onDetection: (data: PlateDetectionResult) => void
): EventSource {
  const token = localStorage.getItem('token')
  if (!token) {
    throw new Error('No authentication token found')
  }

  const url = `${API_BASE}/ai/plate-stream/${cameraId}?token=${encodeURIComponent(token)}`
  console.log(`Connecting SSE for camera: ${cameraId}`)
  const eventSource = new EventSource(url)

  eventSource.onopen = () => {
    console.log(`SSE connected for camera: ${cameraId}`)
  }

  eventSource.onmessage = (event) => {
    try {
      // Skip heartbeat messages
      if (event.data.trim() === '' || event.data.startsWith(':')) {
        return
      }
      const data = JSON.parse(event.data) as PlateDetectionResult
      console.log(`SSE message received for ${cameraId}:`, data.plateNumber)
      onDetection(data)
    } catch (err) {
      console.error('Failed to parse SSE message:', err)
    }
  }

  eventSource.onerror = (err) => {
    console.error(`SSE connection error for ${cameraId}:`, err)
    // Check readyState to see if connection is closed
    if (eventSource.readyState === EventSource.CLOSED) {
      console.error(`SSE connection closed for ${cameraId}`)
    }
  }

  return eventSource
}

export function connectSlotDetectionStream(
  cameraId: string,
  onDetection: (data: SlotDetectionResponse) => void
): EventSource {
  const token = localStorage.getItem('token')
  if (!token) {
    throw new Error('No authentication token found')
  }

  const url = `${API_BASE}/ai/slot-stream/${cameraId}?token=${encodeURIComponent(token)}`
  console.log(`Connecting slot SSE for camera: ${cameraId}`)
  const eventSource = new EventSource(url)

  eventSource.onopen = () => {
    console.log(`Slot SSE connected for camera: ${cameraId}`)
  }

  eventSource.onmessage = (event) => {
    if (!event.data || event.data.startsWith(':')) {
      return
    }
    try {
      const data = JSON.parse(event.data) as SlotDetectionResponse
      onDetection(data)
    } catch (err) {
      console.error('Failed to parse slot SSE message:', err)
    }
  }

  eventSource.onerror = (err) => {
    console.error(`Slot SSE connection error for ${cameraId}:`, err)
  }

  return eventSource
}

