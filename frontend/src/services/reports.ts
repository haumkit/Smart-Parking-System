import { API_BASE, apiGet, getAuthHeaders } from './api'

export async function loadStats(from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiGet(`/reports/stats${qs}`)
}

async function downloadFile(url: string, filename: string) {
  const res = await fetch(url, { headers: { ...getAuthHeaders() } })
  if (!res.ok) throw new Error(await res.text())
  const blob = await res.blob()
  const link = document.createElement('a')
  const href = URL.createObjectURL(blob)
  link.href = href
  link.download = filename
  link.click()
  URL.revokeObjectURL(href)
}

export async function exportExcel(from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const url = `${API_BASE}/reports/export/excel?${params.toString()}`
  return downloadFile(url, 'parking_report.xlsx')
}

export async function exportPdf(from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const url = `${API_BASE}/reports/export/pdf?${params.toString()}`
  return downloadFile(url, 'parking_report.pdf')
}

export async function exportStatsExcel(from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const url = `${API_BASE}/reports/export/stats/excel?${params.toString()}`
  return downloadFile(url, 'parking_stats.xlsx')
}

export async function exportStatsPdf(from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const url = `${API_BASE}/reports/export/stats/pdf?${params.toString()}`
  return downloadFile(url, 'parking_stats.pdf')
}