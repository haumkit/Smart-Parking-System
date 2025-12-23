# Quy Trình Xử Lý Nhận Diện Biển Số Xe

## 📋 Tổng Quan

Hệ thống nhận diện biển số xe sử dụng 2 mô hình AI:

1. **WPOD-NET**: Phát hiện và cắt ảnh biển số từ ảnh xe
2. **OCR Model (CNN)**: Nhận diện từng ký tự trên biển số

---

## 🔄 Luồng Xử Lý Chính

### **Đầu Vào (Input)**

- **Hàm**: `detect_from_array(opencv_image, lp_threshold=0.5)`
- **Input**:
  - `opencv_image`: Ảnh BGR (numpy array) chứa xe/biển số
  - `lp_threshold`: Ngưỡng confidence để detect biển số (mặc định 0.5)

---

## 📊 Các Bước Xử Lý Chi Tiết

### **BƯỚC 1: Phát Hiện Biển Số (License Plate Detection)**

**Hàm**: `detect_lp(self.wpod_net, im2single(opencv_image), bound_dim, lp_threshold)`

**Xử lý**:

1. **Tính toán kích thước**:

   - `Dmax = 608`, `Dmin = 288`
   - Tính tỷ lệ khung hình: `ratio = max(height, width) / min(height, width)`
   - `bound_dim = min(ratio * Dmin, Dmax)` → Kích thước tối ưu để resize

2. **Chuẩn hóa ảnh**:

   - `im2single()`: Chuyển ảnh về dạng float32, normalize về [0, 1]
   - Resize ảnh về kích thước phù hợp

3. **WPOD-NET Prediction**:
   - Model dự đoán vị trí và góc nghiêng của biển số
   - Trả về: `(labels, TLp, lp_type)`
     - `labels`: Danh sách các biển số được phát hiện
     - `TLp`: Ảnh biển số đã được cắt và warp perspective
     - `lp_type`: Loại biển số (1 = 1 dòng, 2 = 2 dòng)

**Đầu ra**: Ảnh biển số đã được cắt và làm phẳng (warped)

---

### **BƯỚC 2: Tiền Xử Lý Ảnh Biển Số (Preprocessing)**

**Hàm**: `preprocess_image(LpImg_uint8)`

**Input**:

- `LpImg_uint8`: Ảnh biển số (uint8, BGR)

**Xử lý**:

1. **Chuyển sang Grayscale**:

   ```python
   gray = cv2.cvtColor(LpImg, cv2.COLOR_BGR2GRAY)
   ```

2. **Tăng cường Contrast (CLAHE)**:

   ```python
   clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
   enhanced_gray = clahe.apply(gray)
   ```

   - Adaptive histogram equalization để làm rõ chữ

3. **Làm mờ (Gaussian Blur)**:

   ```python
   blurred = cv2.GaussianBlur(enhanced_gray, (5, 5), 0)
   ```

   - Loại bỏ noise nhỏ

4. **Adaptive Threshold**:
   ```python
   thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                   cv2.THRESH_BINARY_INV, 45, 15)
   ```
   - Chuyển sang ảnh nhị phân (đen trắng)
   - `THRESH_BINARY_INV`: Chữ đen trên nền trắng → Chữ trắng trên nền đen

**Đầu ra**:

- `thresh`: Ảnh nhị phân (chữ trắng, nền đen)
- `enhanced_gray`: Ảnh grayscale đã tăng cường

---

### **BƯỚC 3: Xử Lý Viền (Border Cleaning)**

**Hàm**: `clear_border(thresh, thickness=4)`

**Input**:

- `thresh`: Ảnh nhị phân
- `thickness`: Độ dày viền cần xóa (mặc định 4 pixels)

**Xử lý**:

- Xóa các pixel ở 4 viền (trên, dưới, trái, phải)
- Loại bỏ noise và các thành phần dính viền

**Đầu ra**: Ảnh nhị phân đã xóa viền

---

### **BƯỚC 4: Phân Tích Connected Components**

**Hàm**: `connected_components_analysis(thresh, LpImg)`

**Input**:

- `thresh`: Ảnh nhị phân
- `LpImg`: Ảnh gốc (để tính kích thước)

**Xử lý**:

1. **Tìm các thành phần liên thông**:

   ```python
   _, labels = cv2.connectedComponents(thresh)
   ```

   - Mỗi ký tự là một thành phần liên thông

2. **Lọc theo kích thước**:
   - `lower = total_pixels // 120` (tối thiểu)
   - `upper = total_pixels // 15` (tối đa)
   - Chỉ giữ lại các thành phần có kích thước hợp lý (ký tự)

