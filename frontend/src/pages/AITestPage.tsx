import { useState } from 'react'
import { detectPlate, detectSlots, type PlateDetectionResult, type SlotDetectionResult } from '../services/ai'

export default function AITestPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [plateResult, setPlateResult] = useState<PlateDetectionResult | null>(null)
  const [slotResult, setSlotResult] = useState<SlotDetectionResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPlateResult(null)
      setSlotResult(null)
      setError(null)
    }
  }

  const handleDetectPlate = async () => {
    if (!selectedFile) return

    setLoading(true)
    setError(null)

    try {
      const result = await detectPlate(selectedFile)
      setPlateResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDetectSlots = async () => {
    if (!selectedFile) return

    setLoading(true)
    setError(null)

    try {
      const result = await detectSlots(selectedFile)
      setSlotResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">🧠 AI Detection Test</h1>

      {/* File Upload */}
      <div className="bg-white p-6 border rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Upload Image</h2>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full mb-4"
        />
        {selectedFile && (
          <p className="text-sm text-gray-600">
            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </p>
        )}
      </div>

      {/* Plate Detection */}
      <div className="bg-white p-6 border rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">License Plate Detection</h2>
        <button
          onClick={handleDetectPlate}
          disabled={!selectedFile || loading}
          className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? '⏳ Detecting...' : '🔍 Detect Plate'}
        </button>

        {plateResult && (
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-lg font-semibold text-green-800">✅ Detection Successful!</p>
            <p className="mt-2">
              <span className="font-semibold">Plate Number:</span>{' '}
              <span className="text-2xl font-bold text-blue-600">{plateResult.plateNumber}</span>
            </p>
            <p className="mt-2">
              <span className="font-semibold">Confidence:</span>{' '}
              <span className="text-green-600">{(plateResult.confidence * 100).toFixed(2)}%</span>
            </p>
          </div>
        )}
      </div>

      {/* Slot Detection */}
      <div className="bg-white p-6 border rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Parking Slot Detection</h2>
        <button
          onClick={handleDetectSlots}
          disabled={!selectedFile || loading}
          className="w-full mb-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? '⏳ Detecting...' : '🔍 Detect Slots'}
        </button>

        {slotResult && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded">
            <p className="text-lg font-semibold text-purple-800">
              ✅ Detected {slotResult.length} Slots
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {slotResult.map((slot, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-white border rounded flex justify-between items-center"
                >
                  <span className="font-semibold">{slot.code}</span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      slot.status === 'available'
                        ? 'bg-green-200 text-green-800'
                        : 'bg-red-200 text-red-800'
                    }`}
                  >
                    {slot.status}
                  </span>
                  <span className="text-xs text-gray-600">
                    {(slot.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 p-4 border border-red-200 rounded">
          <p className="text-red-800 font-semibold">❌ Error:</p>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Preview Image */}
      {selectedFile && (
        <div className="bg-white p-6 border rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Image Preview</h2>
          <img
            src={URL.createObjectURL(selectedFile)}
            alt="Preview"
            className="max-w-full h-auto rounded border"
          />
        </div>
      )}
    </div>
  )
}

