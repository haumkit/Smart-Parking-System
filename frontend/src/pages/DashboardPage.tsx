import { useState, useEffect, useRef, useCallback } from 'react'
import { detectPlateFromCamera, connectPlateDetectionStream, connectSlotDetectionStream, detectSlotsFromCamera, type PlateDetectionResult, type SlotDetectionResponse } from '../services/ai'
import { confirmEntryByPlate, confirmExitByPlate, getHourlyRate, updateHourlyRate, listSlots } from '../services/parking'

const AI_BASE = import.meta.env.VITE_AI_BASE || 'http://localhost:5001'

export default function DashboardPage() {
  type BillingInfo = {
    plateNumber: string
    entryTime?: string | null
    exitTime?: string | null
    durationMinutes?: number | null
    fee?: number | null
    hourlyRate?: number | null
  }

  const [slotDetection, setSlotDetection] = useState<SlotDetectionResponse | null>(null)
  const [slotDetectionLoading, setSlotDetectionLoading] = useState(true)
  const [slotError, setSlotError] = useState<string | null>(null)

  const [entryCamPlate, setEntryCamPlate] = useState<PlateDetectionResult | null>(null)
  const [entryCamLoading, setEntryCamLoading] = useState(false)
  const [entryCamError, setEntryCamError] = useState<string | null>(null)
  
  const [exitCamPlate, setExitCamPlate] = useState<PlateDetectionResult | null>(null)
  const [exitCamLoading, setExitCamLoading] = useState(false)
  const [exitCamError, setExitCamError] = useState<string | null>(null)
  
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)

  const [entryPlateManual, setEntryPlateManual] = useState<string | null>(null)
  const [exitPlateManual, setExitPlateManual] = useState<string | null>(null)
  const [entryConfirmLoading, setEntryConfirmLoading] = useState(false)
  const [exitConfirmLoading, setExitConfirmLoading] = useState(false)

  const [autoConfirmEntry, setAutoConfirmEntry] = useState(false)
  const [autoConfirmExit, setAutoConfirmExit] = useState(false)
  const [lastConfirmedEntryPlate, setLastConfirmedEntryPlate] = useState<string | null>(null)
  const [lastConfirmedExitPlate, setLastConfirmedExitPlate] = useState<string | null>(null)

  const [entryCamConnected, setEntryCamConnected] = useState(true)
  const [exitCamConnected, setExitCamConnected] = useState(true)
  const [parkingCamConnected, setParkingCamConnected] = useState(true)

  const [hourlyRate, setHourlyRate] = useState<number>(5000)
  const [hourlyRateInput, setHourlyRateInput] = useState<string>('')
  const [rateSaving, setRateSaving] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const entrySSERef = useRef<EventSource | null>(null)
  const exitSSERef = useRef<EventSource | null>(null)
  const slotSSERef = useRef<EventSource | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const loadSlotsFromDb = async () => {
    try {
      const slotsFromDb = await listSlots()
      if (!Array.isArray(slotsFromDb)) return

      const mappedSlots = slotsFromDb.map((s: { code?: string; slotNum?: number; status?: string }) => {
        const code = typeof s.code === 'string' ? s.code : String(s.slotNum ?? '')
        const status: 'available' | 'occupied' = s.status === 'occupied' ? 'occupied' : 'available'
        return {
          code,
          status,
          confidence: 1,
        }
      })

      const total = mappedSlots.length
      const occupied = mappedSlots.filter((s) => s.status === 'occupied').length
      const free = mappedSlots.filter((s) => s.status === 'available').length

      const payload: SlotDetectionResponse = {
        slots: mappedSlots,
        totalSlots: total,
        freeSlots: free,
        occupiedSlots: occupied,
        detectedCars: occupied,
        processedImageBase64: null,
      }

      setSlotDetection(payload)
      setSlotDetectionLoading(false)
      setSlotError(null)
    } catch (err) {
      console.error('Failed to load slots from DB:', err)
    }
  }

  const handleEntryCamDetect = async () => {
    setEntryCamLoading(true)
    setEntryCamPlate(null)
    try {
      const result = await detectPlateFromCamera('entry')
      setEntryCamPlate(result)
    } catch (err) {
      console.error(err)
    } finally {
      setEntryCamLoading(false)
    }
  }

  const handleExitCamDetect = async () => {
    setExitCamLoading(true)
    setExitCamPlate(null)
    try {
      const result = await detectPlateFromCamera('exit')
      setExitCamPlate(result)
      setBillingInfo((prev) => ({
        plateNumber: result.plateNumber,
        entryTime: prev?.entryTime ?? null,
        exitTime: prev?.exitTime ?? null,
        durationMinutes: prev?.durationMinutes ?? null,
        fee: prev?.fee ?? null,
      }))
    } catch (err) {
      console.error(err)
    } finally {
      setExitCamLoading(false)
    }
  }

  const handleSlotDetect = async () => {
    setSlotDetectionLoading(true)
    setSlotDetection(null)
    try {
      const result = await detectSlotsFromCamera('parking')
      setSlotDetection(result)
    } catch (err) {
      console.error(err)
    } finally {
      setSlotDetectionLoading(false)
    }
  }

  const handleConfirmEntry = useCallback(async () => {
    const plateToUse = entryPlateManual ?? entryCamPlate?.plateNumber
    if (!plateToUse) return

    setEntryConfirmLoading(true)
    try {
      const result = await confirmEntryByPlate(plateToUse)
      
      setBillingInfo({
        plateNumber: result.plateNumber,
        entryTime: result.entryTime,
        exitTime: null,
        durationMinutes: null,
        fee: null,
        hourlyRate: result.hourlyRate ?? null,
      })
      
      showToast(`Đã xác nhận xe vào: ${result.plateNumber}`, 'success')
    } catch (err) {
      console.error('Lỗi xác nhận xe vào:', err)
      let errorMsg = 'Không thể xác nhận xe vào.'
      if (err instanceof Error) {
        try {
          const errorData = JSON.parse(err.message)
          errorMsg = errorData.message || err.message
        } catch {
          errorMsg = err.message
        }
      }
      showToast(errorMsg, 'error')
    } finally {
      setEntryConfirmLoading(false)
    }
  }, [entryPlateManual, entryCamPlate?.plateNumber, showToast])

  const handleConfirmExit = useCallback(async () => {
    const plateToUse = exitPlateManual ?? exitCamPlate?.plateNumber
    if (!plateToUse) return

    setExitConfirmLoading(true)
    try {
      const result = await confirmExitByPlate(plateToUse)
      
      setBillingInfo({
        plateNumber: result.plateNumber,
        entryTime: result.entryTime,
        exitTime: result.exitTime,
        durationMinutes: result.durationMinutes,
        fee: result.fee,
        hourlyRate: result.hourlyRate ?? null,
      })
      
      showToast(
        `Đã xác nhận xe ra: ${result.plateNumber} - Phí: ${new Intl.NumberFormat('vi-VN').format(result.fee)} đ`,
        'success'
      )
    } catch (err) {
      console.error('Lỗi xác nhận xe ra:', err)
      let errorMsg = 'Không thể xác nhận xe ra.'
      if (err instanceof Error) {
        try {
          const errorData = JSON.parse(err.message)
          errorMsg = errorData.message || err.message
        } catch {
          errorMsg = err.message
        }
      }
      showToast(errorMsg, 'error')
    } finally {
      setExitConfirmLoading(false)
    }
  }, [exitPlateManual, exitCamPlate?.plateNumber, showToast])

  useEffect(() => {
    if (entryCamPlate) {
      setEntryPlateManual(null)
    }
  }, [entryCamPlate])

  useEffect(() => {
    if (exitCamPlate) {
      setExitPlateManual(null)
    }
  }, [exitCamPlate])

  useEffect(() => {
    if (autoConfirmEntry && entryCamPlate?.plateNumber && !entryConfirmLoading) {
      const plateToConfirm = entryCamPlate.plateNumber
      if (plateToConfirm !== lastConfirmedEntryPlate) {
        setLastConfirmedEntryPlate(plateToConfirm)
        handleConfirmEntry()
      }
    }
  }, [autoConfirmEntry, entryCamPlate?.plateNumber, lastConfirmedEntryPlate, entryConfirmLoading, handleConfirmEntry])

  // Tự động xác nhận xe ra khi bật auto và có detection mới
  useEffect(() => {
    if (autoConfirmExit && exitCamPlate?.plateNumber && !exitConfirmLoading) {
      const plateToConfirm = exitCamPlate.plateNumber
      if (plateToConfirm !== lastConfirmedExitPlate) {
        setLastConfirmedExitPlate(plateToConfirm)
        handleConfirmExit()
      }
    }
  }, [autoConfirmExit, exitCamPlate?.plateNumber, lastConfirmedExitPlate, exitConfirmLoading, handleConfirmExit])

  useEffect(() => {
    loadHourlyRate()
  }, [])

  const loadHourlyRate = async () => {
    try {
      const result = await getHourlyRate()
      setHourlyRate(result.hourlyRate)
      setHourlyRateInput(result.hourlyRate.toString())
    } catch (err) {
      console.error('Lỗi load giá:', err)
    }
  }

  const handleSaveRate = async () => {
    const rate = parseInt(hourlyRateInput)
    if (isNaN(rate) || rate < 0) {
      showToast('Giá phải là số dương', 'error')
      return
    }
    setRateSaving(true)
    try {
      const result = await updateHourlyRate(rate)
      setHourlyRate(result.hourlyRate)
      showToast('Đã cập nhật giá thành công!', 'success')
    } catch (err) {
      console.error('Lỗi cập nhật giá:', err)
      let errorMsg = 'Không thể cập nhật giá.'
      if (err instanceof Error) {
        try {
          const errorData = JSON.parse(err.message)
          errorMsg = errorData.message || err.message
        } catch {
          errorMsg = err.message
        }
      }
      showToast(errorMsg, 'error')
    } finally {
      setRateSaving(false)
    }
  }

  useEffect(() => {
    // Slot SSE
    try {
      slotSSERef.current = connectSlotDetectionStream('parking', (data) => {
        setSlotDetection(data)
        setSlotDetectionLoading(false)
        setSlotError(null)
      })
      slotSSERef.current.onerror = () => {
        setSlotError('Không thể kết nối SSE slot...')
      }
    } catch (err) {
      console.error('Không thể kết nối SSE slot:', err)
      setSlotError('Không thể kết nối SSE slot')
      setSlotDetectionLoading(false)
    }

    loadSlotsFromDb()

    try {
      entrySSERef.current = connectPlateDetectionStream('entry', (data) => {
        console.log('Entry camera detection:', data.plateNumber)
        setEntryCamPlate(data)
        setEntryCamError(null)
      })
      entrySSERef.current.onerror = () => {
        setEntryCamError('Không thể kết nối với server.')
      }
    } catch (err) {
      console.error('Failed to connect SSE entry:', err)
      setEntryCamError('Không thể kết nối SSE.')
    }

    // Kết nối SSE camera ra
    try {
      exitSSERef.current = connectPlateDetectionStream('exit', (data) => {
        console.log('Exit camera detection:', data.plateNumber)
        setExitCamPlate(data)
        setBillingInfo((prev) => ({
          plateNumber: data.plateNumber,
          entryTime: prev?.entryTime ?? null,
          exitTime: prev?.exitTime ?? null,
          durationMinutes: prev?.durationMinutes ?? null,
          fee: prev?.fee ?? null,
        }))
        setExitCamError(null)
      })
      exitSSERef.current.onerror = () => {
        setExitCamError('Không thể kết nối với server.')
      }
    } catch (err) {
      console.error('Failed to connect SSE exit:', err)
      setExitCamError('Không thể kết nối SSE.')
    }

    return () => {
      if (entrySSERef.current) {
        entrySSERef.current.close()
        entrySSERef.current = null
      }
      if (exitSSERef.current) {
        exitSSERef.current.close()
        exitSSERef.current = null
      }
      if (slotSSERef.current) {
        slotSSERef.current.close()
        slotSSERef.current = null
      }
    }
  }, [])

  return (
    <div className="space-y-3">
      {/* Simple Banner Notification */}
      {toast && (
        <div
          className={`px-4 py-2 rounded text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr,2fr,2fr] gap-1">
        <div className="bg-white border rounded-lg p-2">
          <h2 className="text-lg font-bold mb-2 text-green-600">Xe Vào</h2>
          <div className="mb-3">
            {entryCamConnected ? (
              <img
                src={`${AI_BASE}/api/cameras/entry/stream`}
                alt="Camera xe vào"
                className="w-full aspect-[4/3] object-cover rounded border border-gray-300"
                onLoad={() => setEntryCamConnected(true)}
                onError={() => setEntryCamConnected(false)}
              />
            ) : (
              <div className="w-full aspect-[4/3] rounded border border-gray-300 flex items-center justify-center text-s text-slate-500">
                Không kết nối được camera xe vào
              </div>
            )}
          </div>

          <button
            onClick={handleEntryCamDetect}
            disabled={
              !entryCamConnected ||
              entryCamLoading ||
              (slotDetection?.freeSlots !== undefined &&
                slotDetection.freeSlots !== null &&
                slotDetection.freeSlots <= 0)
            }
            className="w-full mb-2 mt-1 px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {entryCamLoading
              ? 'Đang xử lý...'
              : slotDetection?.freeSlots !== undefined &&
                slotDetection.freeSlots !== null &&
                slotDetection.freeSlots <= 0
              ? 'Bãi đầy - không nhận xe vào'
              : 'Nhận diện biển số xe vào'}
          </button>

          {entryCamError && (
            <div className="mb-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              {entryCamError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <p className="text-xs text-gray-600 mb-2 text-center">Ảnh biển số</p>
              <div className="w-full rounded border bg-gray-300 flex items-center justify-center min-h-[60px]">
                {entryCamPlate?.plateImageBase64 ? (
                  <img
                    src={`data:image/jpeg;base64,${entryCamPlate.plateImageBase64}`}
                    alt="Biển số xe vào"
                    className="w-full h-full object-contain rounded"
                  />
                ) : (
                  <span className="text-xs text-gray-400">Chưa có ảnh</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-2 text-center">Ảnh biển số nhị phân</p>
              <div className="w-full rounded border bg-gray-300 flex items-center justify-center min-h-[60px]">
                {entryCamPlate?.debugImageBase64 ? (
                  <img
                    src={`data:image/jpeg;base64,${entryCamPlate.debugImageBase64}`}
                    alt="Biển số xe vào (nhị phân)"
                    className="w-full h-full object-contain rounded"
                  />
                ) : (
                  <span className="text-xs text-gray-400">Chưa có ảnh</span>
                )}
              </div>
            </div>
          </div>

        </div>
        
        <div className="bg-white border rounded-lg p-2">
          <h2 className="text-lg font-bold mb-2 text-red-600">Xe Ra</h2>
          <div className="mb-3">
            {exitCamConnected ? (
              <img
                src={`${AI_BASE}/api/cameras/exit/stream`}
                alt="Camera xe ra"
                className="w-full aspect-[4/3] object-cover rounded border border-gray-300"
                onLoad={() => setExitCamConnected(true)}
                onError={() => setExitCamConnected(false)}
              />
            ) : (
              <div className="w-full aspect-[4/3] rounded border border-gray-300 flex items-center justify-center text-s text-slate-500">
                Không kết nối được camera xe ra
              </div>
            )}
          </div>

          <button
            onClick={handleExitCamDetect}
            disabled={
              !exitCamConnected ||
              exitCamLoading ||
              (slotDetection?.occupiedSlots !== undefined &&
                slotDetection.occupiedSlots !== null &&
                slotDetection.occupiedSlots <= 0)
            }
            className="w-full mb-2 mt-1 px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {exitCamLoading
              ? 'Nhận diện biển số xe ra'
              : slotDetection?.occupiedSlots !== undefined &&
                slotDetection.occupiedSlots !== null &&
                slotDetection.occupiedSlots <= 0
              ? 'Bãi trống - chưa có xe ra'
              : 'Nhận diện biển số xe ra'}
          </button>

          {exitCamError && (
            <div className="mb-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              {exitCamError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <p className="text-xs text-gray-600 mb-2 text-center">Ảnh biển số</p>
              <div className="w-full rounded border bg-gray-300 flex items-center justify-center min-h-[60px]">
                {exitCamPlate?.plateImageBase64 ? (
                  <img
                    src={`data:image/jpeg;base64,${exitCamPlate.plateImageBase64}`}
                    alt="Biển số xe ra"
                    className="w-full h-full object-contain rounded"
                  />
                ) : (
                  <span className="text-xs text-gray-400">Chưa có ảnh</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-2 text-center">Ảnh biển số nhị phân</p>
              <div className="w-full rounded border bg-gray-300 flex items-center justify-center min-h-[60px]">
                {exitCamPlate?.debugImageBase64 ? (
                  <img
                    src={`data:image/jpeg;base64,${exitCamPlate.debugImageBase64}`}
                    alt="Biển số xe ra (nhị phân)"
                    className="w-full h-full object-contain rounded"
                  />
                ) : (
                  <span className="text-xs text-gray-400">Chưa có ảnh</span>
                )}
              </div>
            </div>
          </div>

        </div>

       
        <div className="bg-white border rounded-lg p-2">
          <div className="space-y-2">
            <div className="border-2 border-gray-100 rounded-lg p-2 bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-s font-bold text-green-600">Xe vào</span>
                <input
                  type="text"
                  value={entryPlateManual ?? entryCamPlate?.plateNumber ?? ''}
                  onChange={(e) => setEntryPlateManual(e.target.value.toUpperCase())}
                  className="flex-1 max-w-[170px] border rounded px-2 py-1 text-xl font-bold text-center"
                  placeholder="Nhập biển số"
                />
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoConfirmEntry}
                    onChange={(e) => {
                      setAutoConfirmEntry(e.target.checked)
                      if (!e.target.checked) {
                        setLastConfirmedEntryPlate(null) 
                      }
                    }}
                    className="w-6 h-6"
                  />
                  <span className="text-slate-600 text-s">Tự động</span>
                </label>
                <button
                  onClick={handleConfirmEntry}
                  disabled={entryConfirmLoading || !(entryPlateManual ?? entryCamPlate?.plateNumber)}
                  className="px-2 py-1 text-s rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {entryConfirmLoading ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </div>
            </div>

            {/* Khung xác nhận xe ra */}
            <div className="border-2 border-gray-100 rounded-lg p-2 bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-red-600">Xe ra </span>
                <input
                  type="text"
                  value={exitPlateManual ?? exitCamPlate?.plateNumber ?? ''}
                  onChange={(e) => setExitPlateManual(e.target.value.toUpperCase())}
                  className="flex-1 max-w-[170px] border rounded px-2 py-1 text-xl font-bold text-center"
                  placeholder="Nhập biển số"
                />
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoConfirmExit}
                    onChange={(e) => {
                      setAutoConfirmExit(e.target.checked)
                      if (!e.target.checked) {
                        setLastConfirmedExitPlate(null)
                      }
                    }}
                    className="w-6 h-6"
                  />
                  <span className="text-slate-600 text-s">Tự động</span>
                </label>
                <button
                  onClick={handleConfirmExit}
                  disabled={exitConfirmLoading || !(exitPlateManual ?? exitCamPlate?.plateNumber)}
                  className="px-2 py-1 text-s rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {exitConfirmLoading ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 mb-2 px-2 py-1 border border-gray-100 rounded bg-gray-50">
            <div className="flex items-center justify-between gap-2 px-2">
              <span className="text-slate-600 font-semibold text-s">Giá (1 giờ):</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={hourlyRateInput}
                  onChange={(e) => setHourlyRateInput(e.target.value)}
                  className="w-20 border rounded px-2 py-1 text-s text-right"
                  min="0"
                />
                <span className="text-s">đ</span>
                <button
                  onClick={handleSaveRate}
                  disabled={rateSaving || parseInt(hourlyRateInput) === hourlyRate}
                  className="px-2 py-1 text-s bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {rateSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 px-5 py-3 border-2 border-gray-100 rounded-lg bg-gray-50">
            <h2 className="text-xl font-bold text-slate-700">Tính Tiền</h2>
            <div className="space-y-3 text-lg">
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">Biển số:</span>
                <span className="font-semibold text-slate-900">
                  {billingInfo?.plateNumber ?? '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">Thời gian vào:</span>
                <span className="font-medium text-slate-900">
                  {billingInfo?.entryTime
                    ? new Date(billingInfo.entryTime).toLocaleString('vi-VN')
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">Thời gian ra:</span>
                <span className="font-medium text-slate-900">
                  {billingInfo?.exitTime
                    ? new Date(billingInfo.exitTime).toLocaleString('vi-VN')
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">Thời gian gửi:</span>
                <span className="font-medium text-slate-900">
                  {billingInfo?.durationMinutes != null
                    ? (() => {
                        const hours = Math.floor(billingInfo.durationMinutes / 60)
                        const minutes = billingInfo.durationMinutes % 60
                        if (hours > 0 && minutes > 0) {
                          return `${hours} giờ ${minutes} phút`
                        } else if (hours > 0) {
                          return `${hours} giờ`
                        } else {
                          return `${minutes} phút`
                        }
                      })()
                    : '-'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">Giá (1 giờ):</span>
                <span className="font-bold text-slate-900">
                  {billingInfo?.hourlyRate != null
                    ? new Intl.NumberFormat('vi-VN').format(billingInfo.hourlyRate) + ' đ'
                    : '-'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-red-600 font-semibold">Tổng tiền:</span>
                <span className="font-bold text-red-700">
                  {billingInfo?.fee != null
                    ? new Intl.NumberFormat('vi-VN').format(billingInfo.fee) + ' đ'
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== PHẦN 3: BÃI ĐỖ ========== */}
      <div className="bg-white border rounded-lg px-2 py-3">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr,2fr,1fr] gap-2">
          {/* Camera bãi đỗ gốc */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Camera Bãi Đỗ Gốc</h3>
            {parkingCamConnected ? (
              <img
                src={`${AI_BASE}/api/cameras/parking/stream`}
                alt="Bãi đỗ hiện tại"
                className="w-full aspect-[4/3] object-cover rounded border border-gray-300"
                onLoad={() => setParkingCamConnected(true)}
                onError={() => setParkingCamConnected(false)}
              />
            ) : (
              <div className="w-full aspect-[4/3] rounded border border-gray-300 flex items-center justify-center text-s text-slate-500">
                Không kết nối được camera bãi đỗ
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Bãi Đỗ Đã Xử Lý</h3>
            {slotDetection?.processedImageBase64 ? (
              <img
                src={`data:image/jpeg;base64,${slotDetection.processedImageBase64}`}
                alt="Bãi đỗ đã xử lý"
                className="w-full aspect-[4/3] object-cover rounded border border-gray-300"
              />
            ) : (
              <div className="w-full aspect-[4/3] rounded border border-gray-300 flex items-center justify-center text-s text-slate-500">
                Chưa có ảnh xử lý
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Thông tin bãi đỗ</h3>
              {slotError && (
                <p className="text-xs text-red-600 mb-2">{slotError}</p>
              )}
              <div className="space-y-3 mb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-s">
                  <div className="p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-s text-red-600">Có xe</p>
                    <p className="text-lg font-bold text-red-900">{slotDetection?.occupiedSlots ?? 0}</p>
                  </div>
                  <div className="p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-s text-green-600">Còn trống</p>
                    <p className="text-lg font-bold text-green-900">{slotDetection?.freeSlots ?? 0}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  Xe detect được:{' '}
                  <span className="font-semibold">
                    {slotDetection?.detectedCars != null ? slotDetection.detectedCars : '-'}
                  </span>
                </p>

                {slotDetection?.slots && slotDetection.slots.length > 0 && (
                  <div className="mt-1 space-y-2 text-s">
                    {(() => {
                      const byCode: Record<string, (typeof slotDetection.slots)[number]> = {}
                      for (const s of slotDetection.slots) {
                        byCode[s.code] = s
                      }

                      const clusters = [
                        { label: 'Cụm A', ids: [24, 25, 26, 27, 18] },
                        { label: 'Cụm B', ids: [23, 22, 21, 20, 19] },
                        { label: 'Cụm C', ids: [28, 29, 30, 31, 32] },
                      ]

                      return clusters.map((cluster) => {
                        const group = cluster.ids
                          .map((id) => byCode[`S${id}`])
                          .filter((s): s is (typeof slotDetection.slots)[number] => !!s)

                        if (group.length === 0) return null

                        const freeCount = group.filter((s) => s.status === 'available').length

                        return (
                          <div key={cluster.label} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-700">{cluster.label}</span>
                              <span className="text-[15px] text-gray-600">
                                Trống: <span className="font-semibold text-green-700">{freeCount}</span>{' '}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {cluster.ids.map((id) => {
                                const slot = byCode[`S${id}`]
                                if (!slot) {
                                  return (
                                    <span
                                      key={`S${id}`}
                                      className="px-2 py-0.5 rounded border text-[15px] bg-gray-50 border-gray-200 text-gray-500"
                                    >
                                      S{id}: -
                                    </span>
                                  )
                                }
                                return (
                                  <span
                                    key={slot.code}
                                    className={`px-2 py-0.5 rounded border text-[15px] ${
                                      slot.status === 'occupied'
                                        ? 'bg-red-100 border-red-300 text-red-700'
                                        : 'bg-green-100 border-green-300 text-green-700'
                                    }`}
                                  >
                                    {slot.code.replace(/^S/, '')}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleSlotDetect}
              disabled={!parkingCamConnected}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {!parkingCamConnected && slotDetectionLoading ? 'Nhận diện ô trống' : 'Nhận diện ô trống'}
            </button>
          </div>
        </div>
    </div>
  </div>
)
}
