# Kịch Bản Demo Hệ Thống Smart Parking System

## 🎯 Mục Tiêu Demo

- Giới thiệu hệ thống quản lý bãi đỗ xe thông minh với AI
- Thể hiện tính thực tế qua phần cứng và kiến trúc
- Demo các tính năng chính: nhận diện biển số, quản lý vào/ra, vé tháng, báo cáo

---

## ⏱️ Thời Gian Demo: 15-20 phút

---

## 📋 Chuẩn Bị Trước Demo

### **1. Dữ Liệu Mẫu**
- ✅ Tạo 2-3 tài khoản user
- ✅ Đăng ký 5-7 phương tiện (một số đã duyệt, một số pending)
- ✅ Tạo 2-3 vé tháng (một số approved, một số pending)
- ✅ Có sẵn một số lịch sử gửi xe (completed và pending)

### **2. Phần Cứng**
- ✅ 3 camera đã setup và hoạt động:
  - 1 camera IP
  - 2 camera USB (qua Iruincam/Droidcam/Ivcam)
- ✅ Camera streams hiển thị trên Dashboard

### **3. Môi Trường**
- ✅ Backend và AI Server đang chạy
- ✅ Frontend đã build và sẵn sàng
- ✅ MongoDB có dữ liệu mẫu

---

## 🎬 KỊCH BẢN DEMO CHI TIẾT

### **PHẦN 1: GIỚI THIỆU HỆ THỐNG VÀ PHẦN CỨNG (3 phút)**

#### **1.1. Giới thiệu tổng quan**
> "Hôm nay tôi sẽ demo hệ thống Smart Parking System - hệ thống quản lý bãi đỗ xe thông minh sử dụng AI để nhận diện biển số xe tự động."

**Highlight:**
- ✅ Hệ thống tự động hóa quy trình vào/ra
- ✅ AI nhận diện biển số chính xác
- ✅ Quản lý vé tháng, lịch sử, báo cáo
- ✅ Phân quyền Admin/User

---

#### **1.2. Setup Camera (Phần Cứng)**
> "Hệ thống sử dụng 3 camera để giám sát bãi đỗ xe:"

**Giải thích:**

1. **Camera Entry (Cổng vào):**
   - **Loại:** Camera IP hoặc USB
   - **Vị trí:** Cổng vào bãi đỗ
   - **Chức năng:** Nhận diện biển số khi xe vào
   - **Show:** Camera stream trên Dashboard (nếu có)

2. **Camera Exit (Cổng ra):**
   - **Loại:** Camera USB (qua Iruincam/Droidcam/Ivcam)
   - **Vị trí:** Cổng ra bãi đỗ
   - **Chức năng:** Nhận diện biển số khi xe ra
   - **Show:** Camera stream trên Dashboard

3. **Camera Parking (Bãi đỗ):**
   - **Loại:** Camera USB (qua Iruincam/Droidcam/Ivcam)
   - **Vị trí:** Trên cao, bao quát toàn bộ bãi đỗ
   - **Chức năng:** Nhận diện trạng thái ô đỗ (trống/đã đỗ)
   - **Show:** Camera stream trên Dashboard

**Highlight:**
- ✅ "Sử dụng camera USB qua phần mềm Iruincam/Droidcam/Ivcam để biến điện thoại/tablet thành camera IP"
- ✅ "Giải pháp tiết kiệm chi phí, không cần mua camera IP chuyên dụng"
- ✅ "Tất cả camera streams được tích hợp vào hệ thống qua API"

**Show (nếu có):**
- Dashboard với 3 camera streams đang hoạt động
- Giải thích cách kết nối camera USB qua Iruincam/Droidcam/Ivcam

---

### **PHẦN 2: KIẾN TRÚC HỆ THỐNG (2 phút)**

#### **2.1. Kiến trúc Microservices**
> "Hệ thống được xây dựng theo mô hình Microservices, chia thành 3 thành phần chính:"

