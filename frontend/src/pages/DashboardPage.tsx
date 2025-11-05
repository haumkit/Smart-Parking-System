import { useRef, useState } from 'react'
import type { PlateDetectionResult } from '../services/ai'
import { detectPlate } from '../services/ai'

export default function DashboardPage() {
  const [entryFile, setEntryFile] = useState<File | null>(null)
  const [exitFile, setExitFile] = useState<File | null>(null)
  const [entryPreview, setEntryPreview] = useState<string | null>(null)
  const [exitPreview, setExitPreview] = useState<string | null>(null)
  const [loadingEntry, setLoadingEntry] = useState(false)
  const [loadingExit, setLoadingExit] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Shared plate info (shows result from last extraction)
  const [plateInfo, setPlateInfo] = useState<{
    source: 'entry' | 'exit' | null
    result: PlateDetectionResult | null
  }>({ source: null, result: null })

  const entryInputRef = useRef<HTMLInputElement | null>(null)
  const exitInputRef = useRef<HTMLInputElement | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, type: 'entry' | 'exit') {
    const file = e.target.files?.[0] ?? null
    if (type === 'entry') {
      setEntryFile(file)
      setEntryPreview(file ? URL.createObjectURL(file) : null)
    } else {
      setExitFile(file)
      setExitPreview(file ? URL.createObjectURL(file) : null)
    }
    // reset error/plate info only when new selection
    setError(null)
  }

  async function extractPlate(type: 'entry' | 'exit') {
    setError(null)
    const file = type === 'entry' ? entryFile : exitFile
    if (!file) {
      setError('Vui lòng chọn ảnh trước khi trích xuất.')
      return
    }

    try {
      if (type === 'entry') setLoadingEntry(true)
      else setLoadingExit(true)

      const res = await detectPlate(file)
      setPlateInfo({ source: type, result: res })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi gọi dịch vụ AI')
    } finally {
      if (type === 'entry') setLoadingEntry(false)
      else setLoadingExit(false)
    }
  }

  function clearFile(type: 'entry' | 'exit') {
    if (type === 'entry') {
      setEntryFile(null)
      setEntryPreview(null)
      if (entryInputRef.current) entryInputRef.current.value = ''
    } else {
      setExitFile(null)
      setExitPreview(null)
      if (exitInputRef.current) exitInputRef.current.value = ''
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Entry */}
      <div className="p-4 bg-white border rounded space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Phương tiện vào</h3>
          <div className="text-sm text-gray-500">Upload ảnh → Trích xuất biển số</div>
        </div>

        <div className="border rounded p-3 h-52 flex items-center justify-center bg-gray-50">
          {entryPreview ? (
            <img src={entryPreview} alt="Entry preview" className="max-h-full max-w-full object-contain rounded" />
          ) : (
            <div className="text-center text-gray-400">Chưa chọn ảnh</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={entryInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, 'entry')}
            className="block"
          />
          <button
            onClick={() => extractPlate('entry')}
            disabled={loadingEntry || !entryFile}
            className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {loadingEntry ? 'Đang trích xuất...' : 'Trích xuất biển số'}
          </button>
          <button onClick={() => clearFile('entry')} className="px-3 py-2 rounded bg-gray-200">Xóa</button>
        </div>
      </div>

      {/* Exit */}
      <div className="p-4 bg-white border rounded space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Phương tiện ra</h3>
          <div className="text-sm text-gray-500">Upload ảnh → Trích xuất biển số</div>
        </div>

        <div className="border rounded p-3 h-52 flex items-center justify-center bg-gray-50">
          {exitPreview ? (
            <img src={exitPreview} alt="Exit preview" className="max-h-full max-w-full object-contain rounded" />
          ) : (
            <div className="text-center text-gray-400">Chưa chọn ảnh</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={exitInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, 'exit')}
            className="block"
          />
          <button
            onClick={() => extractPlate('exit')}
            disabled={loadingExit || !exitFile}
            className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {loadingExit ? 'Đang trích xuất...' : 'Trích xuất biển số'}
          </button>
          <button onClick={() => clearFile('exit')} className="px-3 py-2 rounded bg-gray-200">Xóa</button>
        </div>
      </div>

      {/* Plate Info */}
      <div className="p-4 bg-white border rounded space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Thông tin biển số</h3>
          <div className="text-sm text-gray-500">Kết quả trích xuất từ ảnh</div>
        </div>

        <div className="p-3 border rounded bg-gray-50 min-h-[150px]">
          {plateInfo.result ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-500">Nguồn:</div>
              <div className="text-xl font-bold">{plateInfo.source === 'entry' ? 'Phương tiện vào' : 'Phương tiện ra'}</div>

              <div className="mt-2 text-sm text-gray-500">Biển số:</div>
              <div className="text-2xl font-semibold text-blue-600">{plateInfo.result.plateNumber}</div>

              <div className="mt-2 flex gap-4">
                <div>
                  <div className="text-sm text-gray-500">Độ tin cậy</div>
                  <div className="font-medium">{(plateInfo.result.confidence * 100).toFixed(2)}%</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">Bounding box</div>
                  <div className="text-xs text-gray-700">
                    {plateInfo.result.boundingBox ? (
                      <>
                        x: {plateInfo.result.boundingBox.x}, y: {plateInfo.result.boundingBox.y}, w: {plateInfo.result.boundingBox.width}, h: {plateInfo.result.boundingBox.height}
                      </>
                    ) : (
                      <span className="italic">Không có</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Kết quả trống — thực hiện trích xuất từ ô "Phương tiện vào" hoặc "Phương tiện ra".</div>
          )}
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      {/* Parking overview (placeholder) */}
      <div className="p-4 bg-white border rounded space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Ảnh bãi đỗ & Trạng thái</h3>
          <div className="text-sm text-gray-500">Tạm thời</div>
        </div>

        <div className="border rounded p-3 h-48 flex items-center justify-center bg-gray-50 text-gray-400">
          Nội dung ô bãi đỗ sẽ hiện thông tin ảnh bãi đỗ và số ô trống — đang để tạm.
        </div>

        <div className="text-sm text-muted">Bạn có thể dùng endpoint phát hiện slot để load ảnh và số ô trống về sau.</div>
      </div>
    </div>
  )
}