**Đầu ra**: `mask` - Ảnh nhị phân chỉ chứa các ký tự hợp lệ

---

### **BƯỚC 5: Tìm và Sắp Xếp Contours**

**Hàm**: `find_and_sort_contours(mask, LpImg)`

**Input**:

- `mask`: Ảnh nhị phân chứa các ký tự
- `LpImg`: Ảnh gốc

**Xử lý**:

1. **Tìm contours**:

   ```python
   cnts, _ = cv2.findContours(mask.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
   boundingBoxes = [cv2.boundingRect(c) for c in cnts]
   ```

2. **Lọc các bounding box dính viền**:

   - Loại bỏ các box gần viền ảnh (< 5% từ biên)

3. **Tính toán thống kê**:

   - `median_height`: Chiều cao trung bình của ký tự
   - `median_area`: Diện tích trung bình

4. **Lọc theo tiêu chí**:

   - **Chiều cao**: `0.7 * median_height <= h <= 1.3 * median_height`
   - **Tỷ lệ khung hình**: `0.2 <= w/h <= 1.0`
   - **Chiều rộng**: `w <= 1.1 * median_height`
   - **Vị trí**: Không quá gần biên trái/phải (< 5%)
   - **Diện tích**: `0.5 * median_area <= area <= 1.5 * median_area`

5. **Sắp xếp**:
   - Ưu tiên theo tọa độ Y (hàng)
   - Nếu cùng hàng → sắp xếp theo X (từ trái sang phải)

**Đầu ra**: `boundingBoxes` - Danh sách các bounding box của ký tự, đã được sắp xếp

---

### **BƯỚC 6: Nhận Diện Từng Ký Tự (OCR)**

**Vòng lặp**: `for i, (x, y, w, h) in enumerate(boundingBoxes)`

**Xử lý cho mỗi ký tự**:

1. **Cắt ảnh ký tự**:

   ```python
   char_img = LpImg_uint8[y:y+h, x:x+w]
   ```

2. **Tiền xử lý ký tự**:
   **Hàm**: `preprocess_license_plate(char_img)`

   - Chuyển sang grayscale
   - CLAHE (clipLimit=2.0)
   - Gaussian Blur
   - Adaptive Threshold → Ảnh nhị phân 28x28

3. **Chuẩn hóa**:

   ```python
   char_img_normalized = char_img_resized.astype('float32') / 255.0
   char_img_input = char_img_normalized.reshape(1, 28, 28, 1)
   ```

   - Resize về 28x28 (kích thước input của OCR model)
   - Normalize về [0, 1]

4. **OCR Model Prediction**:

   ```python
   char_pred = self.ocr_model.predict(char_img_input, verbose=0)
   char_label = np.argmax(char_pred[0])
   confidence = np.max(char_pred[0])
   ```

   - Model dự đoán lớp ký tự (0-9, A-Z)
   - Lấy lớp có confidence cao nhất

5. **Lưu kết quả**:
   ```python
   predictions.append(self.classes[char_label])
   confidences.append(confidence)
   ```

**Đầu ra**:

- `predictions`: Danh sách ký tự đã nhận diện
- `confidences`: Danh sách confidence tương ứng

---

### **BƯỚC 7: Chuẩn Hóa Biển Số (Normalization)**

**Hàm**: `normalize_plate(plate_text)`

**Input**:

- `plate_text`: Chuỗi ký tự đã nhận diện (ví dụ: "29D1234")

**Xử lý**:

1. **Chuyển sang chữ hoa**: `plate_text.upper()`

2. **Xác định vị trí số và chữ**:

   - Format: `XXYXXXX` (7 ký tự) hoặc `XXYXXXXX` (8 ký tự)
   - Vị trí số (X): `[0, 1]` và `[3:7]` hoặc `[3:8]`
   - Vị trí chữ (Y): `[2]`

3. **Ép cứng lỗi OCR**:
   - **Vị trí chữ (Y)**:
     - `'0'` → `'D'`
     - `'8'` → `'B'`
   - **Vị trí số (X)**:
     - `'D'` → `'0'`
     - `'B'` → `'8'`

**Ví dụ**:

- Input: `"29DD234"` → Output: `"29D0234"` (D ở vị trí số → 0)
- Input: `"2901234"` → Output: `"29D1234"` (0 ở vị trí chữ → D)

**Đầu ra**: Biển số đã được chuẩn hóa

---

### **BƯỚC 8: Tính Toán Confidence**

```python
avg_confidence = np.mean(confidences) if confidences else 0.5
```

- Tính confidence trung bình của tất cả ký tự
- Nếu không có ký tự nào → mặc định 0.5

---

## 📤 Đầu Ra (Output)

