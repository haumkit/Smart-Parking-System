# Docker Setup Guide

Hướng dẫn triển khai hệ thống Smart Parking System với Docker.

## 📋 Yêu cầu

- **Docker Desktop** (Windows/Mac) hoặc **Docker Engine** (Linux)
- **Docker Compose** (thường đi kèm với Docker Desktop)
- **MongoDB Atlas** account (hoặc MongoDB local)

## 🚀 Cài đặt nhanh

### 1. Cài đặt Docker

**Windows/Mac:**
- Tải và cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop)

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose-plugin

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. Cấu hình Environment Variables

Tạo file `.env` ở thư mục gốc dự án:

```bash
cp .env.example .env
```

Chỉnh sửa `.env` với thông tin của bạn:

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/smart_parking
JWT_SECRET=your_super_secret_jwt_key_change_this
VITE_API_BASE=http://localhost:5000/api/v1
```

### 3. Đảm bảo AI Models có sẵn

Đảm bảo các file model AI đã có trong `ai_server/models/`:
- `wpod-net.h5`
- `wpod-net.json`
- `last-dataset-update.h5`
- `slots_model.pt`

### 4. Build và chạy với Docker Compose

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Xem logs của service cụ thể
docker-compose logs -f backend
docker-compose logs -f ai-server
docker-compose logs -f frontend
```

### 5. Truy cập ứng dụng

- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:5000
- **AI Server**: http://localhost:5001

## 📦 Cấu trúc Docker

### Services

1. **frontend** (Port 80)
   - React app được build và serve bằng Nginx
   - Build-time: Vite compile React → static files
   - Runtime: Nginx serve static files

2. **backend** (Port 5000)
   - Node.js + Express API
   - Kết nối MongoDB Atlas
   - Giao tiếp với AI Server

3. **ai-server** (Port 5001)
   - Python + Flask
   - TensorFlow + OpenCV
   - Xử lý nhận diện biển số và ô đỗ

### Networks

Tất cả services nằm trong network `smart-parking-network` để giao tiếp với nhau.

## 🔧 Các lệnh hữu ích

### Quản lý containers

```bash
# Xem trạng thái containers
docker-compose ps

# Dừng tất cả services
docker-compose down

# Dừng và xóa volumes
docker-compose down -v

# Restart một service
docker-compose restart backend

# Rebuild một service sau khi sửa code
docker-compose up -d --build backend
```

### Debugging

```bash
# Vào trong container
docker-compose exec backend sh
docker-compose exec ai-server bash
docker-compose exec frontend sh

# Xem logs real-time
docker-compose logs -f --tail=100

# Kiểm tra health check
docker-compose ps
```

### Cleanup

```bash
# Xóa tất cả containers, networks
docker-compose down

# Xóa images
docker-compose down --rmi all

# Xóa volumes (cẩn thận - mất dữ liệu)
docker-compose down -v

# Cleanup toàn bộ (containers, images, volumes)
docker system prune -a --volumes
```

## 🐛 Troubleshooting

### 1. Port đã được sử dụng

```bash
# Kiểm tra port đang được sử dụng
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Mac/Linux

# Thay đổi port trong docker-compose.yml
ports:
  - "5001:5000"  # Thay vì 5000:5000
```

### 2. AI Server không khởi động được

- Kiểm tra models có đầy đủ không
- Xem logs: `docker-compose logs ai-server`
- Kiểm tra memory: AI Server cần ít nhất 2GB RAM

### 3. Frontend không kết nối được Backend

- Kiểm tra `VITE_API_BASE` trong `.env`
- Rebuild frontend: `docker-compose up -d --build frontend`
- Kiểm tra network: `docker network inspect smart-parking-network`

### 4. MongoDB connection error

- Kiểm tra `MONGODB_URI` trong `.env`
- Đảm bảo MongoDB Atlas cho phép IP của bạn
- Kiểm tra firewall/network

### 5. Build fails

```bash
# Xóa cache và build lại
docker-compose build --no-cache

# Build từng service
docker-compose build backend
docker-compose build ai-server
docker-compose build frontend
```

## 📝 Development với Docker

### Hot reload (Development mode)

Để phát triển với hot reload, bạn có thể:

1. **Option 1**: Chạy services riêng lẻ (không dùng Docker)
2. **Option 2**: Mount volumes để code sync

Ví dụ cho backend:

```yaml
backend:
  volumes:
    - ./backend:/app
    - /app/node_modules  # Prevent overwrite
  environment:
    - NODE_ENV=development
```

Sau đó chạy `npm install` và `npm run dev` trong container.

## 🚢 Production Deployment

### 1. Tối ưu images

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Tag và push lên registry (nếu cần)
docker tag smart-parking-backend:latest your-registry/backend:latest
docker push your-registry/backend:latest
```

### 2. Environment variables

- Sử dụng secrets management (Docker Secrets, AWS Secrets Manager, etc.)
- Không commit `.env` vào git
- Sử dụng `.env.production` cho production

### 3. Security

- Đổi `JWT_SECRET` mạnh
- Cấu hình firewall
- Sử dụng HTTPS (reverse proxy như Nginx/Traefik)
- Giới hạn resources cho containers

### 4. Monitoring

- Sử dụng health checks (đã có trong docker-compose.yml)
- Monitor logs với ELK stack hoặc CloudWatch
- Set up alerts

## 📊 Resource Requirements

- **Minimum**:
  - CPU: 2 cores
  - RAM: 4GB
  - Disk: 10GB

- **Recommended**:
  - CPU: 4 cores
  - RAM: 8GB
  - Disk: 20GB

- **AI Server** cần nhiều RAM nhất (2-4GB)

## 🔗 Tài liệu tham khảo

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)


