from flask import Flask, request, jsonify, send_from_directory, url_for, Response
from flask_cors import CORS
import os
import werkzeug
from datetime import datetime
import time
import threading
import cv2
import requests

from ai_models.plate_detector import LicensePlateDetector
from ai_models.slot_detector import ParkingSlotDetector
from camera_manager import MultiCameraManager
from motion_detector import MotionDetector

app = Flask(__name__)
CORS(app, origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(","))

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024

WPOD_MODEL_PATH = os.getenv("WPOD_MODEL_PATH", "models/wpod-net")
OCR_MODEL_PATH = os.getenv("OCR_MODEL_PATH", "models/last-dataset-update.h5")
SLOT_MODEL_PATH = os.getenv("SLOT_MODEL_PATH", os.getenv("SLOT_YOLO_MODEL_PATH", "models/best.pt"))
PROCESSED_DIR = os.getenv("SLOT_PROCESSED_DIR", os.path.join(UPLOAD_FOLDER, "processed"))
TOTAL_PARKING_SLOTS = int(os.getenv("TOTAL_PARKING_SLOTS", "23"))
SLOT_DETECTION_INTERVAL = float(os.getenv("SLOT_DETECTION_INTERVAL", "60"))
SLOT_DETECTION_CAMERAS = [
    cam.strip() for cam in os.getenv("SLOT_DETECTION_CAMERAS", "parking").split(",") if cam.strip()
]

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

plate_detector = None
slot_detector = None
camera_manager: MultiCameraManager | None = None
motion_detectors = {}

BACKEND_WEBHOOK_URL = os.getenv("BACKEND_WEBHOOK_URL", "http://localhost:5000/api/v1/ai/webhook/plate-detected")
BACKEND_SLOT_WEBHOOK_URL = os.getenv("BACKEND_SLOT_WEBHOOK_URL","http://localhost:5000/api/v1/ai/webhook/slots-detected")
slot_detection_threads: dict[str, dict] = {}
slot_detection_latest: dict[str, dict] = {}

def load_ai_models():
    global plate_detector, slot_detector
    
    try:   
        if os.path.exists("models") and os.path.exists(WPOD_MODEL_PATH + ".json"):
            print("Loading AI models...")
            plate_detector = LicensePlateDetector(WPOD_MODEL_PATH, OCR_MODEL_PATH)
            slot_detector = ParkingSlotDetector(
                model_path=SLOT_MODEL_PATH,
                processed_dir=PROCESSED_DIR,
                total_slots=TOTAL_PARKING_SLOTS,
            )
            print("AI models loaded successfully!")
        else:
            print("Model files not found. Running in stub mode.")
            plate_detector = None
            slot_detector = None
    except Exception as e:
        print(f"Error loading AI models: {e}")
        print("Running in stub mode without AI models.")
        plate_detector = None
        slot_detector = None

def start_camera_manager():
    global camera_manager, motion_detectors
    try:
        camera_manager = MultiCameraManager()
        camera_manager.start_all()
        print("Camera manager started:", list(camera_manager.cameras.keys()))
        
        if camera_manager and plate_detector:
            cameras_to_monitor = ["entry", "exit"]  # Danh sách camera cần motion detection
            
            for camera_id in cameras_to_monitor:
                if camera_id in camera_manager.cameras:
                    motion_detector = MotionDetector(
                        camera_manager=camera_manager,
                        plate_detector=plate_detector,
                        webhook_url=BACKEND_WEBHOOK_URL,
                        motion_threshold_percent=0.05, 
                        ocr_delay=1.0,
                        stable_delay=0.3,
                        check_interval=0.5,
                        on_plate_detected=detect_slots_once
                    )
                    motion_detector.start(camera_id)
                    motion_detectors[camera_id] = motion_detector
                    print(f"Motion detection started for camera '{camera_id}'")
                else:
                    print(f"Camera '{camera_id}' not found, skipping motion detection")
        
        start_slot_detection_workers()
    except Exception as cam_error:
        camera_manager = None
        print(f"Failed to start camera manager: {cam_error}")


