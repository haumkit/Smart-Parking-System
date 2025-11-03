# Hướng dẫn Setup Smart Parking System

## Bước 1: Cài đặt Dependencies

### Backend (Node.js)

```bash
cd backend
npm install
```

Các packages được thêm vào:

- `axios`: Gọi HTTP requests đến AI server
- `form-data`: Để gửi file upload đến AI server

### AI Server (Python Flask)

```bash
cd ai_server

# Tạo virtual environment
python -m venv venv

# Kích hoạt venv
# Windows:
venv\Scripts\activate

# Linux/Mac:
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt
```

### Frontend (React)

```bash
cd frontend
npm install
```

## Bước 2: Cấu hình Environment Variables

### Backend

Tạo file `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smart_parking
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
AI_SERVICE_URL=http://localhost:5001
AI_FALLBACK=false
```

### AI Server

Tạo file `ai_server/.env`:

```env
PORT=5001
FLASK_ENV=development
FLASK_DEBUG=True
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Model paths (optional - leave empty if no models)
WPOD_MODEL_PATH=models/wpod-net
OCR_MODEL_PATH=models/NhanDienKyTu.h5
SLOT_MODEL_PATH=
```

**Chuẩn bị AI Models (Optional)**:

Nếu bạn có AI models, đặt chúng vào `ai_server/models/`:

```
models/
├── wpod-net.json       # WPOD-NET architecture
├── wpod-net.h5         # WPOD-NET weights
└── NhanDienKyTu.h5     # OCR model
```

**Lưu ý**: Nếu không có models, server sẽ chạy ở chế độ stub (trả về dữ liệu mẫu).

## Bước 3: Khởi động các service

### 1. Khởi động MongoDB (nếu chưa có)

```bash
# Windows
# Tải MongoDB và chạy mongod.exe

# Linux/Mac
mongod
```

### 2. Khởi động AI Server

```bash
cd ai_server
venv\Scripts\activate  # Windows
python app.py
```

Kiểm tra: `http://localhost:5001/health`

### 3. Khởi động Backend

```bash
cd backend
npm start
```

Kiểm tra: `http://localhost:5000/`

### 4. Khởi động Frontend

```bash
cd frontend
npm run dev
```

Mở browser: `http://localhost:5173`

## Bước 4: Test Integration

### Test AI Server

```bash
curl http://localhost:5001/
curl http://localhost:5001/health

# Test plate detection (với file ảnh test)
curl -X POST http://localhost:5001/api/detect/plate -F "image=@path/to/car.jpg"
```

### Test Backend → AI Integration

```bash
# Đăng ký user trước
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'

# Login để lấy token
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Test AI endpoint
curl -X POST http://localhost:5000/api/v1/ai/plate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@path/to/car.jpg"
```

## Troubleshooting

### AI Server không khởi động được

- Kiểm tra Python version (yêu cầu Python 3.8+)
- Kiểm tra virtual environment đã được activate
- Chạy `pip install -r requirements.txt` lại

### Backend không kết nối được AI Server

- Kiểm tra AI server đã chạy tại port 5001
- Kiểm tra `AI_SERVICE_URL` trong backend/.env
- Kiểm tra firewall/antivirus chặn kết nối

### Lỗi CORS

- Kiểm tra `ALLOWED_ORIGINS` trong ai_server/.env
- Đảm bảo frontend URL được thêm vào list

### MongoDB connection error

- Đảm bảo MongoDB đã chạy
- Kiểm tra `MONGODB_URI` trong backend/.env
- Kiểm tra MongoDB authentication nếu có

## Production Deployment

### Backend

```bash
# Set production environment
export NODE_ENV=production

# Sử dụng PM2
npm install -g pm2
pm2 start backend/index.js --name parking-backend
```

### AI Server

```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

### Frontend

```bash
# Build
npm run build

# Serve với Nginx hoặc serve static files
```

## Cấu trúc thư mục sau khi setup

```
Smart-Parking-System/
├── backend/
│   ├── .env                    # Backend config
│   ├── node_modules/
│   ├── controllers/
│   │   └── ai.controller.js    # ✅ Đã update để gọi AI server
│   ├── routes/
│   │   └── v1/
│   │       └── ai.routes.js
│   └── package.json            # ✅ Đã thêm axios + form-data
│
├── ai_server/
│   ├── .env                    # AI server config
│   ├── venv/                   # Python virtual environment
│   ├── uploads/                # Uploaded images
│   ├── app.py                  # ✅ Flask API chính
│   ├── requirements.txt        # ✅ Python dependencies
│   └── README.md
│
└── frontend/
    └── ...
```

## Next Steps

1. ✅ AI server đã được tách riêng
2. ✅ Backend gọi AI server qua HTTP
3. ⏭️ Tích hợp AI models thực tế vào `ai_server/app.py`
4. ⏭️ Set up Docker containers
5. ⏭️ Deploy production