**Giải thích từng phần:**

1. **Frontend (React + TypeScript):**
   - **Công nghệ:** React, TypeScript, Tailwind CSS, Vite
   - **Chức năng:** Giao diện người dùng
   - **Port:** 5173 (dev) hoặc 80 (production)
   - **Show:** Mở trình duyệt, show giao diện

2. **Backend API (Node.js + Express):**
   - **Công nghệ:** Node.js, Express, MongoDB, JWT
   - **Chức năng:** 
     - Xử lý business logic
     - Quản lý database
     - Authentication & Authorization
     - Proxy camera streams
   - **Port:** 5000
   - **Show:** Có thể show code hoặc giải thích

3. **AI Server (Python + Flask):**
   - **Công nghệ:** Python, Flask, TensorFlow, OpenCV, YOLO
   - **Chức năng:**
     - Nhận diện biển số (WPOD-NET + CNN)
     - Nhận diện trạng thái ô đỗ (YOLO)
     - Quản lý camera streams
     - Real-time detection với SSE
   - **Port:** 5001
   - **Show:** Có thể show code hoặc giải thích

**Sơ đồ luồng:**
```
Camera Streams
    ↓
[AI Server] → Nhận diện biển số/ô đỗ
    ↓
[Backend API] → Xử lý logic, lưu database
    ↓
[Frontend] → Hiển thị cho người dùng
```

**Highlight:**
- ✅ "Kiến trúc Microservices cho phép scale từng service độc lập"
- ✅ "Mỗi service có thể deploy riêng, dễ bảo trì"
- ✅ "Giao tiếp qua REST API và Server-Sent Events (SSE) cho real-time"

---

#### **2.2. Cơ sở dữ liệu**
> "Dữ liệu được lưu trữ trên MongoDB Atlas (cloud) hoặc MongoDB local:"

**Các collection chính:**
- **Users:** Tài khoản (admin/user)
- **Vehicles:** Phương tiện
- **MonthlyPasses:** Vé tháng
- **ParkingRecords:** Lịch sử gửi xe
- **ParkingSlots:** Ô đỗ

**Highlight:**
- ✅ "NoSQL database linh hoạt, dễ mở rộng"
- ✅ "Cloud database đảm bảo tính sẵn sàng cao"

---

### **PHẦN 3: DEMO TÍNH NĂNG USER (4 phút)**

#### **3.1. Đăng ký/Đăng nhập**
> "Bắt đầu với tính năng đăng ký và đăng nhập cho người dùng."

**Thao tác:**
1. Mở trang đăng ký
2. Tạo tài khoản mới (hoặc đăng nhập với user có sẵn)
3. **Highlight:** "Người dùng chỉ có thể đăng ký với role 'user', không thể tự tạo admin."

**Kết quả:** Đăng nhập thành công, chuyển đến Dashboard

---

#### **3.2. Xem trạng thái bãi đỗ**
> "Người dùng có thể xem trạng thái bãi đỗ xe real-time."

**Thao tác:**
1. Vào trang "Trạng thái bãi đỗ"
2. **Show:** 
   - Tổng số ô đỗ
   - Số ô trống/đã đỗ
   - Danh sách từng ô đỗ theo cluster
3. **Highlight:** "Dữ liệu được cập nhật real-time từ AI Server thông qua camera Parking."

---

#### **3.3. Đăng ký phương tiện**
> "Người dùng cần đăng ký phương tiện trước khi sử dụng dịch vụ."

**Thao tác:**
1. Vào "Phương tiện của tôi"
2. Click "Đăng ký phương tiện"
3. Nhập thông tin:
   - Biển số: `30A12345`
   - Loại xe: `Ô tô`
   - Màu sắc: `Trắng`
4. Submit
5. **Show:** Trạng thái "Đang chờ duyệt"
6. **Highlight:** "Phương tiện cần được admin duyệt trước khi sử dụng."