def send_slot_detection_to_backend(camera_id: str, payload: dict):
    if not BACKEND_SLOT_WEBHOOK_URL:
        return
    try:
        body = {
            "cameraId": camera_id,
            "totalSlots": payload.get("totalSlots"),
            "freeSlots": payload.get("freeSlots"),
            "occupiedSlots": payload.get("occupiedSlots"),
            "detectedCars": payload.get("detectedCars"),
            "slots": payload.get("slots", []),
            "processedImageBase64": payload.get("processedImageBase64"),
            "timestamp": datetime.now().isoformat()
        }
        response = requests.post(
            BACKEND_SLOT_WEBHOOK_URL,
            json=body,
            timeout=5
        )
        if response.status_code != 200:
            print(f"[SLOT] Webhook failed ({response.status_code}): {response.text}")
    except Exception as exc:
        print(f"[SLOT] Webhook error: {exc}")

def detect_slots_once(camera_id: str):

    if camera_manager is None or slot_detector is None:
        return False

    camera = camera_manager.cameras.get(camera_id)
    if not camera or not camera.running:
        return False

    status = camera.get_status()
    if status.get("error"):
        return False

    if camera.last_update is None or (time.time() - camera.last_update) > 5.0:
        return False

    frame = camera.get_frame()
    if frame is None:
        return False

    try:
        detection_result = slot_detector.detect_from_array(frame.copy())
        if not detection_result:
            return False

        processed_base64 = detection_result.get("processedImageBase64")
        payload = {
            "cameraId": camera_id,
            "totalSlots": detection_result.get("totalSlots"),
            "freeSlots": detection_result.get("freeSlots"),
            "occupiedSlots": detection_result.get("occupiedSlots"),
            "detectedCars": detection_result.get("detectedCars"),
            "slots": detection_result.get("slots", []),
            "processedImageBase64": processed_base64,
        }
        slot_detection_latest[camera_id] = payload
        
        send_slot_detection_to_backend(camera_id, payload)
        return True

    except Exception as exc:
        print(f"[SLOT] Detection error for '{camera_id}': {exc}")
        return False

def slot_detection_loop(camera_id: str, stop_event: threading.Event):
    print(f"[SLOT] Detection loop started for camera '{camera_id}' (every {SLOT_DETECTION_INTERVAL}s)")
    while not stop_event.is_set():
        try:
            detect_slots_once(camera_id)
        except Exception as exc:
            print(f"[SLOT] Detection loop error for '{camera_id}': {exc}")

        time.sleep(SLOT_DETECTION_INTERVAL)


def start_slot_detection_workers():
    if not SLOT_DETECTION_CAMERAS:
        return
    if slot_detector is None:
        print("[SLOT] Slot detector not initialized; skip auto detection.")
        return
    if camera_manager is None:
        return

    for camera_id in SLOT_DETECTION_CAMERAS:
        if not camera_id:
            continue
        if camera_id not in camera_manager.cameras:
            print(f"[SLOT] Camera '{camera_id}' not found, skip auto detection.")
            continue
        if camera_id in slot_detection_threads:
            continue

        stop_event = threading.Event()
        thread = threading.Thread(
            target=slot_detection_loop,
            args=(camera_id, stop_event),
            daemon=True
        )
        slot_detection_threads[camera_id] = {
            "thread": thread,
            "stop": stop_event
        }
        thread.start()

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def build_plate_response(detection_result):
    if detection_result:
        return {
            "success": True,
            "data": {
                "plateNumber": detection_result["plateNumber"],
                "confidence": detection_result["confidence"],
                "boundingBox": detection_result.get("boundingBox"),
                "plateImageBase64": detection_result.get("plate_img_base64"),
                "debugImageBase64": detection_result.get("debug_img_base64"),
            },
        }
    return {
        "success": False,
        "message": "No license plate detected",
    }

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "service": "AI Detection Service",
        "timestamp": datetime.now().isoformat()
    })


@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "message": "Smart Parking AI Detection Service",
        "version": "1.0.0",
        "endpoints": {
            "plateDetection": "/api/detect/plate",
            "slotDetection": "/api/detect/slots"
        }
    })


