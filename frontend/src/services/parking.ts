import { apiGet, apiPost } from './api'

export async function listSlots() {
  return apiGet('/parking/slots')
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


