const { AI_SERVICE_URL, callAIService, callAIPlateFromCamera, callAISlotsFromCamera } = require("../services/ai.service");
const parkingService = require("../services/parking.service");
const axios = require("axios");

// Plate SSE clients storage: { cameraId: Set<res> }
const sseClients = new Map();
const latestDetections = new Map();

// Slot SSE storage
const slotSseClients = new Map();
const latestSlotDetections = new Map();
const lastSavedSlotHash = new Map(); // cameraId -> hash để tránh ghi DB khi không đổi

function hashSlots(slots = []) {
  try {
    const norm = (Array.isArray(slots) ? slots : [])
      .map((s) => ({
        code: String(s.code ?? ""),
        status: String(s.status ?? ""),
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
    return JSON.stringify(norm);
  } catch {
    return "";
  }
}

async function syncSlotsToDatabase(slots = [], cameraId = "default") {
  if (!Array.isArray(slots) || slots.length === 0) {
    return;
  }

  const currentHash = hashSlots(slots);
  if (currentHash && lastSavedSlotHash.get(cameraId) === currentHash) {
    return;
  }

  const ParkingSlot = require("../models/ParkingSlot");
  for (const slot of slots) {
    const rawCode = String(slot.code ?? "");
    const numericPart = rawCode.replace(/\D/g, "");
    const slotNum = parseInt(numericPart, 10);
    if (!numericPart || Number.isNaN(slotNum)) continue;

    await ParkingSlot.findOneAndUpdate(
      { slotNum },
      {
        slotNum,
        code: rawCode || slotNum.toString(),
        status: slot.status,
        ...(slot.status === "available" ? { vehicleId: null } : {}),
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  lastSavedSlotHash.set(cameraId, currentHash);
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
        plateImageBase64: result.data.plateImageBase64 ?? null,
        debugImageBase64: result.data.debugImageBase64 ?? null,
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
      res.json({ plateNumber: "NONE", confidence: 0 });
    } else {
      next(err);
    }
  }
};

exports.detectPlateFromCamera = async (req, res, next) => {
  try {
    const { cameraId } = req.params;
    const result = await callAIPlateFromCamera(cameraId);

    if (result.success && result.data) {
      return res.json({
        plateNumber: result.data.plateNumber,
        confidence: result.data.confidence,
        boundingBox: result.data.boundingBox ?? null,
        plateImageBase64: result.data.plateImageBase64 ?? null,
        debugImageBase64: result.data.debugImageBase64 ?? null,
      });
    }

    return res.status(422).json({
      success: false,
      message: result.message || "No license plate detected",
    });
  } catch (err) {
    console.error("Plate detection from camera error:", err);

    if (process.env.AI_FALLBACK === "true") {
      console.warn("Using fallback stub data");
      return res.json({ plateNumber: "NONE", confidence: 0 });
    }

    next(err);
  }
};


exports.webhookPlateDetected = async (req, res, next) => {
  try {
    const { cameraId, plateNumber, confidence, boundingBox, plateImageBase64, debugImageBase64 } = req.body;
    
    if (!cameraId || !plateNumber) {
      return res.status(400).json({
        success: false,
        message: "Missing cameraId or plateNumber"
      });
    }

    const detectionData = {
      plateNumber,
      confidence: confidence || 0,
      boundingBox: boundingBox || null,
      plateImageBase64: plateImageBase64 || null,
      debugImageBase64: debugImageBase64 || null,
      timestamp: new Date().toISOString()
    };

    latestDetections.set(cameraId, detectionData);

    const clients = sseClients.get(cameraId) || new Set();
    const message = `data: ${JSON.stringify(detectionData)}\n\n`;
    
    clients.forEach(res => {
      try {
        res.write(message);
      } catch (err) {
        console.error("SSE write error:", err);
        clients.delete(res);
      }
    });

    console.log(`Webhook: ${plateNumber} from ${cameraId} → pushed to ${clients.size} SSE clients`);
    
    res.json({ success: true, message: "Detection received and broadcasted" });
  } catch (err) {
    console.error("Webhook error:", err);
    next(err);
  }
};

exports.webhookSlotsDetected = async (req, res, next) => {
  try {
    const { cameraId, slots, totalSlots, freeSlots, occupiedSlots, detectedCars, processedImageBase64 } = req.body || {};

    if (!cameraId) {
      return res.status(400).json({
        success: false,
        message: "Missing cameraId parameter",
      });
    }

    const payload = {
      cameraId,
      slots: Array.isArray(slots) ? slots : [],
      totalSlots: totalSlots ?? null,
      freeSlots: freeSlots ?? null,
      occupiedSlots: occupiedSlots ?? null,
      detectedCars: detectedCars ?? null,
      timestamp: new Date().toISOString(),
      processedImageBase64: processedImageBase64 ?? null,
    };

    if (payload.slots.length) {
      try {
        await syncSlotsToDatabase(payload.slots, cameraId);
      } catch (syncErr) {
        console.warn("Slot DB sync failed:", syncErr.message);
      }
    }

    latestSlotDetections.set(cameraId, payload);
    const clients = slotSseClients.get(cameraId) || new Set();
    const message = `data: ${JSON.stringify(payload)}\n\n`;

    clients.forEach((clientRes) => {
      try {
        clientRes.write(message);
      } catch (err) {
        console.error("Slot SSE write error:", err);
        clients.delete(clientRes);
      }
    });

    res.json({ success: true, message: "Slot detection received" });
  } catch (err) {
    console.error("Slot webhook error:", err);
    next(err);
  }
};

exports.plateDetectionStream = async (req, res, next) => {
  try {
    const { cameraId } = req.params;
    
    if (!cameraId) {
      return res.status(400).json({
        success: false,
        message: "Missing cameraId parameter"
      });
    }

    // Check authentication (token from query param since EventSource doesn't support headers)
    const token = req.query.token || req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      console.log(`SSE connection rejected: No token for camera ${cameraId}`);
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const jwt = require("jsonwebtoken");
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
      req.user = payload; // Set user for consistency
      console.log(`SSE token verified for camera: ${cameraId}, user: ${payload.email || payload.id}`);
    } catch (err) {
      console.log(`SSE connection rejected: Invalid token for camera ${cameraId}`, err.message);
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }

    // Set SSE headers with CORS
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Cache-Control");

    // Add client to set
    if (!sseClients.has(cameraId)) {
      sseClients.set(cameraId, new Set());
    }
    sseClients.get(cameraId).add(res);

    console.log(`SSE client connected for camera: ${cameraId} (total: ${sseClients.get(cameraId).size})`);

    // Send latest detection if available
    const latest = latestDetections.get(cameraId);
    if (latest) {
      res.write(`data: ${JSON.stringify(latest)}\n\n`);
    }

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (err) {
        clearInterval(heartbeat);
      }
    }, 30000); // Every 30 seconds

    // Cleanup on disconnect
    req.on("close", () => {
      clearInterval(heartbeat);
      const clients = sseClients.get(cameraId);
      if (clients) {
        clients.delete(res);
        console.log(`SSE client disconnected for camera: ${cameraId} (remaining: ${clients.size})`);
        if (clients.size === 0) {
          sseClients.delete(cameraId);
        }
      }
    });

  } catch (err) {
    console.error("SSE setup error:", err);
    next(err);
  }
};

exports.slotDetectionStream = async (req, res, next) => {
  try {
    const { cameraId } = req.params;

    if (!cameraId) {
      return res.status(400).json({
        success: false,
        message: "Missing cameraId parameter",
      });
    }

    const token = req.query.token || req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const jwt = require("jsonwebtoken");
    try {
      jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Cache-Control");

    if (!slotSseClients.has(cameraId)) {
      slotSseClients.set(cameraId, new Set());
    }
    slotSseClients.get(cameraId).add(res);

    const latest = latestSlotDetections.get(cameraId);
    if (latest) {
      res.write(`data: ${JSON.stringify(latest)}\n\n`);
    }

    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (err) {
        clearInterval(heartbeat);
      }
    }, 30000);

    req.on("close", () => {
      clearInterval(heartbeat);
      const clients = slotSseClients.get(cameraId);
      if (clients) {
        clients.delete(res);
        if (clients.size === 0) {
          slotSseClients.delete(cameraId);
        }
      }
    });
  } catch (err) {
    console.error("Slot SSE setup error:", err);
    next(err);
  }
};