@app.route('/uploads/<path:filename>', methods=['GET'])
def serve_uploads(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route("/api/cameras/status", methods=["GET"])
def cameras_status():
    if camera_manager is None:
        return jsonify({
            "success": False,
            "message": "Camera manager is not running"
        }), 503

    return jsonify({
        "success": True,
        "cameras": camera_manager.status()
    })


@app.route("/api/cameras/<string:camera_id>/frame", methods=["GET"])
def camera_frame(camera_id):
    if camera_manager is None:
        return jsonify({
            "success": False,
            "message": "Camera manager is not running"
        }), 503

    frame_bytes = camera_manager.get_frame_bytes(camera_id)
    if frame_bytes is None:
        return jsonify({
            "success": False,
            "message": f"No frame available for camera '{camera_id}'"
        }), 404

    return Response(frame_bytes, mimetype="image/jpeg")


@app.route("/api/cameras/<string:camera_id>/stream", methods=["GET"])
def camera_stream(camera_id):
    if camera_manager is None:
        return jsonify({
            "success": False,
            "message": "Camera manager is not running"
        }), 503

    def generate():
        boundary = b"--frame"
        while True:
            frame_bytes = camera_manager.get_frame_bytes(camera_id)
            if frame_bytes is None:
                time.sleep(0.1)
                continue
            yield (
                boundary + b"\r\n"
                + b"Content-Type: image/jpeg\r\n"
                + b"Content-Length: " + str(len(frame_bytes)).encode() + b"\r\n\r\n"
                + frame_bytes + b"\r\n"
            )
            time.sleep(0.04)

    return Response(generate(), mimetype="multipart/x-mixed-replace; boundary=frame")


@app.route("/api/detect/plate", methods=["POST"])
def detect_plate():
    
    try:
        if "image" not in request.files:
            return jsonify({
                "success": False,
                "message": "No image file uploaded"
            }), 400

        file = request.files["image"]

        if file.filename == "":
            return jsonify({
                "success": False,
                "message": "No file selected"
            }), 400

        if not allowed_file(file.filename):
            return jsonify({
                "success": False,
                "message": "Invalid file type. Only images allowed."
            }), 400

        # Check file size
        file.seek(0, os.SEEK_END)
        file_length = file.tell()
        file.seek(0)
        
        if file_length > MAX_FILE_SIZE:
            return jsonify({
                "success": False,
                "message": f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
            }), 400

        filename = werkzeug.utils.secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, f"{datetime.now().timestamp()}_{filename}")
        file.save(filepath)

        try:
            if plate_detector is not None:
                detection_result = plate_detector.detect_from_image_path(filepath)
                result = build_plate_response(detection_result)
            else:
                # Stub mode
                result = {
                    "success": True,
                    "data": {
                        "plateNumber": "29A-123.45",
                        "confidence": 0.92,
                        "boundingBox": {
                            "x": 100,
                            "y": 200,
                            "width": 300,
                            "height": 100,
                        },
                        "plateImageBase64": None,
                        "debugImageBase64": None,
                    },
                }
        finally:
            try:
                os.remove(filepath)
            except Exception:
                pass

        return jsonify(result)

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error processing request: {str(e)}"
        }), 500


@app.route("/api/detect/plate/from-camera/<string:camera_id>", methods=["GET"])
def detect_plate_from_camera(camera_id):
    try:
        if camera_manager is None:
            return jsonify({
                "success": False,
                "message": "Camera manager is not running",
            }), 503

        if plate_detector is None:
            # fallback stub
            result = {
                "success": True,
                "data": {
                    "plateNumber": "29A-123.45",
                    "confidence": 0.9,
                    "boundingBox": None,
                    "plateImageBase64": None,
                    "debugImageBase64": None,
                },
            }
            return jsonify(result)

        frame = camera_manager.get_frame(camera_id)
        if frame is None:
            return jsonify({
                "success": False,
                "message": f"No frame available for camera '{camera_id}'",
            }), 404

        detection_result = plate_detector.detect_from_array(frame)
        result = build_plate_response(detection_result)
        status_code = 200 if result.get("success") else 422
        return jsonify(result), status_code

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error processing request: {str(e)}",
        }), 500


