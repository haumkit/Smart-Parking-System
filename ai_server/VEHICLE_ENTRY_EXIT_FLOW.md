# Quy Trình Xử Lý Xe Vào/Ra - Chi Tiết Kỹ Thuật

## 📋 Tổng Quan

Tài liệu này mô tả chi tiết quy trình xử lý xe vào và ra bãi đỗ, từ kết nối camera đến nhận diện biển số và gửi webhook về Backend.

---

## 🔌 PHẦN 1: KẾT NỐI CAMERA

### **1.1. Các Loại Camera**

Hệ thống hỗ trợ 3 loại camera:

1. **Camera USB (Local)**

   - Kết nối trực tiếp qua USB
   - Source: Số nguyên (ví dụ: `0`, `1`, `2`)
   - Sử dụng OpenCV `cv2.VideoCapture(index)`

2. **Camera IP**

   - Kết nối qua mạng
   - Source: URL (ví dụ: `http://192.168.1.100:8080/video`)
   - Sử dụng OpenCV `cv2.VideoCapture(url)`

3. **Camera USB qua Iruincam/Droidcam/Ivcam**
   - Biến điện thoại/tablet thành camera IP
   - Source: URL từ phần mềm (ví dụ: `http://192.168.100.161:4747/video`)
   - Sử dụng OpenCV `cv2.VideoCapture(url)`

### **1.2. Cấu Hình Camera**

Camera được cấu hình qua Environment Variables:

```env
# Camera Entry (Cổng vào)
CAM_ENTRY_SOURCE=2                    # USB index hoặc URL
CAM_ENTRY_WIDTH=640
CAM_ENTRY_HEIGHT=480

# Camera Exit (Cổng ra)
CAM_EXIT_SOURCE=0                     # USB index hoặc URL
CAM_EXIT_WIDTH=640
CAM_EXIT_HEIGHT=480

# Camera Parking (Bãi đỗ)
CAM_PARKING_SOURCE=http://192.168.100.161:4747/video  # URL từ Iruincam
CAM_PARKING_WIDTH=960
CAM_PARKING_HEIGHT=720
```

### **1.3. Khởi Tạo Camera Manager**

**File:** `ai_server/camera_manager.py`

**Class:** `MultiCameraManager`

**Quy trình:**

1. **Đọc cấu hình từ Environment Variables**

   ```python
   entry_source = parse_source(os.getenv("CAM_ENTRY_SOURCE", "2"))
   exit_source = parse_source(os.getenv("CAM_EXIT_SOURCE", "0"))
   parking_source = parse_source(os.getenv("CAM_PARKING_SOURCE", "http://..."))
   ```

2. **Tạo CameraStream cho mỗi camera**

   ```python
   self.cameras = {
       "entry": CameraStream("entry", entry_source, width=640, height=480),
       "exit": CameraStream("exit", exit_source, width=640, height=480),
       "parking": CameraStream("parking", parking_source, width=960, height=720),
   }
   ```

3. **Khởi động tất cả camera**
   ```python
   camera_manager.start_all()
   ```

---

## 📹 PHẦN 2: LẤY FRAME TỪ CAMERA

### **2.1. CameraStream Class**

**File:** `ai_server/camera_manager.py`

**Chức năng:** Quản lý kết nối và đọc frame từ một camera

### **2.2. Quy Trình Đọc Frame**

#### **Bước 1: Khởi Tạo Capture**

```python
def _init_capture(self) -> bool:
    self.capture = cv2.VideoCapture(self.source)
    if isinstance(self.source, int):
        # Camera USB: Set resolution
        self.capture.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self.capture.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
    return True
```

**Giải thích:**

- Nếu `source` là số nguyên → Camera USB → Set resolution
- Nếu `source` là URL → Camera IP → Giữ nguyên resolution từ stream

#### **Bước 2: Vòng Lặp Đọc Frame (Thread)**

