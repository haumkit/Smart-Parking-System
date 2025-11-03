const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

// AI Service URL from environment variable
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5001";

/**
 * Call Python Flask AI service to detect license plate
 */
async function callAIService(endpoint, filepath) {
  try {
    const formData = new FormData();
    formData.append("image", fs.createReadStream(filepath));

    const response = await axios.post(`${AI_SERVICE_URL}/api/detect/${endpoint}`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000, // 30 seconds timeout
    });

    return response.data;
  } catch (error) {
    console.error(`AI Service error (${endpoint}):`, error.message);
    
    // If AI service is unavailable, return error
    if (error.code === "ECONNREFUSED" || error.response?.status === 503) {
      throw new Error("AI service is currently unavailable");
    }
    throw error;
  }
}

exports.detectPlate = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    // Call Python AI service
    const result = await callAIService("plate", file.path);

    // Transform response to match backend API format
    if (result.success && result.data) {
      res.json({
        plateNumber: result.data.plateNumber,
        confidence: result.data.confidence,
        boundingBox: result.data.boundingBox,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || "AI detection failed",
      });
    }
  } catch (err) {
    console.error("Plate detection error:", err);
    
    // Fallback to stub data if AI service is down (optional)
    if (process.env.AI_FALLBACK === "true") {
      console.warn("Using fallback stub data");
      res.json({ plateNumber: "29A-123.45", confidence: 0.92 });
    } else {
      next(err);
    }
  }
};

exports.detectSlots = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    // Call Python AI service
    const result = await callAIService("slots", file.path);

    // Transform response to match backend API format
    if (result.success && result.data) {
      res.json({
        slots: result.data.slots,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || "AI detection failed",
      });
    }
  } catch (err) {
    console.error("Slot detection error:", err);
    
    // Fallback to stub data if AI service is down (optional)
    if (process.env.AI_FALLBACK === "true") {
      console.warn("Using fallback stub data");
      res.json({
        slots: [
          { code: "A1", status: "available" },
          { code: "A2", status: "occupied" },
        ],
      });
    } else {
      next(err);
    }
  }
};


