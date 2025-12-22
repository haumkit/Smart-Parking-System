import { apiGet, apiPost, apiPut } from './api'

export interface MonthlyPass {
  _id: string
  vehicleId: {
    _id: string
    plateNumber: string
  }
  userId: {
    _id: string
    name: string
    email: string
  }
  startDate: string
  endDate: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  price: number
  approvedBy?: {
    _id: string
    name: string
    email: string
  }
  approvedAt?: string
  createdAt: string
}

export const getMyPasses = async (): Promise<MonthlyPass[]> => {
  return apiGet('/monthly-pass/my')
}

export const requestPass = async (vehicleId: string, months = 1) => {
  return apiPost('/monthly-pass/request', { vehicleId, months })
}

export const listAllPasses = async (status?: string): Promise<MonthlyPass[]> => {
  const query = status ? `?status=${status}` : ''
  return apiGet(`/monthly-pass${query}`)
}

export const approvePass = async (id: string) => {
  return apiPut(`/monthly-pass/${id}/approve`)
}

export const rejectPass = async (id: string) => {
  return apiPut(`/monthly-pass/${id}/reject`)
}

export const createManualPass = async (vehicleId: string, months = 1) => {
  return apiPost('/monthly-pass/manual', { vehicleId, months })
}

export const extendPass = async (id: string, months = 1) => {
  return apiPut(`/monthly-pass/${id}/extend`, { months })
}

