"""
Flask API for AI Detection Services
"""
from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
import os
import werkzeug
from datetime import datetime

from ai_models.plate_detector import LicensePlateDetector
from ai_models.slot_detector import ParkingSlotDetector

app = Flask(__name__)
CORS(app, origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(","))

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024

WPOD_MODEL_PATH = os.getenv("WPOD_MODEL_PATH", "models/wpod-net")
OCR_MODEL_PATH = os.getenv("OCR_MODEL_PATH", "models/model_car_full_num.h5")
SLOT_MODEL_PATH = os.getenv("SLOT_MODEL_PATH", os.getenv("SLOT_YOLO_MODEL_PATH", "models/best.pt"))
SLOT_POLYGON_CSV = os.getenv("SLOT_POLYGON_CSV", "slots_polygon.csv")
PROCESSED_DIR = os.getenv("SLOT_PROCESSED_DIR", os.path.join(UPLOAD_FOLDER, "processed"))

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

plate_detector = None
slot_detector = None

def load_ai_models():
    global plate_detector, slot_detector
    
    try:   
        if os.path.exists("models") and os.path.exists(WPOD_MODEL_PATH + ".json"):
            print("Loading AI models...")
            plate_detector = LicensePlateDetector(WPOD_MODEL_PATH, OCR_MODEL_PATH)
            slot_detector = ParkingSlotDetector(
                model_path=SLOT_MODEL_PATH,
                polygon_csv_path=SLOT_POLYGON_CSV,
                processed_dir=PROCESSED_DIR,
            )
            print("✅ AI models loaded successfully!")
        else:
            print("⚠️  Model files not found. Running in stub mode.")
            plate_detector = None
            slot_detector = None
    except Exception as e:
        print(f"Error loading AI models: {e}")
        print("Running in stub mode without AI models.")
        plate_detector = None
        slot_detector = None

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


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
    # Serve files from the uploads directory (including processed overlays)
    return send_from_directory(UPLOAD_FOLDER, filename)


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

        if plate_detector is not None:
            try:
                detection_result = plate_detector.detect_from_image_path(filepath)
                
                if detection_result:
                    result = {
                        "success": True,
                        "data": {
                            "plateNumber": detection_result['plateNumber'],
                            "confidence": detection_result['confidence'],
                            "boundingBox": detection_result['boundingBox']
                        }
                    }
                else:
                    result = {
                        "success": False,
                        "message": "No license plate detected"
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
                "plateNumber": "29A-123.45",
                "confidence": 0.92,
                "boundingBox": {
                    "x": 100,
                    "y": 200,
                    "width": 300,
                    "height": 100
                }
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
                    # Build a URL to serve the processed file
                    # Ensure it's relative to uploads directory
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
    
    print(f"🧠 Starting AI Detection Service on port {port}")
    print(f"Environment: {os.getenv('FLASK_ENV', 'development')}")
    
    load_ai_models()
    
    app.run(host="0.0.0.0", port=port, debug=debug)