---

#### **3.4. Đề xuất vé tháng**
> "Người dùng có thể đề xuất mua vé tháng để được miễn phí gửi xe."

**Thao tác:**
1. Vào "Vé tháng của tôi"
2. Click "Đề xuất mua vé"
3. Chọn phương tiện (chỉ hiện phương tiện đã được duyệt)
4. Chọn tháng bắt đầu
5. Submit
6. **Show:** Trạng thái "Đang chờ duyệt"
7. **Highlight:** "Vé tháng cần được admin duyệt và thanh toán."

---

#### **3.5. Xem lịch sử cá nhân**
> "Người dùng chỉ xem được lịch sử gửi xe của chính mình."

**Thao tác:**
1. Vào "Lịch sử"
2. **Show:**
   - Lọc theo biển số
   - Lọc theo ngày
   - Lọc theo trạng thái (hoàn thành/đang gửi)
3. **Highlight:** 
   - "Chỉ hiển thị lịch sử của phương tiện thuộc về user này"
   - "Không thể xem lịch sử của user khác"

---

### **PHẦN 4: DEMO TÍNH NĂNG ADMIN (7 phút)**

#### **4.1. Đăng nhập Admin**
> "Bây giờ tôi sẽ chuyển sang tài khoản admin để quản lý hệ thống."

**Thao tác:**
1. Đăng xuất
2. Đăng nhập với tài khoản admin
3. **Show:** Dashboard với nhiều thông tin hơn

---

#### **4.2. Dashboard - Giám sát real-time**
> "Dashboard của admin hiển thị thông tin tổng quan và camera streams real-time."

**Thao tác:**
1. **Show Dashboard:**
   - Thống kê: Tổng xe, đang gửi, doanh thu
   - **Camera streams:** Entry, Exit, Parking
   - **Highlight:** 
     - "3 camera streams được hiển thị real-time"
     - "Camera streams được proxy từ AI Server qua Backend"
     - "Có authentication để bảo mật"

2. **Show AI Detection:**
   - "AI đang nhận diện biển số real-time từ camera Entry/Exit"
   - "AI nhận diện trạng thái ô đỗ từ camera Parking"
   - **Highlight:** "Sử dụng WPOD-NET và CNN để nhận diện chính xác"

---

#### **4.3. Quản lý phương tiện**
> "Admin có thể quản lý tất cả phương tiện trong hệ thống."

**Thao tác:**
1. Vào "Phương tiện"
2. **Show:**
   - Danh sách tất cả phương tiện
   - Lọc theo trạng thái (Tất cả/Đang chờ/Đã duyệt/Từ chối)
3. **Duyệt phương tiện:**
   - Chọn phương tiện "Đang chờ" (từ user vừa đăng ký)
   - Click "Duyệt"
   - **Highlight:** "Sau khi duyệt, user có thể sử dụng phương tiện này"
4. **Thêm phương tiện thủ công:**
   - Click "Thêm phương tiện"
   - **Show:** Form có tìm kiếm chủ xe
   - **Highlight:** "Admin có thể gán phương tiện cho user bất kỳ"
   - Nhập thông tin và submit

---

#### **4.4. Quản lý vé tháng**
> "Admin quản lý vé tháng: duyệt, từ chối, gia hạn."

**Thao tác:**
1. Vào "Vé tháng"
2. **Show:**
   - Danh sách tất cả vé tháng
   - Lọc theo trạng thái
3. **Duyệt vé tháng:**
   - Chọn vé "Đang chờ" (từ user vừa đề xuất)
   - Click "Duyệt"
   - **Highlight:** "Sau khi duyệt, user được miễn phí gửi xe trong tháng"
4. **Gia hạn vé tháng:**
   - Chọn vé đã duyệt
   - Click "Gia hạn"
   - Nhập số tháng gia hạn
   - **Show:** Ngày kết thúc mới

