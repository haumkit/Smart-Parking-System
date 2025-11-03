# AI Models Directory

Đặt các model files vào đây:

## Cấu trúc thư mục

```
models/
├── wpod-net.json          # WPOD-NET model architecture
├── wpod-net.h5            # WPOD-NET model weights
├── NhanDienKyTu.h5        # OCR model for character recognition
└── README.md              # File này
```

## Model Files cần có:

### 1. WPOD-NET Model (License Plate Detection)

- `wpod-net.json`: Model architecture file
- `wpod-net.h5`: Model weights

Download từ Google Drive hoặc train model của bạn.

### 2. OCR Model (Character Recognition)

- `NhanDienKyTu.h5`: Model để nhận dạng ký tự trên biển số

### 3. Slot Detection Model (Optional - chưa có)

- Model để nhận dạng chỗ đỗ trống/đã đỗ
- Chờ implement sau

## Lưu ý

- Models thường có kích thước lớn (vài MB đến vài trăm MB)
- Không commit models vào git (đã được thêm vào .gitignore)
- Cần upload models lên server khi deploy
