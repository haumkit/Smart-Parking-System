const ParkingRecord = require("../models/ParkingRecord");
const Vehicle = require("../models/Vehicle");

exports.list = async (req, res, next) => {
  try {
    const { plate } = req.query;
    let filter = {};
    
    // User: only see their own records, Admin: see all
    if (req.user.role !== 'admin') {
      filter.userId = req.user.id;
    }
    
    if (plate) {
      const vehicles = await Vehicle.find({ plateNumber: new RegExp(plate, "i") }).select("_id");
      const vehicleIds = vehicles.map((v) => v._id);
      
      // If filtering by plate, ensure vehicles belong to user (if not admin)
      if (req.user.role !== 'admin') {
        const userVehicles = await Vehicle.find({ 
          ownerId: req.user.id,
          _id: { $in: vehicleIds }
        }).select("_id");
        filter.vehicleId = { $in: userVehicles.map((v) => v._id) };
      } else {
        filter.vehicleId = { $in: vehicleIds };
      }
    }
    
    const records = await ParkingRecord.find(filter)
      .populate("vehicleId")
      .populate("slotId")
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    next(err);
  }
};