---

#### **4.5. Kiểm soát xe vào/ra**
> "Tính năng quan trọng nhất: kiểm soát xe vào và ra bãi đỗ."

**Thao tác:**
1. Vào "Dashboard" hoặc "Bãi đỗ"
2. **Xe vào:**
   - **Option 1 (Tự động):** 
     - "AI tự động nhận diện biển số từ camera Entry"
     - **Show:** Camera Entry stream
     - **Highlight:** "Hệ thống tự động tạo bản ghi khi nhận diện được biển số"
   - **Option 2 (Thủ công):**
     - Click "Nhập thủ công"
     - Nhập biển số: `30A12345` (phương tiện vừa duyệt)
     - Chọn ô đỗ
     - **Show:** Bản ghi được tạo, trạng thái "Đang gửi"
3. **Xe ra:**
   - Chọn bản ghi "Đang gửi"
   - Click "Xác nhận ra"
   - **Show:**
     - Thời gian gửi
     - Phí (nếu có vé tháng → 0đ, nếu không → tính theo giờ)
     - **Highlight:** "Hệ thống tự động tính phí dựa trên thời gian và vé tháng"
4. **Highlight:** "Nếu xe có vé tháng còn hiệu lực, phí = 0đ"

---

#### **4.6. Lịch sử và báo cáo**
> "Admin có thể xem toàn bộ lịch sử và xuất báo cáo."

**Thao tác:**
1. **Lịch sử:**
   - Vào "Lịch sử"
   - **Show:**
     - Lọc theo biển số, ngày, trạng thái
     - Xem tất cả bản ghi (không chỉ của user)
     - Có thể xóa bản ghi đã hoàn thành
   - **Highlight:** "Admin xem được tất cả lịch sử, user chỉ xem của mình"

2. **Báo cáo:**
   - Vào "Báo cáo"
   - Chọn khoảng thời gian
   - **Show:**
     - Thống kê: Tổng xe, doanh thu, trung bình
     - Xuất Excel
   - **Highlight:** "Có thể xuất báo cáo Excel để phân tích"

---

### **PHẦN 5: DEMO AI NHẬN DIỆN (2 phút)**

#### **5.1. Giải thích quy trình AI**
> "Bây giờ tôi sẽ giải thích cách AI nhận diện biển số."

**Show/Explain:**
1. **WPOD-NET:**
   - "Phát hiện và cắt ảnh biển số từ ảnh xe"
   - "Có thể nhận diện ở nhiều góc độ"
   - **Show:** Ảnh demo hoặc camera stream

2. **Preprocessing:**
   - "Tiền xử lý: Grayscale → CLAHE → Blur → Threshold"
   - "Xử lý viền, tìm connected components"

3. **OCR:**
   - "CNN nhận diện từng ký tự"
   - "Chuẩn hóa theo format Việt Nam (XXYXXXX)"
   - "Sửa lỗi OCR phổ biến (D↔0, B↔8)"

4. **Kết quả:**
   - **Show:** Ảnh debug với bounding boxes (nếu có)
   - **Highlight:** "Độ chính xác cao, xử lý được nhiều điều kiện ánh sáng"

---

### **PHẦN 6: TỔNG KẾT (2 phút)**

#### **6.1. Tóm tắt hệ thống**
> "Tóm lại, hệ thống bao gồm:"

**List:**
- ✅ **Phần cứng:** 3 camera (1 IP + 2 USB qua Iruincam/Droidcam/Ivcam)
- ✅ **Kiến trúc:** 3 services (Frontend, Backend, AI Server)
- ✅ **Tính năng:** Nhận diện biển số tự động, quản lý vào/ra, vé tháng, báo cáo
- ✅ **Phân quyền:** Admin/User với quyền hạn rõ ràng

