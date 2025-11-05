const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5001";

async function callAIService(endpoint, filepath) {
  try {
    const formData = new FormData();
    formData.append("image", fs.createReadStream(filepath));

    const response = await axios.post(`${AI_SERVICE_URL}/api/detect/${endpoint}`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    console.error(`AI Service error (${endpoint}):`, error.message);
    
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

    const result = await callAIService("plate", file.path);

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

    const result = await callAIService("slots", file.path);

    if (result.success && result.data) {
      const processedImageUrl = result.data.processedImageUrl
        ? `${AI_SERVICE_URL}${result.data.processedImageUrl}`
        : null;

      res.json({
        slots: result.data.slots,
        processedImageUrl,
        totalSlots: result.data.totalSlots ?? null,
        freeSlots: result.data.freeSlots ?? null,
        occupiedSlots: result.data.occupiedSlots ?? null,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || "AI detection failed",
      });
    }
  } catch (err) {
    console.error("Slot detection error:", err);
    
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