```python
def _read_loop(self):
    while self.running:
        # 1. Kiểm tra kết nối
        if self.capture is None or not self.capture.isOpened():
            if not self._init_capture():
                time.sleep(5)
                continue

        # 2. Đọc frame
        ret, frame = self.capture.read()
        if not ret:
            self.last_error = "Failed to read frame"
            self._release()
            time.sleep(1)
            continue

        # 3. Xử lý frame (nếu là camera IP)
        if not isinstance(self.source, int):
            # Resize nếu cần
            if current_w != self.width or current_h != self.height:
                frame = cv2.resize(frame, (self.width, self.height))

        # 4. Lưu frame mới nhất (thread-safe)
        with self.lock:
            self.latest_frame = frame
            self.last_update = time.time()

        time.sleep(0.01)  # ~100 FPS
```

**Đặc điểm:**

- ✅ Chạy trong thread riêng (daemon thread)
- ✅ Thread-safe: Sử dụng `lock` để bảo vệ `latest_frame`
- ✅ Tự động reconnect nếu mất kết nối
- ✅ Lưu frame mới nhất, không lưu queue

#### **Bước 3: Lấy Frame (Thread-Safe)**

```python
def get_frame(self):
    with self.lock:
        return None if self.latest_frame is None else self.latest_frame.copy()
```

**Giải thích:**

- Copy frame để tránh race condition
- Thread-safe với lock

---

## 🎯 PHẦN 3: MOTION DETECTION

### **3.1. MotionDetector Class**

**File:** `ai_server/motion_detector.py`

**Chức năng:** Phát hiện chuyển động trong frame và trigger plate detection

### **3.2. Khởi Tạo Motion Detector**

**File:** `ai_server/app.py`

```python
motion_detector = MotionDetector(
    camera_manager=camera_manager,
    plate_detector=plate_detector,
    webhook_url=BACKEND_WEBHOOK_URL,
    motion_threshold_percent=0.05,  # 5% pixels thay đổi
    ocr_delay=1.0,                   # Delay 1s sau motion để xe ổn định
    stable_delay=0.3,                # Delay 0.3s sau motion mới chạy OCR
    check_interval=0.5,              # Check mỗi 0.5s (2 FPS)
    on_plate_detected=detect_slots_once,  # Callback sau khi detect
    can_process_camera=can_process_camera,  # Check flag
)
motion_detector.start(camera_id)  # Start cho camera "entry" hoặc "exit"
```

### **3.3. Quy Trình Motion Detection**

#### **Bước 1: Vòng Lặp Detection (Thread)**

```python
def detection_loop(self, camera_id: str):
    while self.running:
        # 1. Lấy frame từ camera
        frame = camera.get_frame()
        if frame is None:
            time.sleep(self.check_interval)
            continue

        # 2. Kiểm tra flag (có cho phép detect không)
        if not self.can_process_camera(camera_id):
            time.sleep(self.check_interval)
            continue

        # 3. Detect motion
        if self.detect_motion(frame):
            self.motion_detected = True
            self.motion_last_time = now

        # 4. Kiểm tra có nên chạy OCR không
        if self.should_run_ocr(now):
            self.run_ocr(frame, camera_id)

        time.sleep(self.check_interval)  # 0.5s
```

**Tần suất:** Check mỗi 0.5 giây (2 FPS) để tiết kiệm CPU

#### **Bước 2: Phát Hiện Motion**

```python
def detect_motion(self, frame) -> bool:
    # 1. Chuyển sang grayscale và làm mờ
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)

    # 2. Lần đầu: Lưu frame làm reference
    if self.prev_gray is None:
        self.prev_gray = gray
        return False

    # 3. Tính sự khác biệt giữa frame hiện tại và frame trước
    diff = cv2.absdiff(self.prev_gray, gray)

    # 4. Threshold: Chuyển sang nhị phân
    _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)

    # 5. Đếm số pixel thay đổi
    motion_value = cv2.countNonZero(thresh)

    # 6. Cập nhật frame trước
    self.prev_gray = gray

    # 7. Tính threshold động (5% tổng pixels)
    height, width = gray.shape
    total_pixels = height * width
    threshold = int(total_pixels * self.motion_threshold_percent)  # 5%

    # 8. So sánh
    return motion_value > threshold
```

**Giải thích:**