@app.route("/api/detect/slots/from-camera/<string:camera_id>", methods=["GET"])
def detect_slots_from_camera(camera_id):
    try:
        if camera_manager is None:
            return jsonify({
                "success": False,
                "message": "Camera manager is not running",
            }), 503

        if slot_detector is None:
            # Fallback stub
            return jsonify({
                "success": True,
                "data": {
                    "slots": [
                        {"code": "1", "status": "available", "confidence": 0.95},
                        {"code": "2", "status": "occupied", "confidence": 0.98},
                    ],
                    "totalSlots": 2,
                    "freeSlots": 1,
                    "occupiedSlots": 1,
                    "detectedCars": 1,
                }
            })

        frame = camera_manager.get_frame(camera_id)
        if frame is None:
            return jsonify({
                "success": False,
                "message": f"No frame available for camera '{camera_id}'",
            }), 404

        detection_result = slot_detector.detect_from_array(frame)
        
        return jsonify({
            "success": True,
            "data": detection_result
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error processing request: {str(e)}",
        }), 500


@app.route("/api/webhook/plate-detected", methods=["POST"])
def webhook_plate_detected():
    try:
        data = request.json
        camera_id = data.get("cameraId", "unknown")
        plate_number = data.get("plateNumber")
        
        if plate_number:
            detect_slots_once("parking")

            print(f"Webhook received: {plate_number} from {camera_id}")
            send_webhook_to_backend(camera_id, data)
            return jsonify({"success": True, "message": "Webhook processed"}), 200
        else:
            return jsonify({"success": False, "message": "Invalid payload"}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/detect/slots", methods=["POST"])
def detect_slots():
    try:
        if "image" not in request.files:
            return jsonify({
                "success": False,
                "message": "No image file uploaded"
            }), 400

        file = request.files["image"]

        if file.filename == "":
            return jsonify({
                "success": False,
                "message": "No file selected"
            }), 400

        if not allowed_file(file.filename):
            return jsonify({
                "success": False,
                "message": "Invalid file type. Only images allowed."
            }), 400

        file.seek(0, os.SEEK_END)
        file_length = file.tell()
        file.seek(0)
        
        if file_length > MAX_FILE_SIZE:
            return jsonify({
                "success": False,
                "message": f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
            }), 400

        filename = werkzeug.utils.secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, f"{datetime.now().timestamp()}_{filename}")
        file.save(filepath)

        if slot_detector is not None:
            try:
                detection_result = slot_detector.detect_from_image_path(filepath)

                slots = detection_result.get("slots", []) if isinstance(detection_result, dict) else detection_result
                processed_path = None
                total_slots = None
                free_slots = None
                occupied_slots = None
                if isinstance(detection_result, dict):
                    processed_path = detection_result.get("processedImagePath")
                    total_slots = detection_result.get("totalSlots")
                    free_slots = detection_result.get("freeSlots")
                    occupied_slots = detection_result.get("occupiedSlots")

                processed_url = None
                if processed_path and os.path.exists(processed_path):
                    proc_rel = os.path.relpath(processed_path, UPLOAD_FOLDER).replace("\\", "/")
                    processed_url = f"/uploads/{proc_rel}"

                result = {
                    "success": True,
                    "data": {
                        "slots": slots,
                        "processedImageUrl": processed_url,
                        "totalSlots": total_slots,
                        "freeSlots": free_slots,
                        "occupiedSlots": occupied_slots,
                    }
                }
                    
                try:
                    os.remove(filepath)
                except:
                    pass
                    
                return jsonify(result)
            except Exception as e:
                print(f"Detection error: {e}")
                import traceback
                traceback.print_exc()
        
        result = {
            "success": True,
            "data": {
                "slots": [
                    {"code": "A1", "status": "available", "confidence": 0.95},
                    {"code": "A2", "status": "occupied", "confidence": 0.98},
                    {"code": "A3", "status": "available", "confidence": 0.92},
                    {"code": "B1", "status": "occupied", "confidence": 0.96},
                ],
                "processedImageUrl": None,
                "totalSlots": 4,
                "freeSlots": 2,
                "occupiedSlots": 2,
            }
        }

        try:
            os.remove(filepath)
        except:
            pass

        return jsonify(result)

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error processing request: {str(e)}"
        }), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "message": "Endpoint not found"
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "message": "Internal server error"
    }), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    debug = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    
    print(f"Starting AI Detection Service on port {port}")
    print(f"Environment: {os.getenv('FLASK_ENV', 'development')}")
    
    load_ai_models()
    start_camera_manager()
    
    app.run(host="0.0.0.0", port=port, debug=debug)

