import cv2
import os
import base64
from typing import List, Dict, Tuple
from sklearn.cluster import KMeans
import numpy as np

try:
    from ultralytics import YOLO  # type: ignore
    ULTRA_AVAILABLE = True
except Exception:
    ULTRA_AVAILABLE = False

CAMERA_SLOT_LAYOUT = "chinh"
#"chinh", "phu_ngang", "phu_doc"

def encode_image_to_base64(image_array, ext=".jpg"):
        if image_array is None:
            return None

        try:
            success, buffer = cv2.imencode(ext, image_array)
            if not success:
                return None
            return base64.b64encode(buffer.tobytes()).decode('utf-8')
        except Exception as encode_error:
            print(f"Failed to encode image to base64: {encode_error}")
            return None

def assign_slot_ids_by_clustering(boxes_xy):

    angle = CAMERA_SLOT_LAYOUT

    # 1) Tạo mảng (cx, cy)
    XY = np.array([[b["cx"], b["cy"]] for b in boxes_xy])

    # 2) KMeans chia thành 3 cụm
    kmeans = KMeans(n_clusters=3, random_state=0, n_init=10).fit(XY)
    labels = kmeans.labels_
    centroids = kmeans.cluster_centers_

    # 3) Gom box theo label
    clusters: Dict[int, list] = {}
    for idx, lab in enumerate(labels):
        clusters.setdefault(int(lab), []).append(boxes_xy[idx])

    # 4) Xác định cluster C (phải), A (trên trái), B (dưới trái)
    centroid_info = [(i, centroids[i][0], centroids[i][1]) for i in range(centroids.shape[0])]
    # sort theo x giảm dần -> cụm ngoài cùng bên phải
    if angle == "phu_doc":
        centroid_info_sorted_y = sorted(centroid_info, key=lambda t: t[2])
        label_C = int(centroid_info_sorted_y[0][0])   
        remaining = [int(t[0]) for t in centroid_info_sorted_y[1:]]
        rem_x = [(lab, centroids[lab][0]) for lab in remaining]
        rem_x_sorted = sorted(rem_x, key=lambda t: t[1])   # x tăng (trái -> phải)
        label_A = int(rem_x_sorted[0][0])
        label_B = int(rem_x_sorted[1][0])
    else:
        centroid_info_sorted_x = sorted(centroid_info, key=lambda t: t[1], reverse=True)
        label_C = int(centroid_info_sorted_x[0][0])

        remaining = [int(t[0]) for t in centroid_info_sorted_x[1:]]
        rem_y = [(lab, centroids[lab][1]) for lab in remaining]
        rem_y_sorted = sorted(rem_y, key=lambda t: t[1])  
        label_A = int(rem_y_sorted[0][0])
        label_B = int(rem_y_sorted[1][0])

    # 5) Sắp xếp từng cluster theo cx
    clusters_sorted: Dict[int, list] = {}
    for lab, items in clusters.items():
        if angle == "chinh":
            clusters_sorted[lab] = sorted(items, key=lambda b: b["cx"])
        elif angle == "phu_ngang":
            if lab == label_C:
                clusters_sorted[lab] = sorted(items, key=lambda b: b["cx"], reverse=True)
            else:
                clusters_sorted[lab] = sorted(items, key=lambda b: b["cx"])
        else:
            if lab == label_B:
                clusters_sorted[lab] = sorted(items, key=lambda b: b["cx"], reverse=True)
            else:
                clusters_sorted[lab] = sorted(items, key=lambda b: b["cx"])
    # 6) Đặt order id tương ứng với layout
    order_A = [24, 25, 26, 27, 18]   # cụm A
    order_B = [23, 22, 21, 20, 19]   # cụm B 
    order_C = [28, 29, 30, 31, 32]   # cụm C 
    mapping = {
        label_A: order_A,
        label_B: order_B,
        label_C: order_C,
    }

    # 7) Gán slot_id theo thứ tự đã sắp
    all_assigned: list = []
    for lab, items in clusters_sorted.items():
        order_ids = mapping.get(lab)
        if order_ids is None:
            order_ids = list(range(1, len(items) + 1))

        for box, slot_id in zip(items, order_ids):
            box["slot_id"] = int(slot_id)
            all_assigned.append(box)

    # 8) Sắp lại theo slot_id cho dễ đọc
    all_assigned_sorted = sorted(all_assigned, key=lambda b: b["slot_id"])
    return all_assigned_sorted

