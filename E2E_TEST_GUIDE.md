# End-to-End Testing Guide

Hướng dẫn test toàn bộ hệ thống: AI Server → Backend → Frontend

## Kiến trúc hệ thống

```
User (Browser)
    ↓
Frontend (React - Port 5173)
    ↓ HTTP + JWT Auth
Backend (Node.js - Port 5000)
    ↓ HTTP
AI Server (Flask - Port 5001)
    ↓ Inference
AI Models
```

## Bước 1: Khởi động các service

Mở **3 terminals** khác nhau:

### Terminal 1: AI Server

```bash
cd ai_server
venv\Scripts\activate  # Windows
python app.py
```

Expected output:

```
🧠 Starting AI Detection Service on port 5001
Loading AI models...
✅ AI models loaded successfully!
* Running on http://127.0.0.1:5001
```

### Terminal 2: Backend

```bash
cd backend
npm start
```

Expected output:

```
Server running on port 5000
MongoDB connected
```

### Terminal 3: Frontend

```bash
cd frontend
npm run dev
```

Expected output:

```
VITE ready in xxx ms
➜ Local: http://localhost:5173/
```

## Bước 2: Setup Database

Backend cần MongoDB. Nếu chưa có user để test:

### Tạo user qua Backend API

```bash
# Register new user
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"test123","role":"admin"}'
```

Hoặc test với Postman:

- POST `http://localhost:5000/api/v1/auth/register`
- Body:

```json
{
  "name": "Test User",
  "email": "test@test.com",
  "password": "test123",
  "role": "admin"
}
```

## Bước 3: Test Flow

### 1. Test AI Server (Đã làm với Postman)

✅ **Status**: Done

- Upload ảnh → Detect plate thành công

### 2. Test Backend → AI Server

#### Cách 1: Postman

1. **Login trước** để lấy token:

   - POST `http://localhost:5000/api/v1/auth/login`
   - Body: `{"email":"test@test.com","password":"test123"}`
   - Copy `token` từ response

2. **Test Plate Detection** qua Backend:
   - POST `http://localhost:5000/api/v1/ai/plate`
   - Headers: `Authorization: Bearer YOUR_TOKEN`
   - Body: form-data → Key: `image` → Upload file

Expected Response:

```json
{
  "plateNumber": "29A-12345",
  "confidence": 0.92,
  "boundingBox": null
}
```

#### Cách 2: cURL

```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@test.com\",\"password\":\"test123\"}"

# Copy token, then:
curl -X POST http://localhost:5000/api/v1/ai/plate \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "image=@path/to/car.jpg"
```

### 3. Test Frontend End-to-End

#### Bước 1: Login

1. Mở browser: `http://localhost:5173/login`
2. Enter credentials:
   - Email: `test@test.com`
   - Password: `test123`
3. Click Login → Redirect to Dashboard

#### Bước 2: Test AI Detection

1. Click **🧠 AI Test** trên navigation bar
2. Click **Choose File** → Select ảnh xe
3. Click **🔍 Detect Plate**
4. Đợi kết quả:
   - ✅ Plate number hiển thị
   - ✅ Confidence score
   - ✅ Preview image

#### Bước 3: Test Slot Detection

1. Trên cùng page
2. Click **🔍 Detect Slots**
3. Đợi kết quả:
   - ✅ Danh sách slots
   - ✅ Status (available/occupied)
   - ✅ Confidence scores

## Troubleshooting

### ❌ "Connection refused" khi test Backend

**Cause**: AI Server chưa chạy  
**Fix**: Check Terminal 1, đảm bảo AI Server running

### ❌ "401 Unauthorized"

**Cause**: Chưa login hoặc token expired  
**Fix**: Login lại và copy token mới

### ❌ "AI service is currently unavailable"

**Cause**: Backend không kết nối được AI Server  
**Fix**:

- Check `AI_SERVICE_URL=http://localhost:5001` trong `.env`
- Verify AI Server đang chạy trên port 5001

### ❌ "CORS policy" error

**Cause**: CORS configuration sai  
**Fix**: Check `.env` files:

- AI Server: `ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000`
- Backend: CORS should allow frontend origin

### ❌ Frontend không load được

**Cause**: Frontend server chưa chạy hoặc port conflict  
**Fix**:

- Check Terminal 3
- Try `npm run dev` again
- Check port 5173 không bị block

### ❌ "No MongoDB connection"

**Cause**: MongoDB không chạy  
**Fix**:

- Start MongoDB service
- Check connection string trong `.env`

## Success Criteria

✅ **AI Server**: Models loaded, plate detection works  
✅ **Backend**: Authentication OK, calls AI Server successfully  
✅ **Frontend**: Login OK, can upload & detect, UI displays results  
✅ **End-to-End**: Image → Frontend → Backend → AI → Results back

## Next Steps

Sau khi test thành công:

1. ✅ **Production**: Setup Docker containers
2. ✅ **Monitoring**: Add logging & metrics
3. ✅ **Performance**: Optimize model inference
4. ✅ **Security**: Add rate limiting, API keys
5. ✅ **Testing**: Add unit tests & integration tests

## Quick Reference

| Service   | Port | URL                          | Status Check |
| --------- | ---- | ---------------------------- | ------------ |
| AI Server | 5001 | http://localhost:5001/health | ✅           |
| Backend   | 5000 | http://localhost:5000/       | ✅           |
| Frontend  | 5173 | http://localhost:5173/       | ✅           |

Test commands:

```bash
# AI Server health
curl http://localhost:5001/health

# Backend health
curl http://localhost:5000/

# AI Server direct (no auth)
curl -X POST http://localhost:5001/api/detect/plate -F "image=@test.jpg"

# Backend AI (needs auth)
curl -X POST http://localhost:5000/api/v1/ai/plate \
  -H "Authorization: Bearer TOKEN" \
  -F "image=@test.jpg"
```

## Performance Testing

### Test với nhiều requests

```bash
# Use Apache Bench
ab -n 10 -c 2 -T 'multipart/form-data; boundary=xxx' \
  -p test.jpg http://localhost:5001/api/detect/plate
```

### Monitor response times

- AI Server: ~2-5 seconds per image
- Backend proxy: +100-200ms overhead
- Frontend: +network latency

### Load test

Use JMeter hoặc Artillery để test concurrent users.