exports.detectSlotsFromCamera = async (req, res, next) => {
  try {
    const { cameraId } = req.params;
    const result = await callAISlotsFromCamera(cameraId);

    if (result.success && result.data) {
      try {
        await syncSlotsToDatabase(result.data.slots || [], cameraId);
        console.log("Synced", result.data.slots.length, "slots to DB from camera", cameraId);
      } catch (syncError) {
        console.warn("Failed to sync slots to DB:", syncError.message);
      }

      res.json({
        slots: result.data.slots,
        totalSlots: result.data.totalSlots ?? null,
        freeSlots: result.data.freeSlots ?? null,
        occupiedSlots: result.data.occupiedSlots ?? null,
        detectedCars: result.data.detectedCars ?? null,
        processedImageBase64: result.data.processedImageBase64 ?? null,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message || "AI detection failed",
      });
    }
  } catch (err) {
    console.error("Slot detection from camera error:", err);
    next(err);
  }
};

exports.proxyCameraStream = async (req, res, next) => {
  try {
    const { cameraId } = req.params;
    if (!cameraId) {
      return res.status(400).json({ success: false, message: "Missing cameraId" });
    }

    const upstream = await axios({
      method: "get",
      url: `${AI_SERVICE_URL}/api/cameras/${cameraId}/stream`,
      responseType: "stream",
      timeout: 20000,
    });

    // Forward content type if available
    if (upstream.headers["content-type"]) {
      res.setHeader("Content-Type", upstream.headers["content-type"]);
    }
    
    // Add CORS headers for video stream
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    upstream.data.on("error", next);
    upstream.data.pipe(res);
  } catch (err) {
    console.error("Proxy camera stream error:", err.message);
    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({ success: false, message: "AI service unavailable" });
    }
    next(err);
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
      try {
        await syncSlotsToDatabase(result.data.slots || [], "upload");
        console.log("Synced", result.data.slots.length, "slots to DB");
      } catch (syncError) {
        console.warn("Failed to sync slots to DB:", syncError.message);
      }

      res.json({
        slots: result.data.slots,
        totalSlots: result.data.totalSlots ?? null,
        freeSlots: result.data.freeSlots ?? null,
        occupiedSlots: result.data.occupiedSlots ?? null,
        detectedCars: detectedCars ?? null,
        processedImageBase64: result.data.processedImageBase64 ?? null,
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
          { code: "NONE", status: "available" },
          { code: "NONE", status: "occupied" },
        ],
      });
    } else {
      next(err);
    }
  }
};


