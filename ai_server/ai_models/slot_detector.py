import cv2
import os
import base64
from typing import List, Dict, Tuple

try:
    from ultralytics import YOLO  # type: ignore
    ULTRA_AVAILABLE = True
except Exception:
    ULTRA_AVAILABLE = False

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
                counter = 1
                for (_, _, _, _, conf) in empty_boxes:
                    slot_list.append({
                        'code': f"S{counter}",
                        'status': 'available',
                        'confidence': round(conf, 4),
                    })
                    counter += 1
                for (_, _, _, _, conf) in occupied_boxes:
                    slot_list.append({
                        'code': f"S{counter}",
                        'status': 'occupied',
                        'confidence': round(conf, 4),
                    })
                    counter += 1

                return {
                    'slots': slot_list,
                    'totalSlots': self.total_slots,
                    'freeSlots': free_slots,
                    'occupiedSlots': occupied_slots,
                    'detectedCars': occupied_slots,
                    'processedImageBase64': encode_image_to_base64(overlay),
                }

            # Fallback stub
            return {
                'slots': [
                    {"code": "S1", "status": "available", "confidence": 0.95},
                    {"code": "S2", "status": "occupied", "confidence": 0.98},
                ],
                'totalSlots': self.total_slots,
                'freeSlots': max(0, self.total_slots - 1),
                'occupiedSlots': 1,
                'detectedCars': 1,
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

