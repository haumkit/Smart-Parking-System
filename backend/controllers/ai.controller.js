const { AI_SERVICE_URL, callAIService } = require("../services/ai.service");

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
      res.json({ plateNumber: "NONE", confidence: 0 });
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


      try {
        const ParkingSlot = require("../models/ParkingSlot");
        for (const slot of result.data.slots) {
          const slotNum = parseInt(slot.code);
          if (!isNaN(slotNum)) {
            await ParkingSlot.findOneAndUpdate(
              { slotNum: slotNum },
              { 
                slotNum: slotNum,
                code: slotNum.toString(), // Set code rõ ràng để tránh duplicate key error
                status: slot.status,
                ...(slot.status === "available" ? { vehicleId: null } : {})
              },
              { upsert: true, setDefaultsOnInsert: true }
            );
          }
        }
        console.log("✅ Synced", result.data.slots.length, "slots to DB");
      } catch (syncError) {
        console.warn("⚠️ Failed to sync slots to DB:", syncError.message);
      }

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
          { code: "NONE", status: "available" },
          { code: "NONE", status: "occupied" },
        ],
      });
    } else {
      next(err);
    }
  }
};


