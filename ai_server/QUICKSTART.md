```
ai_server/
├── models/
│   ├── wpod-net.json          # Rename từ wpod-net_update1.json
│   ├── wpod-net.h5            # Rename từ wpod-net_update1.h5
│   └── NhanDienKyTu.h5
├── ai_models/
│   ├── plate_detector.py
│   └── slot_detector.py
└── app.py
```

```bash
cd ai_server

# Active venv
venv\Scripts\activate  # Windows

# Cài đặt packages
pip install -r requirements.txt

# Nếu thiếu package, cài thêm:
pip install tensorflow opencv-python pillow numpy scikit-image scipy
```

## Bước 4: Chạy server

```bash
python app.py
```

```bash
# Health check
curl http://localhost:5001/health

# Test plate detection
curl -X POST http://localhost:5001/api/detect/plate ^
  -F "image=@path/to/car_image.jpg"
```

## Troubleshooting

### Lỗi import

```bash
pip install --upgrade tensorflow keras opencv-python
```
