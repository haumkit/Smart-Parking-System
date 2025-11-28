import { useState, useEffect, useRef } from 'react'
import { detectPlateFromCamera, connectPlateDetectionStream, connectSlotDetectionStream, detectSlotsFromCamera, type PlateDetectionResult, type SlotDetectionResponse } from '../services/ai'

const AI_BASE = import.meta.env.VITE_AI_BASE || 'http://localhost:5001'

export default function DashboardPage() {
  
  const [slotDetection, setSlotDetection] = useState<SlotDetectionResponse | null>(null)
  const [slotDetectionLoading, setSlotDetectionLoading] = useState(true)
  const [slotError, setSlotError] = useState<string | null>(null)

  const [entryCamPlate, setEntryCamPlate] = useState<PlateDetectionResult | null>(null)
  const [entryCamLoading, setEntryCamLoading] = useState(false)
  const [entryCamError, setEntryCamError] = useState<string | null>(null)
  
  const [exitCamPlate, setExitCamPlate] = useState<PlateDetectionResult | null>(null)
  const [exitCamLoading, setExitCamLoading] = useState(false)
  const [exitCamError, setExitCamError] = useState<string | null>(null)

  const entrySSERef = useRef<EventSource | null>(null)
  const exitSSERef = useRef<EventSource | null>(null)
  const slotSSERef = useRef<EventSource | null>(null)


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

  useEffect(() => {
    // Slot SSE
    try {
      slotSSERef.current = connectSlotDetectionStream('parking', (data) => {
        setSlotDetection(data)
        setSlotDetectionLoading(false)
        setSlotError(null)
      })
      slotSSERef.current.onerror = () => {
        setSlotError('Không thể kết nối SSE slot. Đang thử lại...')
      }
    } catch (err) {
      console.error('Failed to connect slot SSE:', err)
      setSlotError('Không thể kết nối SSE slot. Vui lòng đăng nhập lại.')
      setSlotDetectionLoading(false)
    }

    // Kết nối SSE camera vào
    try {
      entrySSERef.current = connectPlateDetectionStream('entry', (data) => {
        console.log('Entry camera detection:', data.plateNumber)
        setEntryCamPlate(data)
        setEntryCamError(null)
      })
      entrySSERef.current.onerror = () => {
        setEntryCamError('Không thể kết nối với server. Motion detection có thể chưa bật.')
      }
    } catch (err) {
      console.error('Failed to connect SSE entry:', err)
      setEntryCamError('Không thể kết nối SSE. Vui lòng đăng nhập lại.')
    }

    // Kết nối SSE camera ra
    try {
      exitSSERef.current = connectPlateDetectionStream('exit', (data) => {
        console.log('Exit camera detection:', data.plateNumber)
        setExitCamPlate(data)
        setExitCamError(null)
      })
      exitSSERef.current.onerror = () => {
        setExitCamError('Không thể kết nối với server. Motion detection có thể chưa bật.')
      }
    } catch (err) {
      console.error('Failed to connect SSE exit:', err)
      setExitCamError('Không thể kết nối SSE. Vui lòng đăng nhập lại.')
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-white border rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4 text-green-600">Xe Vào</h2>
          
          <div className="mb-4">
            <img
              src={`${AI_BASE}/api/cameras/entry/stream`}
              alt="Camera xe vào"
              className="w-full h-80 object-cover rounded border bg-black"
            />
          </div>

          <button
            onClick={handleEntryCamDetect}
            disabled={entryCamLoading}
            className="w-full mb-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {entryCamLoading ? 'Đang xử lý...' : 'Nhận diện biển số xe vào'}
          </button>

          {entryCamError && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              {entryCamError}
            </div>
          )}

          {entryCamPlate && (
            <div className="mb-3 p-3 bg-green-50 border border-green-300 rounded">
              <p className="text-xs font-semibold text-green-800">Biển số đã phát hiện:</p>
              <p className="text-lg font-bold text-green-900">{entryCamPlate.plateNumber}</p>
              <p className="mt-1 text-[11px] text-green-700">
                Độ tin cậy: {(entryCamPlate.confidence * 100).toFixed(1)}%
              </p>
              {(entryCamPlate.plateImageBase64 || entryCamPlate.debugImageBase64) && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {entryCamPlate.plateImageBase64 && (
                    <div>
                      <p className="text-[11px] text-slate-600 mb-1">Ảnh biển số</p>
                      <img
                        src={`data:image/jpeg;base64,${entryCamPlate.plateImageBase64}`}
                        alt="Biển số"
                        className="w-full rounded border bg-black/60"
                      />
                    </div>
                  )}
                  {entryCamPlate.debugImageBase64 && (
                    <div>
                      <p className="text-[11px] text-slate-600 mb-1">Ảnh nhị phân</p>
                      <img
                        src={`data:image/jpeg;base64,${entryCamPlate.debugImageBase64}`}
                        alt="Biển số nhị phân"
                        className="w-full rounded border bg-black/60"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        <div className="bg-white border rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4 text-red-600">Xe Ra</h2>
          
          <div className="mb-4">
            <img
              src={`${AI_BASE}/api/cameras/exit/stream`}
              alt="Camera xe ra"
              className="w-full h-80 object-cover rounded border bg-black"
            />
          </div>

          <button
            onClick={handleExitCamDetect}
            disabled={exitCamLoading}
            className="w-full mb-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {exitCamLoading ? 'Đang xử lý...' : 'Nhận diện biển số xe ra'}
          </button>

          {exitCamError && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              {exitCamError}
            </div>
          )}

          {exitCamPlate && (
            <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded">
              <p className="text-xs font-semibold text-slate-700">Biển số (realtime):</p>
              <p className="text-lg font-bold text-slate-900">{exitCamPlate.plateNumber}</p>
              <p className="mt-1 text-[11px] text-slate-600">
                Độ tin cậy: {(exitCamPlate.confidence * 100).toFixed(1)}%
              </p>
              {(exitCamPlate.plateImageBase64 || exitCamPlate.debugImageBase64) && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {exitCamPlate.plateImageBase64 && (
                    <div>
                      <p className="text-[11px] text-slate-600 mb-1">Ảnh biển số</p>
                      <img
                        src={`data:image/jpeg;base64,${exitCamPlate.plateImageBase64}`}
                        alt="Biển số"
                        className="w-full rounded border bg-black/60"
                      />
                    </div>
                  )}
                  {exitCamPlate.debugImageBase64 && (
                    <div>
                      <p className="text-[11px] text-slate-600 mb-1">Ảnh nhị phân</p>
                      <img
                        src={`data:image/jpeg;base64,${exitCamPlate.debugImageBase64}`}
                        alt="Biển số nhị phân"
                        className="w-full rounded border bg-black/60"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>

      {/* ========== PHẦN 3: BÃI ĐỖ ========== */}
      <div className="bg-white border rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4 text-blue-600">Bãi Đỗ</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-700">Camera Bãi Đỗ (Gốc)</h3>
            <img
              src={`${AI_BASE}/api/cameras/parking/stream`}
              alt="Bãi đỗ hiện tại"
              className="w-full h-84 object-cover rounded border bg-black"
            />
          </div>
          
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-700">Bãi Đỗ đã xử lý</h3>
            <img
              src={`data:image/jpeg;base64,${slotDetection?.processedImageBase64}`}
              alt="Bãi đỗ đã xử lý"
              className="w-full h-84 object-cover rounded border bg-black"
            />
          </div>

          <button
            onClick={handleSlotDetect}
            disabled={slotDetectionLoading}
            className="w-full mb-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {slotDetectionLoading ? 'Đang xử lý...' : 'Nhận diện ô trống'}
          </button>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-700">Thông tin bãi đỗ (Realtime)</h3>
            {slotError && (
              <p className="text-xs text-red-600 mb-2">{slotError}</p>
            )}
            {slotDetectionLoading && (
              <p className="text-xs text-gray-500 mb-2">Đang detect...</p>
            )}
            
            {slotDetection && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-600">Tổng số slot</p>
                    <p className="text-lg font-bold text-blue-900">{slotDetection.totalSlots ?? 0}</p>
                  </div>
                  <div className="p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-xs text-red-600">Có xe</p>
                    <p className="text-lg font-bold text-red-900">{slotDetection.occupiedSlots ?? 0}</p>
                  </div>
                  <div className="p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-xs text-green-600">Còn trống</p>
                    <p className="text-lg font-bold text-green-900">{slotDetection.freeSlots ?? 0}</p>
                  </div>
                </div>
                
                {slotDetection.detectedCars !== undefined && (
                  <p className="text-xs text-gray-600">
                    Xe detect được: <span className="font-semibold">{slotDetection.detectedCars}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
