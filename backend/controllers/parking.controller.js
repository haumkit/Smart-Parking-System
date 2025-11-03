const ParkingSlot = require("../models/ParkingSlot");
const ParkingRecord = require("../models/ParkingRecord");

exports.listSlots = async (req, res, next) => {
  try {
    // Admin sees all slots, user sees only slots where their vehicle is parked
    if (req.user.role === 'admin') {
      const slots = await ParkingSlot.find()
        .populate('vehicleId')
        .sort({ code: 1 });
      return res.json(slots);
    }
    
    // User: find slots where their vehicles are parked
    const Vehicle = require("../models/Vehicle");
    const userVehicles = await Vehicle.find({ ownerId: req.user.id }).select("_id");
    const vehicleIds = userVehicles.map(v => v._id);
    
    const slots = await ParkingSlot.find({
      vehicleId: { $in: vehicleIds },
      status: 'occupied'
    })
    .populate('vehicleId')
    .sort({ code: 1 });
    
    res.json(slots);
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

exports.checkIn = async (req, res, next) => {
  try {
    const { vehicleId, slotId } = req.body;
    
    // Verify vehicle belongs to user (if not admin)
    if (req.user.role !== 'admin') {
      const Vehicle = require("../models/Vehicle");
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle || vehicle.ownerId.toString() !== req.user.id) {
        return res.status(403).json({ message: "Vehicle does not belong to you" });
      }
    }
    
    const record = await ParkingRecord.create({ 
      vehicleId, 
      slotId, 
      userId: req.user.id,
      entryTime: new Date() 
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
  if (mode === "per_30min") {
    const blocks = Math.ceil(ms / half);
    return blocks * 5000; // stub: 5k per 30min
  }
  const hours = Math.ceil(ms / hour);
  return hours * 10000; // stub: 10k per hour
}

exports.checkOut = async (req, res, next) => {
  try {
    const { recordId, pricingMode } = req.body;
    const record = await ParkingRecord.findById(recordId);
    if (!record) return res.status(404).json({ message: "Record not found" });
    
    // Verify record belongs to user (if not admin)
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


