import { API_BASE, apiGet } from './api'

export async function loadStats(from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiGet(`/reports/stats${qs}`)
}

export function exportExcel(from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const url = `${API_BASE}/reports/export/excel?${params.toString()}`
  window.open(url, '_blank')
}

export function exportPdf(from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const url = `${API_BASE}/reports/export/pdf?${params.toString()}`
  window.open(url, '_blank')
}


