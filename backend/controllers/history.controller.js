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
    let filter = {};
    
    // Walk-in records không có userId, chỉ filter theo role nếu có userId
    // Admin: xem tất cả, User: chỉ xem của mình (nếu có userId)
    if (req.user.role !== 'admin') {
      // Chỉ filter theo userId nếu record có userId (không phải walk-in)
      filter = {
        $or: [
          { userId: req.user.id },
          { userId: { $exists: false } } // Walk-in records (không có userId)
        ]
      };
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


