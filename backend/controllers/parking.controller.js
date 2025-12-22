const ParkingSlot = require("../models/ParkingSlot");
const ParkingRecord = require("../models/ParkingRecord");
const parkingService = require("../services/parking.service");

function getCurrentHourlyRate() {
  return parkingService.getHourlyRate();
}

exports.listSlots = async (req, res, next) => {
  try {
    // Tất cả user đều xem được trạng thái bãi đỗ
    const slots = await ParkingSlot.find({})
      .select('slotNum code status')
      .sort({ slotNum: 1 });
    return res.json(slots);
  } catch (err) {
    next(err);
  }
};

exports.createSlot = async (req, res, next) => {
  try {
    const slot = await ParkingSlot.create(req.body);
    res.status(201).json(slot);
  } catch (err) {
    next(err);
  }
};

exports.updateSlot = async (req, res, next) => {
  try {
    const slot = await ParkingSlot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!slot) return res.status(404).json({ message: "Not found" });
    res.json(slot);
  } catch (err) {
    next(err);
  }
};

exports.deleteSlot = async (req, res, next) => {
  try {
    await ParkingSlot.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.suggestSlot = async (req, res, next) => {
  try {
    const slot = await ParkingSlot.findOne({ status: "available" }).sort({ code: 1 });
    if (!slot) return res.status(404).json({ message: "No available slot" });
    res.json(slot);
  } catch (err) {
    next(err);
  }
};

exports.listAvailableSlots = async (req, res, next) => {
  try {
    const slots = await ParkingSlot.find({ status: "available" })
      .select("slotNum status")
      .sort({ slotNum: 1 });
    res.json({
      success: true,
      count: slots.length,
      slots: slots.map(s => ({
        slotNum: s.slotNum,
        code: s.code || s.slotNum.toString(), // Fallback nếu code null
        status: s.status
      }))
    });
  } catch (err) {
    next(err);
  }
};

exports.checkIn = async (req, res, next) => {
  try {
    const { vehicleId, slotId } = req.body;
    
    if (req.user.role !== 'admin') {
      const Vehicle = require("../models/Vehicle");
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle || vehicle.ownerId.toString() !== req.user.id) {
        return res.status(403).json({ message: "Vehicle does not belong to you" });
      }
    }
    
    const Vehicle = require("../models/Vehicle");
    const vehicleDoc = await Vehicle.findById(vehicleId);
    const plate = vehicleDoc?.plateNumber || "";

    const record = await ParkingRecord.create({ 
      vehicleId, 
      plateNumber: plate,
      slotId, 
      userId: req.user.id,
      entryTime: new Date(),
      hourlyRate: getCurrentHourlyRate() // Lưu giá tại thời điểm xe vào
    });
    await ParkingSlot.findByIdAndUpdate(slotId, { status: "occupied", vehicleId });
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
};

function calcFee(entry, exit, mode = "per_hour") {
  const ms = Math.max(0, exit - entry);
  const hour = 60 * 60 * 1000;
  const half = 30 * 60 * 1000;
  const hours = Math.ceil(ms / hour);
  return hours * 5000; 
}

exports.checkOut = async (req, res, next) => {
  try {
    const { recordId, pricingMode } = req.body;
    const record = await ParkingRecord.findById(recordId);
    if (!record) return res.status(404).json({ message: "Record not found" });
    
    if (req.user.role !== 'admin' && record.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Record does not belong to you" });
    }
    
    record.exitTime = new Date();
    record.pricingMode = pricingMode || record.pricingMode;
    record.fee = calcFee(record.entryTime, record.exitTime, record.pricingMode);
    await record.save();
    if (record.slotId) await ParkingSlot.findByIdAndUpdate(record.slotId, { status: "available", vehicleId: null });
    res.json(record);
  } catch (err) {
    next(err);
  }
};

exports.walkInEntry = async (req, res, next) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const result = await parkingService.walkInEntry(file.path);

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Walk-in entry error:", err);
    
    // Handle specific error types
    if (err.message.includes("Plate not detected")) {
      return res.status(422).json({ success: false, message: err.message });
    }
    if (err.message.includes("already in parking")) {
      return res.status(409).json({ success: false, message: err.message }); // 409 Conflict
    }
    if (err.message.includes("Invalid")) {
      return res.status(400).json({ success: false, message: err.message });
    }
    
    next(err);
  }
};

exports.walkInExit = async (req, res, next) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const result = await parkingService.walkInExit(file.path);

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Walk-in exit error:", err);
    
    // Handle specific error types
    if (err.message.includes("Plate not detected")) {
      return res.status(422).json({ success: false, message: err.message });
    }
    if (err.message.includes("Vehicle not found") || err.message.includes("No open parking record")) {
      return res.status(404).json({ success: false, message: err.message });
    }
    if (err.message.includes("Invalid")) {
      return res.status(400).json({ success: false, message: err.message });
    }
    
    next(err);
  }
};

exports.confirmEntryByPlate = async (req, res, next) => {
  try {
    const { plateNumber } = req.body;

    if (!plateNumber) {
      return res.status(400).json({ success: false, message: "Plate number is required" });
    }

    const result = await parkingService.walkInEntryByPlate(plateNumber);

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Confirm entry by plate error:", err);
    
    if (err.message.includes("already in parking")) {
      return res.status(409).json({ success: false, message: err.message });
    }
    if (err.message.includes("required")) {
      return res.status(400).json({ success: false, message: err.message });
    }
    
    next(err);
  }
};


exports.confirmExitByPlate = async (req, res, next) => {
  try {
    const { plateNumber } = req.body;

    if (!plateNumber) {
      return res.status(400).json({ success: false, message: "Plate number is required" });
    }

    const result = await parkingService.walkInExitByPlate(plateNumber);

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Confirm exit by plate error:", err);
    
    if (err.message.includes("Vehicle not found") || err.message.includes("No open parking record")) {
      return res.status(404).json({ success: false, message: err.message });
    }
    if (err.message.includes("required")) {
      return res.status(400).json({ success: false, message: err.message });
    }
    
    next(err);
  }
};

exports.getHourlyRate = async (req, res, next) => {
  try {
    const rate = parkingService.getHourlyRate();
    res.json({ success: true, hourlyRate: rate });
  } catch (err) {
    next(err);
  }
};

exports.updateHourlyRate = async (req, res, next) => {
  try {
    const { hourlyRate } = req.body;
    if (hourlyRate === undefined) {
      return res.status(400).json({ success: false, message: "hourlyRate is required" });
    }
    const rate = parkingService.setHourlyRate(hourlyRate);
    res.json({ success: true, hourlyRate: rate });
  } catch (err) {
    if (err.message.includes("non-negative")) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};


