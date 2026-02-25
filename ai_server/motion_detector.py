import cv2
import time
import threading
import requests
from datetime import datetime
from typing import Optional, Callable


class MotionDetector:   
    def __init__(
        self,
        camera_manager,
        plate_detector,
        webhook_url: str,
        motion_threshold_percent: float = 0.1,
        ocr_delay: float = 2.0,
        stable_delay: float = 0.5,
        check_interval: float = 0.2,
        on_plate_detected=None,
        can_process_camera: Optional[Callable[[str], bool]] = None,
    ):
        self.camera_manager = camera_manager
        self.plate_detector = plate_detector
        self.webhook_url = webhook_url
        
        self.motion_threshold_percent = motion_threshold_percent
        self.ocr_delay = ocr_delay
        self.stable_delay = stable_delay
        self.check_interval = check_interval
        self.on_plate_detected = on_plate_detected
        self.can_process_camera = can_process_camera

        self.motion_detected = False
        self.motion_last_time = 0
        self.last_ocr_time = 0
        self.prev_gray = None
        
        self.running = False
        self.thread: Optional[threading.Thread] = None
    
    def detect_motion(self, frame) -> bool:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        
        if self.prev_gray is None:
            self.prev_gray = gray
            return False
        
        diff = cv2.absdiff(self.prev_gray, gray)
        _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
        motion_value = cv2.countNonZero(thresh)
        self.prev_gray = gray
        
        # Tính threshold động dựa trên kích thước frame (% của tổng pixels)
        height, width = gray.shape
        total_pixels = height * width
        threshold = int(total_pixels * self.motion_threshold_percent)
        
        return motion_value > threshold
    
    def send_webhook(self, camera_id: str, detection_result: dict):
        try:
            payload = {
                "cameraId": camera_id,
                "plateNumber": detection_result.get("plateNumber"),
                "confidence": detection_result.get("confidence"),
                "boundingBox": detection_result.get("boundingBox"),
                "plateImageBase64": detection_result.get("plate_img_base64"),
                "debugImageBase64": detection_result.get("debug_img_base64"),
                "timestamp": datetime.now().isoformat()
            }
            response = requests.post(
                self.webhook_url,
                json=payload,
                timeout=5
            )
            if response.status_code == 200:
                print(f"Webhook sent to backend for camera {camera_id}: {detection_result.get('plateNumber')}")
            else:
                print(f"Webhook failed: {response.status_code}")
        except Exception as e:
            print(f"Webhook error: {e}")
    
    def should_run_ocr(self, now: float) -> bool:
        if not self.motion_detected:
            return False
        
        time_since_motion = now - self.motion_last_time
        if time_since_motion < self.stable_delay:
            return False
        
        time_since_last_ocr = now - self.last_ocr_time
        if time_since_last_ocr < self.ocr_delay:
            return False
        
        return True
    
    def run_ocr(self, frame, camera_id: str):
        now = time.time()
        self.last_ocr_time = now
        
        print("Running OCR after motion detection...")
        
        detection_result = self.plate_detector.detect_from_array(frame)
        
        self.motion_detected = False
        
        if not detection_result:
            print("No plate detected")
            return
        
        plate_number = detection_result.get("plateNumber")
        if not plate_number:
            print("No plate detected")
            return
        
        confidence = detection_result.get("confidence", 0)
        print(f"Plate detected: {plate_number} (confidence: {confidence:.2f})")
        self.send_webhook(camera_id, detection_result)
        self.on_plate_detected("parking")

    def detection_loop(self, camera_id: str):
        print(f"Motion detection loop started for camera '{camera_id}' (checking at {1/self.check_interval:.1f} FPS)")
        
        while self.running:
            try:
                if self.camera_manager is None or self.plate_detector is None:
                    time.sleep(1)
                    continue
                
                camera = self.camera_manager.cameras.get(camera_id)
                if not camera or not camera.running:
                    time.sleep(1)
                    continue
                
                frame = camera.get_frame()
                if frame is None:
                    time.sleep(self.check_interval)
                    continue
                
                now = time.time()

                # Skip heavy OCR processing nếu cờ không cho phép cho camera này
                if self.can_process_camera is not None and not self.can_process_camera(camera_id):
                    # Vẫn đọc frame để giữ stream sống, nhưng bỏ qua detect/ocr
                    time.sleep(self.check_interval)
                    continue
                
                if self.detect_motion(frame):
                    self.motion_detected = True
                    self.motion_last_time = now
                    height, width = frame.shape[:2]
                    threshold = int(height * width * self.motion_threshold_percent)
                    print(f"Motion detected! Motion value > {threshold} ({self.motion_threshold_percent*100:.1f}% of {width}x{height})")
                
                if self.should_run_ocr(now):
                    self.run_ocr(frame, camera_id)
                
                time.sleep(self.check_interval)
                
            except Exception as e:
                print(f"Motion detection loop error: {e}")
                time.sleep(0.5)
    
    def start(self, camera_id: str):
        if self.running:
            print(f"Motion detection already running for camera '{camera_id}'")
            return
        
        self.running = True
        self.thread = threading.Thread(
            target=self.detection_loop,
            args=(camera_id,),
            name=f"MotionDetection-{camera_id}",
            daemon=True
        )
        self.thread.start()
        print(f"Motion detection started for camera '{camera_id}'")
    
    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)
        print("Motion detection stopped")

