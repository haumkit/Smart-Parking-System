import { useState, useRef, useEffect } from 'react'
import { detectSlots, type SlotDetectionResult, type SlotDetectionResponse } from '../services/ai'
import { walkInEntry, walkInExit, listAvailableSlots, type WalkInEntryResponse, type WalkInExitResponse, type AvailableSlot } from '../services/parking'

export default function DashboardPage() {

  const [entryImage, setEntryImage] = useState<File | null>(null)
  const [entryPreview, setEntryPreview] = useState<string | null>(null)
  const [entryResult, setEntryResult] = useState<WalkInEntryResponse | null>(null)
  const [entryLoading, setEntryLoading] = useState(false)
  const [entryError, setEntryError] = useState<string | null>(null)
  const entryFileInputRef = useRef<HTMLInputElement>(null)

  const [exitImage, setExitImage] = useState<File | null>(null)
  const [exitPreview, setExitPreview] = useState<string | null>(null)
  const [exitResult, setExitResult] = useState<WalkInExitResponse | null>(null)
  const [exitLoading, setExitLoading] = useState(false)
  const [exitError, setExitError] = useState<string | null>(null)
  const exitFileInputRef = useRef<HTMLInputElement>(null)

  const [parkingImage, setParkingImage] = useState<File | null>(null)
  const [parkingPreview, setParkingPreview] = useState<string | null>(null)
  const [parkingProcessed, setParkingProcessed] = useState<string | null>(null)
  const [slotResults, setSlotResults] = useState<SlotDetectionResult[] | null>(null)
  const [availableSlotsCount, setAvailableSlotsCount] = useState<number>(0)
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [parkingLoading, setParkingLoading] = useState(false)
  const parkingFileInputRef = useRef<HTMLInputElement>(null)

  const formatVNTime = (dateString: string): string => {
    const date = new Date(dateString)
    const vnTime = new Date(date.getTime() + (7 * 60 * 60 * 1000))
    const day = String(vnTime.getUTCDate()).padStart(2, '0')
    const month = String(vnTime.getUTCMonth() + 1).padStart(2, '0')
    const year = vnTime.getUTCFullYear()
    const hours = String(vnTime.getUTCHours()).padStart(2, '0')
    const minutes = String(vnTime.getUTCMinutes()).padStart(2, '0')
    const seconds = String(vnTime.getUTCSeconds()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
  }

  const handleEntryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEntryImage(file)
      setEntryPreview(URL.createObjectURL(file))
      setEntryResult(null)
      setEntryError(null)
    }
  }

  const handleEntryProcess = async () => {
    if (!entryImage) return

    setEntryLoading(true)
    setEntryError(null)
    setEntryResult(null)

    try {
      const result = await walkInEntry(entryImage)
      setEntryResult(result)
      setEntryError(null) 
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process entry'
      setEntryError(errorMessage)
      setEntryResult(null)
    } finally {
      setEntryLoading(false)
    }
  }

  const handleExitImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setExitImage(file)
      setExitPreview(URL.createObjectURL(file))
      setExitResult(null)
      setExitError(null)
    }
  }

  const handleExitProcess = async () => {
    if (!exitImage) return

    setExitLoading(true)
    setExitError(null)
    setExitResult(null)

    try {
      const result = await walkInExit(exitImage)
      setExitResult(result)
      setExitError(null) 
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process exit'
      setExitError(errorMessage)
      setExitResult(null)
    } finally {
      setExitLoading(false)
    }
  }

  const handleParkingImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setParkingImage(file)
      setParkingPreview(URL.createObjectURL(file))
      setParkingProcessed(null)
      setSlotResults(null)
      setAvailableSlotsCount(0)
    }
  }

  const handleParkingProcess = async () => {
    if (!parkingImage) return

    setParkingLoading(true)

    try {
      const resp: SlotDetectionResponse = await detectSlots(parkingImage)
      setSlotResults(resp.slots)

      if (typeof resp.freeSlots === 'number') {
        setAvailableSlotsCount(resp.freeSlots)
      } else {
        const availableCount = resp.slots.filter(slot => slot.status === 'available').length
        setAvailableSlotsCount(availableCount)
      }

      if (resp.processedImageUrl) {
        setParkingProcessed(resp.processedImageUrl)
      } else {
        setParkingProcessed(parkingPreview)
      }

      setTimeout(async () => {
        try {
          const availableData = await listAvailableSlots()
          setAvailableSlots(availableData.slots)
        } catch (err) {
          console.error('Failed to load available slots:', err)
        }
      }, 500)
    } catch (err) {
      console.error('Parking detection error:', err)
    } finally {
      setParkingLoading(false)
    }
  }


  useEffect(() => {
    loadAvailableSlots()
  }, [])

  const loadAvailableSlots = async () => {
    try {
      const data = await listAvailableSlots()
      setAvailableSlots(data.slots)
      setAvailableSlotsCount(data.count)
    } catch (err) {
      console.error('Failed to load available slots:', err)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-white border rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4 text-green-600">Xe Vào</h2>
          
          <div className="mb-4">
            <input
              ref={entryFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleEntryImageChange}
              className="hidden"
            />
            <button
              onClick={() => entryFileInputRef.current?.click()}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 mb-2"
            >
              Chọn ảnh xe vào
            </button>
          </div>

          {entryPreview && (
            <div className="mb-4">
              <img
                src={entryPreview}
                alt="Ảnh xe vào"
                className="w-full h-84 object-cover rounded border"
              />
            </div>
          )}

          {entryError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 font-semibold text-sm">Lỗi:</p>
              <p className="text-red-600 text-sm">{entryError}</p>
            </div>
          )}

          {entryResult && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm font-semibold text-green-800">Biển số:</p>
              <p className="text-xl font-bold text-green-600">{entryResult.plateNumber}</p>
              <div className="mt-2 pt-2 border-t border-green-300">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Thời gian vào: </span>
                  <span className="text-blue-600">{formatVNTime(entryResult.entryTime)}</span>
                </p>
                {entryResult.confidence && (
                  <p className="text-xs text-gray-600 mt-1">
                    Độ tin cậy: {(entryResult.confidence * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleEntryProcess}
            disabled={!entryImage || entryLoading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {entryLoading ? 'Đang xử lý...' : 'Xe Vào'}
          </button>
        </div>

        <div className="bg-white border rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4 text-red-600">Xe Ra</h2>
          
          <div className="mb-4">
            <input
              ref={exitFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleExitImageChange}
              className="hidden"
            />
            <button
              onClick={() => exitFileInputRef.current?.click()}
              className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 mb-2"
            >
              Chọn ảnh xe ra
            </button>
          </div>

          {exitPreview && (
            <div className="mb-4">
              <img
                src={exitPreview}
                alt="Ảnh xe ra"
                className="w-full h-84 object-cover rounded border"
              />
            </div>
          )}

          {exitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 font-semibold text-sm">Lỗi:</p>
              <p className="text-red-600 text-sm">{exitError}</p>
            </div>
          )}

          {exitResult && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-semibold text-red-800">Biển số:</p>
              <p className="text-xl font-bold text-red-600">{exitResult.plateNumber}</p>
              
              <div className="mt-2 pt-2 border-t border-red-300 space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Thời gian vào: </span>
                  <span className="text-blue-600">{formatVNTime(exitResult.entryTime)}</span>
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Thời gian ra: </span>
                  <span className="text-blue-600">{formatVNTime(exitResult.exitTime)}</span>
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Thời gian đỗ: </span>
                  <span className="text-blue-600">
                    {(() => {
                      const hours = Math.floor(exitResult.durationMinutes / 60)
                      const minutes = exitResult.durationMinutes % 60
                      if (hours === 0) {
                        return `${minutes} phút`
                      }
                      return `${hours} giờ ${minutes > 0 ? `${minutes} phút` : ''}`
                    })()}
                  </span>
                </p>
                <p className="text-base font-bold text-red-700 mt-2 pt-2 border-t border-red-300">
                  <span className="font-semibold">Tổng tiền: </span>
                  <span className="text-lg">{new Intl.NumberFormat('vi-VN').format(exitResult.fee)} đ</span>
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleExitProcess}
            disabled={!exitImage || exitLoading}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {exitLoading ? 'Đang xử lý...' : 'Xe Ra'}
          </button>
        </div>
      </div>

      {/* ========== PHẦN 3: BÃI ĐỖ ========== */}
      <div className="bg-white border rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4 text-blue-600">Bãi Đỗ</h2>

        {/* Upload hoặc load random ảnh */}
        <div className="mb-4">
          <input
            ref={parkingFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleParkingImageChange}
            className="hidden"
          />
          <div className="gap-2">
            <button
              onClick={() => parkingFileInputRef.current?.click()}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Chọn ảnh bãi đỗ
            </button>
          </div>
        </div>

        {/* Grid hiển thị ảnh */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Ảnh gốc */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-700">Ảnh Bãi Đỗ Hiện Tại</h3>
            {parkingPreview ? (
              <img
                src={parkingPreview}
                alt="Bãi đỗ gốc"
                className="w-full h-84 object-cover rounded border"
              />
            ) : (
              <div className="w-full h-84 bg-gray-100 border rounded flex items-center justify-center text-gray-400">
                Chưa có ảnh
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-700">Ảnh Đã Xử Lý</h3>
            {parkingProcessed ? (
              <img
                src={parkingProcessed}
                alt="Bãi đỗ đã xử lý"
                className="w-full h-84 object-cover rounded border border-blue-300"
              />
            ) : (
              <div className="w-full h-84 bg-gray-100 border rounded flex items-center justify-center text-gray-400">
                Chưa xử lý
              </div>
            )}
          </div>
        </div>

        {/* Số ô trống */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-blue-800">Số ô trống còn lại:</span>
            <span className="text-2xl font-bold text-blue-600">
              {parkingLoading ? '...' : availableSlotsCount}
            </span>
          </div>
          {slotResults && (
            <p className="font-semibold text-s text-gray-600 mt-1">
              Tổng số ô: {slotResults.length} | Đã đỗ: {slotResults.length - availableSlotsCount}
            </p>
          )}
        </div>

        {availableSlots.length > 0 && (
          <div className="mb-4 p-3 border border-green-200 rounded">
            <h4 className="text-sm font-semibold text-green-800 mb-2">Các ô còn trống:</h4>
            <div className="flex flex-wrap gap-2">
              {availableSlots.map((slot) => (
                <span
                  key={slot.slotNum}
                  className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-semibold"
                >
                  {slot.code || `Slot ${slot.slotNum}`}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleParkingProcess}
          disabled={!parkingImage || parkingLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {parkingLoading ? 'Đang xử lý...' : 'Xử Lý Ảnh Bãi Đỗ'}
        </button>
      </div>
    </div>
  )
}