- **Gaussian Blur:** Làm mờ để giảm noise
- **absdiff:** Tính sự khác biệt tuyệt đối giữa 2 frame
- **Threshold:** Chuyển sang nhị phân (pixel thay đổi = 255, không đổi = 0)
- **countNonZero:** Đếm số pixel thay đổi
- **Threshold động:** 5% tổng pixels (ví dụ: 640x480 = 307,200 pixels → threshold = 15,360 pixels)

**Ví dụ:**

- Frame 640x480: Threshold = 307,200 \* 0.05 = 15,360 pixels
- Nếu có > 15,360 pixels thay đổi → Có motion

#### **Bước 3: Kiểm Tra Có Nên Chạy OCR**

```python
def should_run_ocr(self, now: float) -> bool:
    # 1. Phải có motion
    if not self.motion_detected:
        return False

    # 2. Phải đợi stable_delay (0.3s) sau motion để xe ổn định
    time_since_motion = now - self.motion_last_time
    if time_since_motion < self.stable_delay:  # 0.3s
        return False

    # 3. Phải đợi ocr_delay (1.0s) sau lần OCR trước để tránh spam
    time_since_last_ocr = now - self.last_ocr_time
    if time_since_last_ocr < self.ocr_delay:  # 1.0s
        return False

    return True
```

**Logic:**

- ✅ Phải có motion
- ✅ Đợi 0.3s sau motion (xe ổn định)
- ✅ Đợi 1.0s sau lần OCR trước (tránh spam)

---

## 🔍 PHẦN 4: PLATE DETECTION (OCR)

### **4.1. Quy Trình Nhận Diện Biển Số**

#### **Bước 1: Chạy OCR**

```python
def run_ocr(self, frame, camera_id: str):
    now = time.time()
    self.last_ocr_time = now  # Cập nhật thời gian OCR

    # 1. Resize frame về kích thước phù hợp
    frame_to_process = cv2.resize(frame, (960, 540))

    # 2. Gọi plate detector
    detection_result = self.plate_detector.detect_from_array(frame_to_process)

    # 3. Reset motion flag
    self.motion_detected = False

    # 4. Kiểm tra kết quả
    if not detection_result:
        print("No plate detected")
        return

    plate_number = detection_result.get("plateNumber")
    if not plate_number:
        print("No plate detected")
        return

    # 5. Log kết quả
    confidence = detection_result.get("confidence", 0)
    print(f"Plate detected: {plate_number} (confidence: {confidence:.2f})")

    # 6. Gửi webhook về Backend
    self.send_webhook(camera_id, detection_result)

    # 7. Callback: Detect slots (nếu có)
    self.on_plate_detected("parking")
```

**Chi tiết Plate Detection:**

- Xem tài liệu `PLATE_DETECTION_FLOW.md` để biết chi tiết quy trình nhận diện

#### **Bước 2: Gửi Webhook Về Backend**

```python
def send_webhook(self, camera_id: str, detection_result: dict):
    payload = {
        "cameraId": camera_id,                    # "entry" hoặc "exit"
        "plateNumber": detection_result.get("plateNumber"),
        "confidence": detection_result.get("confidence"),
        "boundingBox": detection_result.get("boundingBox"),
        "plateImageBase64": detection_result.get("plate_img_base64"),
        "debugImageBase64": detection_result.get("debug_img_base64"),
        "timestamp": datetime.now().isoformat()
    }

    response = requests.post(
        self.webhook_url,  # http://localhost:5000/api/v1/ai/webhook/plate-detected
        json=payload,
        timeout=5
    )
```

**Webhook URL:** `http://localhost:5000/api/v1/ai/webhook/plate-detected`

---

## 🔄 PHẦN 5: LUỒNG XỬ LÝ HOÀN CHỈNH

### **5.1. Luồng Xe Vào (Entry)**

