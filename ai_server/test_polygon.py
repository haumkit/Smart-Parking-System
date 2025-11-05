from ultralytics import YOLO
import cv2
import numpy as np
import pandas as pd

# --- Đường dẫn ---
model_path = "best.pt"  # model YOLO bạn train xong
image_path = "images/2016-01-14_0905.jpg"  # ảnh cần test
slots_csv = "slots_polygon.csv"

# --- Load model & data ---
model = YOLO(model_path)
slots = pd.read_csv(slots_csv)
img = cv2.imread(image_path)

# --- Detect ---
results = model(image_path)[0]

# Lưu danh sách các xe đã phát hiện
car_points = []

for box in results.boxes:
    cls_id = int(box.cls[0])
    if cls_id == 1:  # chỉ lấy class 1 = car
        x1, y1, x2, y2 = box.xyxy[0]
        cx, cy = int((x1 + x2) / 2), int((y1 + y2) / 2)
        car_points.append((cx, cy))

# --- Xác định slot nào có xe ---
occupied_slots = []
for _, row in slots.iterrows():
    slot_id = int(row["SlotId"])
    pts = np.array([
        [row["x1"], row["y1"]],
        [row["x2"], row["y2"]],
        [row["x3"], row["y3"]],
        [row["x4"], row["y4"]]
    ], np.int32).reshape((-1, 1, 2))

    # Kiểm tra nếu điểm tâm xe nằm trong polygon này
    for (cx, cy) in car_points:
        if cv2.pointPolygonTest(pts, (cx, cy), False) >= 0:
            occupied_slots.append(slot_id)
            break  # không cần kiểm tra thêm xe khác

# --- Tính ô trống ---
all_slots = slots["SlotId"].tolist()
free_slots = [s for s in all_slots if s not in occupied_slots]

# --- Vẽ kết quả ---
for _, row in slots.iterrows():
    slot_id = int(row["SlotId"])
    pts = np.array([
        [int(row["x1"]), int(row["y1"])],
        [int(row["x2"]), int(row["y2"])],
        [int(row["x3"]), int(row["y3"])],
        [int(row["x4"]), int(row["y4"])]
    ], np.int32).reshape((-1, 1, 2))

    # màu: đỏ = có xe, xanh = trống
    color = (0, 0, 255) if slot_id in occupied_slots else (0, 255, 0)

    cv2.polylines(img, [pts], True, color, 2)

    # viết số thứ tự ô
    M = cv2.moments(pts)
    if M["m00"] != 0:
        cx = int(M["m10"]/M["m00"])
        cy = int(M["m01"]/M["m00"])
        cv2.putText(img, str(slot_id), (cx - 10, cy + 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

# --- In kết quả ra terminal ---
print(f"🚗 Ô có xe: {occupied_slots}")
print(f"🅿️  Ô trống: {free_slots}")
print(f"✅ Tổng ô trống: {len(free_slots)} / {len(all_slots)}")

# --- Hiển thị ---
cv2.imshow("Parking Detection", img)
cv2.waitKey(0)
cv2.destroyAllWindows()
