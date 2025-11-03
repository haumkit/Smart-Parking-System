# Smart Parking System 🚗

Hệ thống quản lý bãi đỗ xe thông minh với AI nhận dạng biển số và trạng thái chỗ đỗ.

## 🏗️ Architecture

```
Smart-Parking-System/
├── frontend/          # React + TypeScript UI
├── backend/           # Node.js + Express API
└── ai_server/         # Python Flask AI Service
```

### System Flow

```
Client (Browser)
    ↓ HTTP
Frontend (React - Port 5173)
    ↓ HTTP + JWT Auth
Backend (Node.js - Port 5000)
    ↓ HTTP
AI Server (Flask - Port 5001)
    ↓ AI Models
MongoDB Atlas (Cloud)
```

## 🚀 Quick Start

**Xem chi tiết**: `QUICKSTART.md`

### TL;DR

1. **Setup MongoDB Atlas** (FREE tier):

   - https://www.mongodb.com/cloud/atlas/register
   - Create M0 cluster
   - Get connection string

2. **Configure Backend**:

   ```bash
   cd backend
   npm install
   # Tạo .env với MongoDB connection string
   ```

3. **Configure AI Server**:

   ```bash
   cd ai_server
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   # Đặt models vào ai_server/models/
   ```

4. **Start Services**:

   - Terminal 1: AI Server (`python app.py`)
   - Terminal 2: Backend (`npm start`)
   - Terminal 3: Frontend (`npm run dev`)

5. **Test**: Mở http://localhost:5173 → Login → AI Test

## 📚 Documentation

| Document                  | Description                  |
| ------------------------- | ---------------------------- |
| `QUICKSTART.md`           | ⭐ Setup guide nhanh nhất    |
| `MONGODB_ATLAS_SETUP.md`  | Chi tiết setup MongoDB Atlas |
| `E2E_TEST_GUIDE.md`       | Test end-to-end              |
| `POSTMAN_GUIDE.md`        | Test với Postman             |
| `TEST_CHECKLIST.md`       | Testing checklist            |
| `SETUP.md`                | Setup chi tiết               |
| `ai_server/README.md`     | AI Server docs               |
| `ai_server/QUICKSTART.md` | AI Server quick start        |

## 🧠 Features

### AI Detection

- ✅ **License Plate**: Nhận dạng biển số xe
- ⏳ **Parking Slots**: Nhận dạng trạng thái chỗ đỗ (stub)

### Core Features

- ✅ User authentication (JWT)
- ✅ Parking management
- ✅ History tracking
- ✅ Reports & analytics (admin only)

## 🔧 Tech Stack

**Frontend:**

- React 18 + TypeScript
- TailwindCSS
- React Router
- Vite

**Backend:**

- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Multer (file uploads)

**AI Server:**

- Python 3.8+
- Flask + Flask-CORS
- TensorFlow/Keras
- OpenCV

**Database:**

- MongoDB Atlas (cloud)

## 📁 Project Structure

```
Smart-Parking-System/
├── frontend/
│   ├── src/
│   │   ├── pages/           # Pages (Login, Dashboard, etc.)
│   │   ├── components/      # Reusable components
│   │   ├── services/        # API services
│   │   └── App.tsx          # Main app
│   └── package.json
│
├── backend/
│   ├── controllers/         # Business logic
│   ├── models/              # MongoDB models
│   ├── routes/              # API routes
│   ├── middleware/          # Auth, error handling
│   ├── config/              # Database config
│   └── index.js             # Entry point
│
├── ai_server/
│   ├── ai_models/
│   │   ├── plate_detector.py    # Plate detection
│   │   └── slot_detector.py     # Slot detection
│   ├── models/              # AI model files
│   ├── app.py               # Flask server
│   └── requirements.txt     # Python deps
│
└── docs/                    # Documentation
```

## 🔑 Environment Variables

### Backend (.env)

```env
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/smart_parking
JWT_SECRET=your_secret_key
AI_SERVICE_URL=http://localhost:5001
AI_FALLBACK=false
```

### AI Server (.env)

```env
PORT=5001
FLASK_ENV=development
FLASK_DEBUG=True
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
WPOD_MODEL_PATH=models/wpod-net
OCR_MODEL_PATH=models/NhanDienKyTu.h5
```

## 🧪 Testing

### Test with Postman

1. Import: `ai_server/AI_Detection_API.postman_collection.json`
2. See: `POSTMAN_GUIDE.md`

### End-to-End Testing

1. See: `E2E_TEST_GUIDE.md`
2. Checklist: `TEST_CHECKLIST.md`

## 📊 API Endpoints

### Backend (Port 5000)

- `POST /api/v1/auth/register` - Register
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/ai/plate` - Detect plate (auth required)
- `POST /api/v1/ai/slots` - Detect slots (auth required)
- `GET /api/v1/parking/slots` - List slots
- `POST /api/v1/parking/checkin` - Check-in
- `POST /api/v1/parking/checkout` - Check-out

### AI Server (Port 5001)

- `GET /health` - Health check
- `POST /api/detect/plate` - Detect plate
- `POST /api/detect/slots` - Detect slots

## 🚢 Deployment

### Development

```bash
# Start all services manually
python ai_server/app.py      # Terminal 1
npm start                     # Terminal 2
npm run dev                   # Terminal 3
```

### Production

- Setup Docker containers (see individual READMEs)
- Configure nginx reverse proxy
- Enable HTTPS
- Setup monitoring & logging

## 🤝 Contributing

1. Fork repo
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📝 License

ISC

## 🙏 Acknowledgments

- WPOD-NET for license plate detection
- TensorFlow for ML framework
- OpenCV for image processing

## 📞 Support

- 📖 Documentation: See `/docs` folder
- 🐛 Issues: GitHub Issues
- 💬 Questions: Check existing docs

---

**Made with ❤️ for Smart Parking Solutions**