```
1. Camera Entry đọc frame liên tục (100 FPS)
   ↓
2. Motion Detector check frame mỗi 0.5s
   ↓
3. Detect Motion:
   - So sánh frame hiện tại với frame trước
   - Nếu > 5% pixels thay đổi → Có motion
   ↓
4. Kiểm tra điều kiện:
   - Có motion? ✅
   - Đã đợi 0.3s sau motion? ✅
   - Đã đợi 1.0s sau lần OCR trước? ✅
   ↓
5. Chạy Plate Detection:
   - WPOD-NET: Phát hiện và cắt biển số
   - OCR: Nhận diện từng ký tự
   - Normalize: Chuẩn hóa biển số
   ↓
6. Gửi Webhook về Backend:
   POST /api/v1/ai/webhook/plate-detected
   {
     "cameraId": "entry",
     "plateNumber": "30A12345",
     "confidence": 0.95,
     ...
   }
   ↓
7. Backend xử lý:
   - Tạo ParkingRecord với status "pending"
   - Lưu vào database
   - Trả về cho Frontend
   ↓
8. Callback: Detect slots (parking camera)
   - Cập nhật trạng thái ô đỗ
   - Gửi webhook về Backend
```

### **5.2. Luồng Xe Ra (Exit)**

```
1. Camera Exit đọc frame liên tục (100 FPS)
   ↓
2. Motion Detector check frame mỗi 0.5s
   ↓
3. Detect Motion (tương tự Entry)
   ↓
4. Chạy Plate Detection
   ↓
5. Gửi Webhook về Backend
   {
     "cameraId": "exit",
     "plateNumber": "30A12345",
     ...
   }
   ↓
6. Backend xử lý:
   - Tìm ParkingRecord đang pending với biển số này
   - Tính phí (kiểm tra vé tháng)
   - Cập nhật exitTime và fee
   - Lưu vào database
```

### **5.3. Điều Khiển Thông Minh (Smart Control)**

**File:** `ai_server/app.py`

```python
# Flags để điều khiển detection
DETECTION_FLAGS = {
    "entry": True,   # Cho phép detect ở camera entry
    "exit": True,    # Cho phép detect ở camera exit
}

# Cập nhật flags dựa trên trạng thái bãi đỗ
def detect_slots_once(camera_id: str):
    # ... detect slots ...

    free_slots = detection_result.get("freeSlots")
    occupied_slots = detection_result.get("occupiedSlots")

    # Nếu hết chỗ → Tắt detect ở entry
    if free_slots is not None:
        DETECTION_FLAGS["entry"] = free_slots > 0

    # Nếu không có xe → Tắt detect ở exit
    if occupied_slots is not None:
        DETECTION_FLAGS["exit"] = occupied_slots > 0
```

**Logic:**

- ✅ **Hết chỗ (freeSlots = 0):** Tắt detection ở camera Entry
- ✅ **Không có xe (occupiedSlots = 0):** Tắt detection ở camera Exit
- ✅ **Tiết kiệm tài nguyên:** Không chạy OCR khi không cần

---

## 📊 PHẦN 6: TIMELINE CHI TIẾT

### **6.1. Timeline Xe Vào**

| Thời gian | Sự kiện         | Mô tả                                              |
| --------- | --------------- | -------------------------------------------------- |
| T=0.0s    | Xe xuất hiện    | Xe vào vùng camera Entry                           |
| T=0.0s    | Motion detected | Motion Detector phát hiện > 5% pixels thay đổi     |
| T=0.3s    | Stable delay    | Đợi xe ổn định (stable_delay)                      |
| T=0.3s    | Should run OCR  | Kiểm tra điều kiện: ✅ Motion, ✅ Stable, ✅ Delay |
| T=0.3s    | Run OCR         | Bắt đầu nhận diện biển số                          |
| T=0.5s    | OCR complete    | Hoàn thành nhận diện (WPOD-NET + CNN)              |
| T=0.5s    | Send webhook    | Gửi kết quả về Backend                             |
| T=0.6s    | Backend process | Backend tạo ParkingRecord                          |
| T=0.6s    | Detect slots    | Callback: Cập nhật trạng thái ô đỗ                 |

### **6.2. Tham Số Thời Gian**

