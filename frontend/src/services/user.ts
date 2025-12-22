import { apiGet } from './api'

export interface User {
  _id: string
  name: string
  email: string
}

export const searchUsers = async (query: string): Promise<User[]> => {
  if (!query || query.trim().length === 0) {
    return []
  }
  return apiGet(`/auth/search?q=${encodeURIComponent(query.trim())}`)
}