class ParkingSlotDetector:
    def __init__(
        self,
        model_path: str | None = None,
        processed_dir: str = "uploads/processed",
        car_class_id: int = 1,
        empty_class_id: int = 0,
        total_slots: int = 15,
    ):
        self.model_path = model_path
        self.processed_dir = processed_dir
        self.car_class_id = car_class_id
        self.empty_class_id = empty_class_id
        self.total_slots = total_slots

        os.makedirs(self.processed_dir, exist_ok=True)
        self.model = None

        if model_path and ULTRA_AVAILABLE:
            try:
                self.model = YOLO(model_path)
                print(f"Parking Slot Detector: YOLO model loaded from {model_path}")
            except Exception as e:
                print(f"Failed to load YOLO model '{model_path}': {e}")
        else:
            if not ULTRA_AVAILABLE:
                print("Ultralytics not available; running in stub mode")
    
    def detect_from_image_path(self, image_path: str):
        image = cv2.imread(image_path)
        return self.detect_from_array(image, image_path)

    def detect_from_array(self, opencv_image, image_path: str | None = None):

        try:
            if self.model is not None:
                results = self.model(image_path if image_path else opencv_image, verbose=False)[0]

                all_boxes: List[Tuple[int, int, int, int, float, int]] = []

                for box in results.boxes:
                    cls_id = int(box.cls[0])
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    confidence = float(box.conf[0])

                    if confidence >= 0.6 and (cls_id == self.car_class_id or cls_id == self.empty_class_id):
                        all_boxes.append((x1, y1, x2, y2, confidence, cls_id))

                occupied_boxes: List[Tuple[int, int, int, int, float]] = []
                empty_boxes: List[Tuple[int, int, int, int, float]] = []

                for (x1, y1, x2, y2, conf, cls_id) in all_boxes:
                    if cls_id == self.car_class_id:
                        occupied_boxes.append((x1, y1, x2, y2, conf))
                    elif cls_id == self.empty_class_id:
                        empty_boxes.append((x1, y1, x2, y2, conf))


                assigned_slots = None

                try:
                    yolo_results = all_boxes
                    boxes_xy = []

                    for (x1, y1, x2, y2, conf_f, cls_id) in yolo_results:
                        cx = (x1 + x2) / 2.0
                        cy = (y1 + y2) / 2.0
                        boxes_xy.append({
                            "bbox": (x1, y1, x2, y2), 
                            "cx": cx, 
                            "cy": cy, 
                            "status": cls_id, 
                            "conf": conf_f
                        })

                    if len(boxes_xy) >= 15:
                        assigned_slots = assign_slot_ids_by_clustering(boxes_xy)

                        slot_states = []
                        for b in assigned_slots:
                            sid = b.get("slot_id")
                            cls_val = b["status"]
                            state = "occupied" if cls_val == self.car_class_id else "available"
                            slot_states.append((sid, state))

                except Exception as mapping_err:
                    # Không để lỗi test ảnh hưởng pipeline chính
                    print(f"[SLOT-EXPERIMENT] mapping error: {mapping_err}")


                occ_raw = len(occupied_boxes)
                free_raw = len(empty_boxes)

                if occ_raw + free_raw > self.total_slots:
                    if free_raw > occ_raw:
                        occupied_slots = occ_raw
                        free_slots = min(free_raw, self.total_slots - occupied_slots)
                    else:
                        free_slots = free_raw
                        occupied_slots = min(occ_raw, self.total_slots - free_slots)
                else:
                    occupied_slots = occ_raw
                    free_slots = free_raw

                
                print(f"Occupied slots: {occupied_slots}, Free slots: {free_slots}, Total slots: {self.total_slots}")

                overlay = opencv_image.copy()

                # Nếu đã có mapping slot_id (assigned_slots), dùng nó để vẽ label: "S{slot_id}: conf%"
                if assigned_slots:
                    for b in assigned_slots:
                        sid = b.get("slot_id")
                        if sid is None:
                            continue
                        x1_f, y1_f, x2_f, y2_f = b["bbox"]
                        cls_val = b["status"]
                        conf_f = b.get("conf", 0.0)
                        color = (0, 200, 0) if cls_val == self.empty_class_id else (0, 0, 255)

                        x1_i, y1_i, x2_i, y2_i = map(int, (x1_f, y1_f, x2_f, y2_f))
                        cv2.rectangle(overlay, (x1_i, y1_i), (x2_i, y2_i), color, 2)
                        label = f"S{sid}: {conf_f * 100:.1f}%"
                        cv2.putText(
                            overlay,
                            label,
                            (x1_i, y1_i - 8),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.5,
                            color,
                            2,
                        )
                else:
                    # Fallback: vẽ như cũ nếu chưa có mapping slot_id
                    for (x1, y1, x2, y2, conf) in empty_boxes:
                        cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 200, 0), 3)
                        label = f"{conf * 100:.1f}%"
                        cv2.putText(overlay, label, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 500, 0), 2)

                    for (x1, y1, x2, y2, conf) in occupied_boxes:
                        cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 0, 255), 2)
                        label = f"{conf * 100:.1f}%"
                        cv2.putText(overlay, label, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

                processed_path = None
                if image_path:
                    base = os.path.splitext(os.path.basename(image_path))[0]
                    processed_filename = f"{base}_processed.jpg"
                    processed_path = os.path.join(self.processed_dir, processed_filename)
                    cv2.imwrite(processed_path, overlay)

                slot_list: List[Dict[str, object]] = []

                if assigned_slots:
                    # Dùng slot_id đã được gán bởi KMeans
                    for b in assigned_slots:
                        sid = b.get("slot_id")
                        if sid is None:
                            continue
                        cls_val = b["status"]
                        status = 'occupied' if cls_val == self.car_class_id else 'available'
                        conf_f = float(b.get("conf", 0.0))
                        slot_list.append({
                            'code': f"S{sid}",
                            'status': status,
                            'confidence': round(conf_f, 4),
                        })
                # Dù có mapping hay không, vẫn trả kết quả đã có
                return {
                    'slots': slot_list,
                    'totalSlots': self.total_slots,
                    'freeSlots': free_slots,
                    'occupiedSlots': occupied_slots,
                    'detectedCars': occupied_slots,
                    'processedImageBase64': encode_image_to_base64(overlay),
                }

            return {
                'slots': [],
                'totalSlots': self.total_slots,
                'freeSlots': self.total_slots,
                'occupiedSlots': 0,
                'detectedCars': 0,
                'processedImageBase64': encode_image_to_base64(opencv_image),
            }
            
        except Exception as e:
            print(f"Slot detection error: {e}")
            import traceback
            traceback.print_exc()
            
            return {
                'slots': [],
                'processedImageBase64': encode_image_to_base64(opencv_image),
                'totalSlots': self.total_slots,
                'freeSlots': self.total_slots,
                'occupiedSlots': 0,
                'detectedCars': 0,
            }

