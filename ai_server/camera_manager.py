import cv2
import os
import threading
import time
from typing import Dict, Optional, Union


def parse_source(value: str) -> Union[int, str]:
    if value is None:
        return 0
    value = value.strip()
    if value == "":
        return 0
    try:
        return int(value)
    except ValueError:
        return value


class CameraStream:
    def __init__(self, camera_id: str, source: Union[int, str], width: int, height: int):
        self.camera_id = camera_id
        self.source = source
        self.width = width
        self.height = height
        self.capture: Optional[cv2.VideoCapture] = None
        self.thread: Optional[threading.Thread] = None
        self.running = False
        self.lock = threading.Lock()
        self.latest_frame = None
        self.last_update: Optional[float] = None
        self.last_error: Optional[str] = None
        self.debug_info_printed = False
    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._read_loop, name=f"CameraStream-{self.camera_id}", daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5.0)
        self._release()

    def _release(self):
        if self.capture:
            try:
                self.capture.release()
            except Exception:
                pass
        self.capture = None

    def _init_capture(self) -> bool:
        self._release()
        self.capture = cv2.VideoCapture(self.source)
        if not self.capture or not self.capture.isOpened():
            self.last_error = "Unable to open camera source"
            return False

        if isinstance(self.source, int):
            self.capture.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            self.capture.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)

        self.last_error = None
        return True

    def _read_loop(self):
        while self.running:
            if self.capture is None or not self.capture.isOpened():
                if not self._init_capture():
                    time.sleep(5)
                    continue

            ret, frame = self.capture.read()
            if not ret:
                self.last_error = "Failed to read frame"
                self._release()
                time.sleep(1)
                continue

            if not isinstance(self.source, int):
                H, W, _ = frame.shape
                
                if W == 1280 and H == 720:
                    frame = frame[:, 160 : W - 160] 
                current_h, current_w = frame.shape[:2]
                
                if current_w != self.width or current_h != self.height:
                    frame = cv2.resize(frame, (self.width, self.height), 
                                       interpolation=cv2.INTER_LINEAR)

            """ if self.camera_id == "exit":
                cv2.imwrite(f"debug_exit_frame_{int(time.time())}.jpg", frame)  """

            if not self.debug_info_printed:
                real_h, real_w = frame.shape[:2]
                print(f"\n[INFO] Camera '{self.camera_id}':")
                print(f"   - Mong muốn (Config): {self.width}x{self.height}")
                print(f"   - Thực tế nhận được : {real_w}x{real_h}")
                self.debug_info_printed = True

            with self.lock:
                self.latest_frame = frame
                self.last_update = time.time()
                self.last_error = None

            time.sleep(0.01)

    def get_frame(self):
        with self.lock:
            return None if self.latest_frame is None else self.latest_frame.copy()

    def get_status(self):
        return {
            "id": self.camera_id,
            "source": self.source if isinstance(self.source, str) else f"index:{self.source}",
            "isRunning": self.running and self.capture is not None and self.capture.isOpened(),
            "lastUpdate": self.last_update,
            "error": self.last_error,
        }


class MultiCameraManager:
    def __init__(self):
        self.cameras: Dict[str, CameraStream] = {}
        self._init_from_env()

    def _init_from_env(self):
        entry_source = parse_source(os.getenv("CAM_ENTRY_SOURCE", "1"))
        exit_source = parse_source(os.getenv("CAM_EXIT_SOURCE", "3"))
        lot_source = parse_source(os.getenv("CAM_PARKING_SOURCE", "http:192.168.100.161:4747/video"))
        """  http:192.168.100.161:4747/video   http://huv12PM:123456@192.168.100.161:8081/video"""
        entry_width = int(os.getenv("CAM_ENTRY_WIDTH", "640"))
        entry_height = int(os.getenv("CAM_ENTRY_HEIGHT", "480"))
        exit_width = int(os.getenv("CAM_EXIT_WIDTH", "640"))
        exit_height = int(os.getenv("CAM_EXIT_HEIGHT", "480"))
        parking_width = int(os.getenv("CAM_PARKING_WIDTH", "960"))
        parking_height = int(os.getenv("CAM_PARKING_HEIGHT", "720"))

        self.cameras = {
            "entry": CameraStream("entry", entry_source, width=entry_width, height=entry_height),
            "exit": CameraStream("exit", exit_source, width=exit_width, height=exit_height),
            "parking": CameraStream("parking", lot_source, width=parking_width, height=parking_height),
        }

    def start_all(self):
        for stream in self.cameras.values():
            stream.start()

    def stop_all(self):
        for stream in self.cameras.values():
            stream.stop()

    def get_frame_bytes(self, camera_id: str) -> Optional[bytes]:
        stream = self.cameras.get(camera_id)
        if not stream:
            return None
        frame = stream.get_frame()
        if frame is None:
            return None
        success, buffer = cv2.imencode(".jpg", frame)
        if not success:
            return None
        return buffer.tobytes()

    def status(self):
        return {cam_id: stream.get_status() for cam_id, stream in self.cameras.items()}

    def get_frame(self, camera_id: str):
        stream = self.cameras.get(camera_id)
        if not stream:
            return None
        return stream.get_frame()

