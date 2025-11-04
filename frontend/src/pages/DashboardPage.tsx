import { useState, useRef } from 'react'
import { detectPlate, detectSlots, type PlateDetectionResult, type SlotDetectionResult } from '../services/ai'

export default function DashboardPage() {

  const [entryImage, setEntryImage] = useState<File | null>(null)
  const [entryPreview, setEntryPreview] = useState<string | null>(null)
  const [entryTime, setEntryTime] = useState<string | null>(null)
  const [entryPlateResult, setEntryPlateResult] = useState<PlateDetectionResult | null>(null)
  const [entryLoading, setEntryLoading] = useState(false)
  const [entryError, setEntryError] = useState<string | null>(null)
  const entryFileInputRef = useRef<HTMLInputElement>(null)

  const [exitImage, setExitImage] = useState<File | null>(null)
  const [exitPreview, setExitPreview] = useState<string | null>(null)
  const [exitTime, setExitTime] = useState<string | null>(null)
  const [exitPlateResult, setExitPlateResult] = useState<PlateDetectionResult | null>(null)
  const [exitLoading, setExitLoading] = useState(false)
  const [exitError, setExitError] = useState<string | null>(null)
  const exitFileInputRef = useRef<HTMLInputElement>(null)

  const [parkingImage, setParkingImage] = useState<File | null>(null)
  const [parkingPreview, setParkingPreview] = useState<string | null>(null)
  const [parkingProcessed, setParkingProcessed] = useState<string | null>(null) // Ảnh đã xử lý AI
  const [slotResults, setSlotResults] = useState<SlotDetectionResult[] | null>(null)
  const [availableSlotsCount, setAvailableSlotsCount] = useState<number>(0)
  const [parkingLoading, setParkingLoading] = useState(false)
  const parkingFileInputRef = useRef<HTMLInputElement>(null)

  const handleEntryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEntryImage(file)
      setEntryPreview(URL.createObjectURL(file))
      setEntryTime(null)
      setEntryPlateResult(null)
      setEntryError(null)
    }
  }

  const handleEntryProcess = async () => {
    if (!entryImage) return

    setEntryLoading(true)
    setEntryError(null)
    const timestamp = new Date().toLocaleString('vi-VN')
    setEntryTime(timestamp)

    try {
      const result = await detectPlate(entryImage)
      setEntryPlateResult(result)
    } catch (err) {
      setEntryError(err instanceof Error ? err.message : 'Detection failed')
    } finally {
      setEntryLoading(false)
    }
  }

  const handleExitImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setExitImage(file)
      setExitPreview(URL.createObjectURL(file))
      setExitTime(null)
      setExitPlateResult(null)
      setExitError(null)
    }
  }

  const handleExitProcess = async () => {
    if (!exitImage) return

    setExitLoading(true)
    setExitError(null)
    const timestamp = new Date().toLocaleString('vi-VN')
    setExitTime(timestamp)

    try {
      const result = await detectPlate(exitImage)
      setExitPlateResult(result)
    } catch (err) {
      setExitError(err instanceof Error ? err.message : 'Detection failed')
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
      // Gọi API nhận diện bãi đỗ
      const results = await detectSlots(parkingImage)
      setSlotResults(results)

      // Đếm số ô trống
      const availableCount = results.filter(slot => slot.status === 'available').length
      setAvailableSlotsCount(availableCount)

      // TODO: Tạo ảnh đã xử lý với overlay (sẽ làm sau khi có API từ backend)
      // Hiện tại tạm thời dùng ảnh gốc
      setParkingProcessed(parkingPreview)
    } catch (err) {
      console.error('Parking detection error:', err)
    } finally {
      setParkingLoading(false)
    }
  }

  // ========== LOAD ẢNH RANDOM TỪ BACKEND (TODO) ==========
  // TODO: Tạo API endpoint trong backend để lấy ảnh random từ thư mục
  // useEffect(() => {
  //   loadRandomParkingImage()
  // }, [])

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
                className="w-full h-48 object-cover rounded border"
              />
            </div>
          )}

          {entryTime && (
            <div className="mb-4 p-2 bg-gray-50 rounded text-sm">
              <span className="font-semibold">Thời gian vào: </span>
              <span className="text-blue-600">{entryTime}</span>
            </div>
          )}

          {/* Error Display */}
          {entryError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 font-semibold text-sm">Lỗi:</p>
              <p className="text-red-600 text-sm">{entryError}</p>
            </div>
          )}

          {/* Kết quả nhận diện biển số */}
          {entryPlateResult && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm font-semibold text-green-800">Biển số:</p>
              <p className="text-xl font-bold text-green-600">{entryPlateResult.plateNumber}</p>
              <p className="text-xs text-gray-600">
                Độ tin cậy: {(entryPlateResult.confidence * 100).toFixed(1)}%
              </p>
            </div>
          )}

          {/* Nút xử lý */}
          <button
            onClick={handleEntryProcess}
            disabled={!entryImage || entryLoading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {entryLoading ? 'Đang xử lý...' : 'Xe Vào'}
          </button>
        </div>

        {/* XE RA */}
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

          {/* Preview ảnh */}
          {exitPreview && (
            <div className="mb-4">
              <img
                src={exitPreview}
                alt="Ảnh xe ra"
                className="w-full h-48 object-cover rounded border"
              />
            </div>
          )}

          {/* Hiển thị thời gian */}
          {exitTime && (
            <div className="mb-4 p-2 bg-gray-50 rounded text-sm">
              <span className="font-semibold">Thời gian ra: </span>
              <span className="text-blue-600">{exitTime}</span>
            </div>
          )}

          {exitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 font-semibold text-sm">Lỗi:</p>
              <p className="text-red-600 text-sm">{exitError}</p>
            </div>
          )}

          {exitPlateResult && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-semibold text-red-800">Biển số:</p>
              <p className="text-xl font-bold text-red-600">{exitPlateResult.plateNumber}</p>
              <p className="text-xs text-gray-600">
                Độ tin cậy: {(exitPlateResult.confidence * 100).toFixed(1)}%
              </p>
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
          <div className="flex gap-2">
            <button
              onClick={() => parkingFileInputRef.current?.click()}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Chọn ảnh bãi đỗ
            </button>
            {/* TODO: Thêm nút "Load ảnh random" khi có API */}
            {/* <button
              onClick={loadRandomParkingImage}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Load ảnh random
            </button> */}
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
                className="w-full h-64 object-cover rounded border"
              />
            ) : (
              <div className="w-full h-64 bg-gray-100 border rounded flex items-center justify-center text-gray-400">
                Chưa có ảnh
              </div>
            )}
          </div>

          {/* Ảnh đã xử lý AI */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-700">Ảnh Đã Xử Lý AI</h3>
            {parkingProcessed ? (
              <img
                src={parkingProcessed}
                alt="Bãi đỗ đã xử lý"
                className="w-full h-64 object-cover rounded border border-blue-300"
              />
            ) : (
              <div className="w-full h-64 bg-gray-100 border rounded flex items-center justify-center text-gray-400">
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
            <p className="text-xs text-gray-600 mt-1">
              Tổng số ô: {slotResults.length} | Đã đỗ: {slotResults.length - availableSlotsCount}
            </p>
          )}
        </div>

        {/* Nút xử lý */}
        <button
          onClick={handleParkingProcess}
          disabled={!parkingImage || parkingLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {parkingLoading ? 'Đang xử lý...' : 'Xử Lý Ảnh Bãi Đỗ'}
        </button>

        {/* Hiển thị kết quả chi tiết các ô */}
        {slotResults && slotResults.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <h4 className="text-sm font-semibold mb-2">Chi tiết các ô:</h4>
            <div className="grid grid-cols-4 gap-2">
              {slotResults.map((slot, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded text-xs text-center ${
                    slot.status === 'available'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  <div className="font-semibold">{slot.code}</div>
                  <div className="text-xs">{slot.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
