const Vehicle = require("../models/Vehicle");

exports.create = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.create({
      ...req.body,
      registeredTime: req.body.registeredTime || new Date(),
      status: "approved", // Admin tạo mặc định approved
    });
    const populated = await Vehicle.findById(vehicle._id).populate("ownerId", "name email");
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { plate } = req.query;
    const filter = plate ? { plateNumber: new RegExp(plate, "i") } : {};
    const vehicles = await Vehicle.find(filter)
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
};

// User: Lấy xe của mình (bao gồm cả pending để xem trạng thái)
exports.listMy = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
};

// User: Thêm xe của mình (status pending, cần admin duyệt)
exports.createMy = async (req, res, next) => {
  try {
    const { plateNumber } = req.body;
    const normalizedPlate = plateNumber?.trim().toUpperCase();
    if (!normalizedPlate) {
      return res.status(400).json({ message: "Biển số là bắt buộc" });
    }

    const existing = await Vehicle.findOne({ plateNumber: normalizedPlate });

    if (existing && existing.ownerId) {
      const isSameOwner = existing.ownerId.toString() === req.user.id;
      return res.status(400).json({
        message: isSameOwner
          ? "Bạn đã đăng ký biển số này rồi."
          : "Biển số này đã được đăng ký bởi người dùng khác.",
      });
    }

    if (existing && !existing.ownerId) {
      existing.ownerId = req.user.id;
      existing.status = "pending";
      existing.registeredTime = new Date();
      await existing.save();
      return res.status(201).json(existing);
    }

    const vehicle = await Vehicle.create({
      plateNumber: normalizedPlate,
      ownerId: req.user.id,
      registeredTime: new Date(),
      status: "pending",
    });
    res.status(201).json(vehicle);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate("ownerId", "name email");
    if (!vehicle) return res.status(404).json({ message: "Không tìm thấy" });
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Not found" });
    
    // User chỉ được sửa xe của mình
    if (req.user.role !== 'admin' && vehicle.ownerId?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    Object.assign(vehicle, req.body);
    await vehicle.save();
    const populated = await Vehicle.findById(vehicle._id).populate("ownerId", "name email");
    res.json(populated);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Không tìm thấy" });
    
    // User chỉ được xóa xe của mình
    if (req.user.role !== 'admin' && vehicle.ownerId?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Không có quyền" });
    }
    
    await Vehicle.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// Admin: Duyệt phương tiện
exports.approve = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Không tìm thấy" });
    
    vehicle.status = "approved";
    vehicle.approvedBy = req.user.id;
    vehicle.approvedAt = new Date();
    await vehicle.save();
    
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
};

// Admin: Từ chối phương tiện
exports.reject = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Không tìm thấy" });
    
    vehicle.status = "rejected";
    vehicle.approvedBy = req.user.id;
    vehicle.approvedAt = new Date();
    await vehicle.save();
    
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
};

exports.listPending = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ status: "pending" })
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
};