| Tham số                    | Giá trị | Mô tả                               |
| -------------------------- | ------- | ----------------------------------- |
| `check_interval`           | 0.5s    | Tần suất check motion (2 FPS)       |
| `stable_delay`             | 0.3s    | Đợi sau motion để xe ổn định        |
| `ocr_delay`                | 1.0s    | Delay giữa các lần OCR (tránh spam) |
| `motion_threshold_percent` | 5%      | Ngưỡng phát hiện motion             |

---

## 🔧 PHẦN 7: XỬ LÝ LỖI VÀ EDGE CASES

### **7.1. Camera Mất Kết Nối**

```python
def _read_loop(self):
    while self.running:
        if self.capture is None or not self.capture.isOpened():
            if not self._init_capture():
                time.sleep(5)  # Đợi 5s rồi thử lại
                continue
```

**Xử lý:**

- ✅ Tự động reconnect sau 5 giây
- ✅ Log lỗi để debug

### **7.2. Frame Read Failed**

```python
ret, frame = self.capture.read()
if not ret:
    self.last_error = "Failed to read frame"
    self._release()
    time.sleep(1)
    continue
```

**Xử lý:**

- ✅ Release capture
- ✅ Đợi 1 giây rồi thử lại

### **7.3. Motion Detection False Positive**

**Vấn đề:** Phát hiện motion do ánh sáng, cây cối, v.v.

**Giải pháp:**

- ✅ Threshold 5% (loại bỏ motion nhỏ)
- ✅ Stable delay 0.3s (chỉ detect khi motion ổn định)
- ✅ OCR delay 1.0s (tránh spam)

### **7.4. Webhook Failed**

```python
try:
    response = requests.post(self.webhook_url, json=payload, timeout=5)
    if response.status_code != 200:
        print(f"Webhook failed: {response.status_code}")
except Exception as e:
    print(f"Webhook error: {e}")
```

**Xử lý:**

- ✅ Timeout 5 giây
- ✅ Log lỗi, không crash
- ✅ Backend có thể retry nếu cần

---

## 📈 PHẦN 8: TỐI ƯU HIỆU NĂNG

### **8.1. Tối Ưu Đã Áp Dụng**

1. **Thread-Safe Frame Reading**

   - Mỗi camera chạy trong thread riêng
   - Lock để bảo vệ shared data

2. **Low FPS Motion Detection**

   - Check motion mỗi 0.5s (2 FPS) thay vì 30 FPS
   - Tiết kiệm CPU đáng kể

3. **Smart Control Flags**

   - Tắt detection khi không cần (hết chỗ, không có xe)
   - Giảm tải cho hệ thống

4. **OCR Delay**

   - Delay 1.0s giữa các lần OCR
   - Tránh spam khi có nhiều motion

5. **Frame Copy**
   - Copy frame khi get, không giữ reference
   - Tránh race condition

### **8.2. Tài Nguyên Sử Dụng**

- **CPU:**
  - Camera reading: ~5-10% per camera
  - Motion detection: ~2-5% per camera
  - OCR: ~20-30% khi chạy (spike)
- **Memory:**

  - Frame buffer: ~1-2 MB per camera
  - AI Models: ~500-1000 MB (loaded once)

- **Network:**
  - Camera streams: ~1-5 Mbps per camera
  - Webhooks: ~10-50 KB per detection

---

## 🎯 TÓM TẮT

### **Quy Trình Tổng Quan:**

1. **Camera Connection:** USB/IP qua OpenCV
2. **Frame Reading:** Thread riêng, đọc liên tục, lưu frame mới nhất
3. **Motion Detection:** Check mỗi 0.5s, so sánh frame, threshold 5%
4. **Plate Detection:** Trigger sau motion, delay 0.3s, OCR delay 1.0s
5. **Webhook:** Gửi kết quả về Backend
6. **Smart Control:** Tắt detection khi không cần

### **Điểm Mạnh:**

- ✅ Tự động hóa hoàn toàn
- ✅ Tối ưu hiệu năng
- ✅ Xử lý lỗi tốt
- ✅ Điều khiển thông minh

---

**Tài liệu này giải thích chi tiết quy trình kỹ thuật để trả lời câu hỏi về cách hệ thống hoạt động.**
