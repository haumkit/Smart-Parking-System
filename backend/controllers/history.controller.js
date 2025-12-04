const ParkingRecord = require("../models/ParkingRecord");
const Vehicle = require("../models/Vehicle");
const { formatVietnamTime } = require("../services/parking.service");

// Helper: Format record dates to VN timezone
function formatRecordDates(record) {
  const formatted = record.toObject ? record.toObject() : { ...record };
  formatted.entryTimeVN = formatVietnamTime(formatted.entryTime);
  if (formatted.exitTime) {
    formatted.exitTimeVN = formatVietnamTime(formatted.exitTime);
  }
  return formatted;
}

exports.list = async (req, res, next) => {
  try {
    const { plate } = req.query;
    let filter = { isDeleted: { $ne: true } };
    
    if (req.user.role !== 'admin') {
      filter.$or = [
        { userId: req.user.id },
        { userId: { $exists: false } } // Walk-in records (không có userId)
      ];
    }
    
    if (plate) {
      const vehicles = await Vehicle.find({ plateNumber: new RegExp(plate, "i") }).select("_id");
      const vehicleIds = vehicles.map((v) => v._id);

      // Combine vehicle filter với existing filter
      if (req.user.role !== 'admin') {
        const userVehicles = await Vehicle.find({
          ownerId: req.user.id,
          _id: { $in: vehicleIds }
        }).select("_id");
        const userVehicleIds = userVehicles.map((v) => v._id);
        filter.$or = [
          ...(filter.$or || []),
          { vehicleId: { $in: userVehicleIds } }
        ];
      } else {
        filter.vehicleId = { $in: vehicleIds };
    }
    }
    
    const records = await ParkingRecord.find(filter)
      .populate("vehicleId")
      .populate("slotId")
      .sort({ createdAt: -1 });
    
    // Format tất cả dates sang VN timezone
    const formattedRecords = records.map(formatRecordDates);
    
    res.json(formattedRecords);
  } catch (err) {
    next(err);
  }
};

// Admin: thêm bản ghi lịch sử thủ công
exports.create = async (req, res, next) => {
  try {
    const { plateNumber, entryTime, exitTime, fee, hourlyRate } = req.body;

    if (!plateNumber || !entryTime) {
      return res.status(400).json({ message: "plateNumber và entryTime là bắt buộc" });
    }

    const normalizedPlate = plateNumber.trim().toUpperCase();

    let vehicle = await Vehicle.findOne({ plateNumber: normalizedPlate });
    if (!vehicle) {
      vehicle = await Vehicle.create({
        plateNumber: normalizedPlate,
        registeredTime: new Date(),
      });
    }

    const record = await ParkingRecord.create({
      vehicleId: vehicle._id,
      entryTime: new Date(entryTime),
      exitTime: exitTime ? new Date(exitTime) : null,
      fee: typeof fee === "number" ? fee : 0,
      hourlyRate: typeof hourlyRate === "number" ? hourlyRate : null,
    });

    const populated = await record.populate(["vehicleId", "slotId"]);
    res.status(201).json(formatRecordDates(populated));
  } catch (err) {
    next(err);
  }
};

// Admin: cập nhật bản ghi lịch sử
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plateNumber, entryTime, exitTime, fee, hourlyRate } = req.body;

    const record = await ParkingRecord.findById(id);
    if (!record || record.isDeleted) {
      return res.status(404).json({ message: "Record not found" });
    }

    if (plateNumber) {
      const normalizedPlate = plateNumber.trim().toUpperCase();
      let vehicle = await Vehicle.findOne({ plateNumber: normalizedPlate });
      if (!vehicle) {
        vehicle = await Vehicle.create({
          plateNumber: normalizedPlate,
          registeredTime: new Date(),
        });
      }
      record.vehicleId = vehicle._id;
    }

    if (entryTime) {
      record.entryTime = new Date(entryTime);
    }
    if (exitTime !== undefined) {
      record.exitTime = exitTime ? new Date(exitTime) : null;
    }
    if (fee !== undefined) {
      record.fee = fee;
    }
    if (hourlyRate !== undefined) {
      record.hourlyRate = hourlyRate;
    }

    await record.save();
    const populated = await record.populate(["vehicleId", "slotId"]);
    res.json(formatRecordDates(populated));
  } catch (err) {
    next(err);
  }
};

// Admin: xóa mềm bản ghi lịch sử
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await ParkingRecord.findById(id);
    if (!record || record.isDeleted) {
      return res.status(404).json({ message: "Record not found" });
    }

    record.isDeleted = true;
    await record.save();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};


