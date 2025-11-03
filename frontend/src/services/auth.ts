import { apiPost } from './api'

export async function login(email: string, password: string) {
  const data = await apiPost('/auth/login', { email, password })
  return data
}

export async function register(name: string, email: string, password: string, role: 'user' | 'admin' = 'user') {
  const data = await apiPost('/auth/register', { name, email, password, role })
  return data
}


