import { apiGet, apiPost, apiPut, apiDelete } from './api'

export interface Vehicle {
  _id: string
  plateNumber: string
  ownerId?: string | { _id: string; name?: string; email?: string }
  registeredTime: string
  createdAt: string
  status?: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedAt?: string
}

export const listVehicles = async (): Promise<Vehicle[]> => {
  return apiGet('/vehicles')
}

export const getVehicle = async (id: string): Promise<Vehicle> => {
  return apiGet(`/vehicles/${id}`)
}

export const createVehicle = async (data: { plateNumber: string; ownerId?: string }) => {
  return apiPost('/vehicles', data)
}

export const updateVehicle = async (id: string, data: { plateNumber?: string; ownerId?: string }) => {
  return apiPut(`/vehicles/${id}`, data)
}

export const deleteVehicle = async (id: string) => {
  return apiDelete(`/vehicles/${id}`)
}

export const approveVehicle = async (id: string) => {
  return apiPut(`/vehicles/${id}/approve`, {})
}

export const rejectVehicle = async (id: string) => {
  return apiPut(`/vehicles/${id}/reject`, {})
}

export const listPendingVehicles = async (): Promise<Vehicle[]> => {
  return apiGet('/vehicles/pending')
}

