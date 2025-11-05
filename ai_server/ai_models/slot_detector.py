import cv2
import numpy as np
import os
from typing import List, Dict, Tuple

try:
    from ultralytics import YOLO  # type: ignore
    _ULTRA_AVAILABLE = True
except Exception:
    _ULTRA_AVAILABLE = False

try:
    import pandas as pd  # type: ignore
    _PANDAS_AVAILABLE = True
except Exception:
    _PANDAS_AVAILABLE = False

class ParkingSlotDetector:
    def __init__(self, model_path: str | None = None, polygon_csv_path: str | None = None, processed_dir: str = "uploads/processed", car_class_id: int = 1):
        self.model_path = model_path
        self.polygon_csv_path = polygon_csv_path or os.getenv("SLOT_POLYGON_CSV", "slots_polygon.csv")
        self.processed_dir = processed_dir
        self.car_class_id = int(os.getenv("SLOT_CAR_CLASS_ID", str(car_class_id)))

        os.makedirs(self.processed_dir, exist_ok=True)

        self.model = None
        self.slots_df = None

        if model_path and _ULTRA_AVAILABLE:
            try:
                self.model = YOLO(model_path)
                print(f"Parking Slot Detector: YOLO model loaded from {model_path}")
            except Exception as e:
                print(f"Failed to load YOLO model '{model_path}': {e}")
        else:
            if not _ULTRA_AVAILABLE:
                print("Ultralytics not available; running in stub mode")

        if self.polygon_csv_path and _PANDAS_AVAILABLE and os.path.exists(self.polygon_csv_path):
            try:
                import pandas as pd  # local name to satisfy linters
                self.slots_df = pd.read_csv(self.polygon_csv_path)
                print(f"Loaded slot polygons from {self.polygon_csv_path} ({len(self.slots_df)} slots)")
            except Exception as e:
                print(f"Failed to load polygons CSV '{self.polygon_csv_path}': {e}")
        else:
            if not _PANDAS_AVAILABLE:
                print("pandas not available; cannot load slot polygons CSV")
            elif not os.path.exists(self.polygon_csv_path or ""):
                print(f"Slot polygons CSV not found at {self.polygon_csv_path}; running in stub mode")
    
    def detect_from_image_path(self, image_path: str):
        image = cv2.imread(image_path)
        return self.detect_from_array(image, image_path)
    
    def detect_from_array(self, opencv_image, image_path: str | None = None):
        try:
            if self.model is not None and self.slots_df is not None:
                # Run YOLO inference
                results = self.model(image_path if image_path else opencv_image)[0]

                car_points: List[Tuple[int, int]] = []
                for box in results.boxes:
                    cls_id = int(box.cls[0])
                    if cls_id == self.car_class_id:
                        x1, y1, x2, y2 = box.xyxy[0]
                        cx, cy = int((x1 + x2) / 2), int((y1 + y2) / 2)
                        car_points.append((cx, cy))

                occupied_slots: List[int] = []

                # Check each polygon for car center point
                for _, row in self.slots_df.iterrows():
                    slot_id = int(row["SlotId"]) if "SlotId" in row else int(row[0])
                    pts = np.array([
                        [int(row["x1"]), int(row["y1"])],
                        [int(row["x2"]), int(row["y2"])],
                        [int(row["x3"]), int(row["y3"])],
                        [int(row["x4"]), int(row["y4"])],
                    ], np.int32).reshape((-1, 1, 2))

                    for (cx, cy) in car_points:
                        if cv2.pointPolygonTest(pts, (cx, cy), False) >= 0:
                            occupied_slots.append(slot_id)
                            break

                all_slot_ids = [int(s) for s in self.slots_df["SlotId"].tolist()]
                free_slots = [s for s in all_slot_ids if s not in occupied_slots]

                # Draw overlay
                overlay = opencv_image.copy()
                for _, row in self.slots_df.iterrows():
                    slot_id = int(row["SlotId"]) if "SlotId" in row else int(row[0])
                    pts = np.array([
                        [int(row["x1"]), int(row["y1"])],
                        [int(row["x2"]), int(row["y2"])],
                        [int(row["x3"]), int(row["y3"])],
                        [int(row["x4"]), int(row["y4"])],
                    ], np.int32).reshape((-1, 1, 2))
                    color = (0, 0, 255) if slot_id in occupied_slots else (0, 255, 0)
                    cv2.polylines(overlay, [pts], True, color, 2)
                    M = cv2.moments(pts)
                    if M["m00"] != 0:
                        cx = int(M["m10"]/M["m00"])
                        cy = int(M["m01"]/M["m00"])
                        cv2.putText(overlay, str(slot_id), (cx - 10, cy + 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                # Save processed image
                processed_path = None
                if image_path:
                    base = os.path.splitext(os.path.basename(image_path))[0]
                    processed_filename = f"{base}_processed.jpg"
                else:
                    processed_filename = "processed.jpg"
                processed_path = os.path.join(self.processed_dir, processed_filename)
                cv2.imwrite(processed_path, overlay)

                # Build slot list
                slot_list: List[Dict[str, object]] = []
                for slot_id in all_slot_ids:
                    status = 'occupied' if slot_id in occupied_slots else 'available'
                    slot_list.append({
                        'code': str(slot_id),
                        'status': status,
                        'confidence': 1.0,
                    })

                return {
                    'slots': slot_list,
                    'processedImagePath': processed_path.replace('\\', '/'),
                    'totalSlots': len(all_slot_ids),
                    'freeSlots': len(free_slots),
                    'occupiedSlots': len(occupied_slots),
                }

            # Fallback stub
            slots = [
                {"code": "A1", "status": "available", "confidence": 0.95},
                {"code": "A2", "status": "occupied", "confidence": 0.98},
                {"code": "A3", "status": "available", "confidence": 0.92},
                {"code": "B1", "status": "occupied", "confidence": 0.96},
            ]
            return {
                'slots': slots,
                'processedImagePath': None,
                'totalSlots': len(slots),
                'freeSlots': len([s for s in slots if s['status'] == 'available']),
                'occupiedSlots': len([s for s in slots if s['status'] == 'occupied']),
            }
            
        except Exception as e:
            print(f"Slot detection error: {e}")
            import traceback
            traceback.print_exc()
            
            # Return stub data on error
            return {
                'slots': [
                    {"code": "A1", "status": "available", "confidence": 0.95},
                    {"code": "A2", "status": "occupied", "confidence": 0.98},
                ],
                'processedImagePath': None,
                'totalSlots': 2,
                'freeSlots': 1,
                'occupiedSlots': 1,
            }