**Hàm trả về**: Dictionary với các trường:

```python
{
    'plateNumber': str,           # Biển số đã nhận diện và chuẩn hóa (ví dụ: "2901234")
    'confidence': float,           # Confidence trung bình (0.0 - 1.0)
    'boundingBox': None,           # Không sử dụng
    'plate_img_base64': str,       # Ảnh biển số gốc (base64)
    'debug_img_base64': str        # Ảnh debug với bounding boxes (base64)
}
```

---

## 🔍 Các Hàm Hỗ Trợ

### **1. `detect_lp(model, I, max_dim, lp_threshold)`**

- Phát hiện biển số bằng WPOD-NET
- Warp perspective để làm phẳng biển số

### **2. `reconstruct(I, Iresized, Yr, lp_threshold)`**

- Tái tạo vị trí biển số từ output của WPOD-NET
- Xác định loại biển số (1 dòng/2 dòng)

### **3. `nms(Labels, iou_threshold=0.5)`**

- Non-Maximum Suppression để loại bỏ duplicate detections

### **4. `clear_border(img_bin, thickness=4)`**

- Xóa các pixel ở viền ảnh

### **5. `is_near_border(rect, img_height, img_width, border_threshold=1)`**

- Kiểm tra bounding box có gần viền không

### **6. `normalize_plate(plate_text)`**

- Chuẩn hóa biển số theo format Việt Nam
- Sửa lỗi OCR phổ biến (D↔0, B↔8)

### **7. `encode_image_to_base64(image_array, ext=".jpg")`**

- Chuyển ảnh numpy array sang base64 string

---

## 📈 Luồng Dữ Liệu Tổng Quan

```
Ảnh Xe (BGR)
    ↓
[WPOD-NET] → Phát hiện biển số
    ↓
Ảnh Biển Số (BGR)
    ↓
[Preprocessing] → Grayscale → CLAHE → Blur → Threshold
    ↓
Ảnh Nhị Phân
    ↓
[Clear Border] → Xóa viền
    ↓
[Connected Components] → Tìm các ký tự
    ↓
[Find & Sort Contours] → Lọc và sắp xếp bounding boxes
    ↓
[OCR Loop] → Nhận diện từng ký tự
    ├─ Cắt ký tự
    ├─ Preprocess
    ├─ Resize 28x28
    └─ OCR Model → Ký tự + Confidence
    ↓
[Normalize] → Chuẩn hóa biển số
    ↓
Kết Quả: {
    plateNumber: "2901234",
    confidence: 0.95,
    ...
}
```

---

## ⚙️ Tham Số Quan Trọng

| Tham số                 | Giá trị | Mô tả                               |
| ----------------------- | ------- | ----------------------------------- |
| `lp_threshold`          | 0.5     | Ngưỡng confidence để detect biển số |
| `Dmax`                  | 608     | Kích thước tối đa để resize         |
| `Dmin`                  | 288     | Kích thước tối thiểu để resize      |
| `CLAHE clipLimit`       | 2.0     | Độ tăng cường contrast              |
| `Gaussian Blur`         | (5, 5)  | Kernel size để làm mờ               |
| `Adaptive Threshold`    | 45, 15  | Block size và C constant            |
| `Border thickness`      | 4       | Độ dày viền cần xóa                 |
| `MIN_CHAR_HEIGHT_RATIO` | 0.7     | Tỷ lệ chiều cao tối thiểu           |
| `MAX_CHAR_HEIGHT_RATIO` | 1.3     | Tỷ lệ chiều cao tối đa              |
| `OCR Input Size`        | 28x28   | Kích thước ảnh đầu vào OCR model    |

---

## 🎯 Điểm Mạnh

1. **Robust Detection**: WPOD-NET có thể detect biển số ở nhiều góc độ
2. **Adaptive Processing**: CLAHE và Adaptive Threshold xử lý tốt điều kiện ánh sáng khác nhau
3. **Smart Filtering**: Nhiều lớp lọc để loại bỏ noise và false positives
4. **Normalization**: Tự động sửa lỗi OCR phổ biến (D↔0, B↔8)
5. **Debug Support**: Trả về ảnh debug để kiểm tra

---

## ⚠️ Điểm Cần Cải Thiện

1. **Biển số xanh**: Hiện chưa có xử lý riêng cho biển số xanh (chữ trắng)
2. **Ký tự dính**: Có thể cần morphological operations để tách ký tự dính
3. **Xử lý viền**: Có thể cần tăng `border_thickness` cho một số trường hợp
4. **Confidence threshold**: Có thể cần điều chỉnh ngưỡng để loại bỏ ký tự không chắc chắn
