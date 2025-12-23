const ParkingRecord = require("../models/ParkingRecord");
const Vehicle = require("../models/Vehicle");
const mongoose = require("mongoose");
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
    const { plate, from, to, status } = req.query;
    let filter = { isDeleted: { $ne: true } };
    
    if (from) {
      filter.entryTime = { ...(filter.entryTime || {}), $gte: new Date(from) };
    }
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.entryTime = { ...(filter.entryTime || {}), $lte: end };
    }
    if (status === 'completed') {
      filter.exitTime = { $ne: null };
    } else if (status === 'pending') {
      filter.exitTime = null;
    }
    

    if (req.user.role !== 'admin') {
      // Lấy tất cả các xe thuộc về user (bao gồm cả pending và approved)
      let userVehicleFilter = { ownerId: req.user.id };
      
      if (plate) {
        userVehicleFilter.plateNumber = new RegExp(plate, "i");
      }
      
      const userVehicles = await Vehicle.find(userVehicleFilter).select("_id plateNumber ownerId");
      const userVehicleIds = userVehicles.map((v) => v._id);
      
      // Debug: Log để kiểm tra
      console.log('User ID:', req.user.id);
      console.log('User vehicles found:', userVehicles.length);
      console.log('User vehicle IDs:', userVehicleIds.map(id => id.toString()));
      
      if (userVehicleIds.length === 0) {
        return res.json([]);
      }
      
      // Filter chỉ lấy các bản ghi của các xe thuộc về user
      filter.vehicleId = { $in: userVehicleIds };
      
      // Debug: Log filter
      console.log('Filter vehicleId:', filter.vehicleId);
    } else {

      if (plate) {
        const vehicles = await Vehicle.find({ plateNumber: new RegExp(plate, "i") }).select("_id");
        const vehicleIds = vehicles.map((v) => v._id);
        filter.vehicleId = { $in: vehicleIds };
      }
    }
    
    const records = await ParkingRecord.find(filter)
      .populate("vehicleId")
      .populate("slotId")
      .sort({ createdAt: -1 });
    
    // Debug: Log số lượng records tìm được
    if (req.user.role !== 'admin') {
      console.log('Records found:', records.length);
      console.log('Record vehicleIds:', records.map(r => r.vehicleId?._id?.toString() || r.vehicleId?.toString() || 'N/A'));
    }
    
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

// Admin: xóa mềm bản ghi lịch sử (chỉ cho phép xóa bản ghi đã hoàn thành)
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await ParkingRecord.findById(id);
    if (!record || record.isDeleted) {
      return res.status(404).json({ message: "Bản ghi không tồn tại" });
    }

    // Chỉ cho phép xóa bản ghi đã hoàn thành (có exitTime)
    if (!record.exitTime) {
      return res.status(400).json({ 
        message: "Không thể xóa bản ghi đang gửi xe. Vui lòng hoàn thành giao dịch trước." 
      });
    }

    record.isDeleted = true;
    await record.save();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};


