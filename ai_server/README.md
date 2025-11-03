# AI Detection Service (Flask)

AI service độc lập bằng Python Flask cho Smart Parking System, xử lý nhận dạng biển số xe và trạng thái chỗ đỗ xe.

## Cài đặt

### 1. Cài đặt Python dependencies

```bash
cd ai_server
pip install -r requirements.txt
```

Hoặc sử dụng virtual environment (khuyến nghị):

```bash
# Tạo virtual environment
python -m venv venv

# Kích hoạt virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt
```

### 2. Cấu hình môi trường

Tạo file `.env`:

```bash
PORT=5001
FLASK_ENV=development
FLASK_DEBUG=True
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Model paths (relative to ai_server directory)
WPOD_MODEL_PATH=models/wpod-net
OCR_MODEL_PATH=models/NhanDienKyTu.h5
SLOT_MODEL_PATH=
```

### 3. Chuẩn bị AI Models

Đặt các model files vào thư mục `models/`:

```
models/
├── wpod-net.json       # WPOD-NET architecture
├── wpod-net.h5         # WPOD-NET weights
└── NhanDienKyTu.h5     # OCR model
```

**Lưu ý**: Nếu không có models, server sẽ chạy ở chế độ stub (trả về dữ liệu mẫu).

## Chạy Server

### Development mode

```bash
python app.py
```

### Production mode với Gunicorn

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

Server sẽ chạy tại: `http://localhost:5001`

## API Endpoints

### 1. Health Check

```bash
GET /health
```

Response:

```json
{
  "status": "ok",
  "service": "AI Detection Service",
  "timestamp": "2024-01-01T00:00:00.000000"
}
```

### 2. Nhận dạng biển số xe

```bash
POST /api/detect/plate
Content-Type: multipart/form-data

Body: image (file)
```

Response:

```json
{
  "success": true,
  "data": {
    "plateNumber": "29A-123.45",
    "confidence": 0.92,
    "boundingBox": {
      "x": 100,
      "y": 200,
      "width": 300,
      "height": 100
    }
  }
}
```

### 3. Nhận dạng trạng thái chỗ đỗ

```bash
POST /api/detect/slots
Content-Type: multipart/form-data

Body: image (file)
```

Response:

```json
{
  "success": true,
  "data": {
    "slots": [
      {
        "code": "A1",
        "status": "available",
        "confidence": 0.95
      },
      {
        "code": "A2",
        "status": "occupied",
        "confidence": 0.98
      }
    ]
  }
}
```

## Cấu trúc Code

Hệ thống đã được thiết kế module với các components tách biệt:

```
ai_server/
├── app.py                    # Flask API chính
├── ai_models/
│   ├── __init__.py
│   ├── plate_detector.py     # License plate detection logic
│   └── slot_detector.py      # Parking slot detection logic
├── models/                   # AI model files
│   ├── wpod-net.json
│   ├── wpod-net.h5
│   └── NhanDienKyTu.h5
└── uploads/                  # Uploaded images (temporary)
```

### Plate Detector (`plate_detector.py`)

Contains `LicensePlateDetector` class with:

- WPOD-NET integration for license plate detection
- Character segmentation
- OCR recognition
- Returns: `{'plateNumber': str, 'confidence': float, 'boundingBox': dict}`

### Slot Detector (`slot_detector.py`)

Contains `ParkingSlotDetector` class with:

- Basic image processing for slot detection
- Returns: `[{'code': str, 'status': str, 'confidence': float}]`

**Note**: Slot detection hiện đang là stub implementation. Cần train model hoặc implement logic thực tế.

## Tích hợp với Backend

Backend Node.js sẽ gọi API này thông qua HTTP requests. Đảm bảo:

1. CORS đã được cấu hình đúng trong `.env`
2. Backend URL đúng: `http://localhost:5001`
3. Backend xử lý errors từ AI service

## Testing

Test với curl:

```bash
# Health check
curl http://localhost:5001/health

# Test plate detection
curl -X POST http://localhost:5001/api/detect/plate \
  -F "image=@path/to/test_image.jpg"

# Test slot detection
curl -X POST http://localhost:5001/api/detect/slots \
  -F "image=@path/to/parking_image.jpg"
```

## Deployment

### Docker (recommended)

Tạo `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5001", "app:app"]
```

Build và run:

```bash
docker build -t ai-server .
docker run -p 5001:5001 ai-server
```

### Production recommendations

- Sử dụng Gunicorn với multiple workers
- Set up reverse proxy (Nginx)
- Enable HTTPS
- Set up logging và monitoring
- Configure proper CORS origins
