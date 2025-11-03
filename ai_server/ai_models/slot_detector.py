# -*- coding: utf-8 -*-
"""
Parking Slot Detector
Nhận diện trạng thái chỗ đỗ xe (trống/đã đỗ)
"""

import cv2
import numpy as np

class ParkingSlotDetector:
    def __init__(self, model_path=None):
        """
        Initialize parking slot detector
        
        Args:
            model_path: Path to slot detection model (optional for now)
        """
        self.model_path = model_path
        # TODO: Load actual model when available
        print("Parking Slot Detector initialized (stub mode)")
    
    def detect_from_image_path(self, image_path):
        """
        Detect parking slots from image file path
        
        Args:
            image_path: Path to image file
            
        Returns:
            list: List of detected slots with status
        """
        image = cv2.imread(image_path)
        return self.detect_from_array(image)
    
    def detect_from_array(self, opencv_image):
        """
        Detect parking slots from OpenCV image array
        
        Args:
            opencv_image: OpenCV image (BGR format)
            
        Returns:
            list: [
                {
                    'code': str,
                    'status': str,  # 'available' or 'occupied'
                    'confidence': float
                }
            ]
        """
        try:
            # TODO: Implement actual slot detection logic
            # For now, return stub data
            
            # Example stub: detect based on basic image processing
            # In real implementation, this would use a trained model
            
            # Convert to grayscale
            gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
            
            # Apply thresholding to find potential parking areas
            _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
            
            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filter contours by area to find potential parking spots
            min_area = 1000  # Minimum area for a parking spot
            max_area = 50000  # Maximum area for a parking spot
            
            slots = []
            for i, contour in enumerate(contours):
                area = cv2.contourArea(contour)
                if min_area < area < max_area:
                    # Get bounding box
                    x, y, w, h = cv2.boundingRect(contour)
                    
                    # Calculate occupancy based on average intensity
                    roi = gray[y:y+h, x:x+w]
                    avg_intensity = np.mean(roi)
                    
                    # Simple heuristic: darker = occupied, lighter = available
                    # Threshold may need adjustment based on actual images
                    status = 'occupied' if avg_intensity < 80 else 'available'
                    confidence = 0.9 if avg_intensity < 60 or avg_intensity > 140 else 0.7
                    
                    slots.append({
                        'code': f"A{i+1}",
                        'status': status,
                        'confidence': float(confidence)
                    })
            
            # If no slots found, return stub data
            if not slots:
                slots = [
                    {"code": "A1", "status": "available", "confidence": 0.95},
                    {"code": "A2", "status": "occupied", "confidence": 0.98},
                    {"code": "A3", "status": "available", "confidence": 0.92},
                    {"code": "B1", "status": "occupied", "confidence": 0.96},
                ]
            
            return slots
            
        except Exception as e:
            print(f"Slot detection error: {e}")
            import traceback
            traceback.print_exc()
            
            # Return stub data on error
            return [
                {"code": "A1", "status": "available", "confidence": 0.95},
                {"code": "A2", "status": "occupied", "confidence": 0.98},
            ]