#### **6.2. Điểm mạnh**
- **Tự động hóa:** Giảm thiểu can thiệp thủ công
- **Chính xác:** AI nhận diện với độ chính xác cao
- **Tiết kiệm:** Sử dụng camera USB qua phần mềm, không cần camera IP đắt tiền
- **Bảo mật:** Phân quyền rõ ràng, user chỉ xem dữ liệu của mình
- **Scalable:** Kiến trúc Microservices dễ mở rộng
- **Real-time:** Camera streams và detection real-time

#### **6.3. Hướng phát triển**
- Hỗ trợ biển số xanh
- Cải thiện độ chính xác OCR
- Thêm tính năng thanh toán online
- Mobile app
- Tích hợp với hệ thống khác

---

## 🎯 CÁC ĐIỂM CẦN HIGHLIGHT

### **1. Phần Cứng Thực Tế**
- ✅ Setup camera đơn giản với Iruincam/Droidcam/Ivcam
- ✅ Tiết kiệm chi phí (không cần camera IP đắt tiền)
- ✅ 3 camera phục vụ 3 mục đích khác nhau

### **2. Kiến Trúc Hiện Đại**
- ✅ Microservices architecture
- ✅ Mỗi service có trách nhiệm rõ ràng
- ✅ Dễ scale và bảo trì

### **3. Tính Tự Động**
- ✅ AI nhận diện biển số tự động
- ✅ Tự động tính phí dựa trên thời gian
- ✅ Tự động kiểm tra vé tháng

### **4. Tính Bảo Mật**
- ✅ Phân quyền Admin/User
- ✅ User chỉ xem dữ liệu của mình
- ✅ JWT authentication

---

## ⚠️ LƯU Ý KHI DEMO

### **1. Chuẩn Bị Sẵn**
- ✅ Camera streams đang hoạt động
- ✅ Dữ liệu mẫu đầy đủ
- ✅ Test trước các tính năng

### **2. Tốc Độ**
- ⚡ Dành thời gian giải thích phần cứng và kiến trúc
- ⚡ Không quá nhanh khi demo tính năng
- ⚡ Cho phép hỏi đáp

### **3. Xử Lý Lỗi**
- 🔧 Nếu camera không hoạt động: "Trong production sẽ có camera chuyên dụng"
- 🔧 Nếu có lỗi: "Đây là môi trường demo, trong production sẽ được xử lý tốt hơn"

---

## 📝 CHECKLIST TRƯỚC DEMO

- [ ] 3 camera đã setup và hoạt động
- [ ] Camera streams hiển thị trên Dashboard
- [ ] Dữ liệu mẫu đã sẵn sàng
- [ ] Tất cả services đang chạy
- [ ] Test tất cả tính năng chính
- [ ] Chuẩn bị giải thích về Iruincam/Droidcam/Ivcam
- [ ] Backup plan cho các tình huống lỗi

---

## 🎬 KỊCH BẢN NGẮN GỌN (10 phút)

Nếu chỉ có 10 phút, tập trung vào:

1. **Giới thiệu + Camera Setup** (2 phút)
2. **Kiến trúc hệ thống** (1 phút)
3. **Demo User:** Đăng ký phương tiện, đề xuất vé tháng (2 phút)
4. **Demo Admin:** Duyệt, xe vào/ra, báo cáo (4 phút)
5. **Tổng kết** (1 phút)

---

## 💡 TIPS ĐỂ DEMO THÀNH CÔNG

1. **Bắt đầu với phần cứng:** Cho thấy tính thực tế của hệ thống
2. **Giải thích kiến trúc:** Giúp người xem hiểu cách hệ thống hoạt động
3. **Demo có logic:** Theo workflow thực tế (user đăng ký → admin duyệt → sử dụng)
4. **Highlight điểm mạnh:** Camera setup đơn giản, kiến trúc hiện đại, AI chính xác
5. **Tự tin:** Nắm rõ hệ thống, tự tin khi trình bày

---

**Chúc bạn demo thành công! 🚀**


