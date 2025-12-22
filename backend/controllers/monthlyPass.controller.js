const MonthlyPass = require("../models/MonthlyPass");
const Vehicle = require("../models/Vehicle");

// Kiểm tra xe có vé tháng còn hạn không
exports.checkValidPass = async (vehicleId) => {
  const now = new Date();
  const pass = await MonthlyPass.findOne({
    vehicleId,
    status: "approved",
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
  return !!pass;
};

// User: Lấy danh sách vé tháng của mình
exports.myPasses = async (req, res, next) => {
  try {
    const userVehicles = await Vehicle.find({ ownerId: req.user.id }).select("_id");
    const vehicleIds = userVehicles.map((v) => v._id);

    const passes = await MonthlyPass.find({ vehicleId: { $in: vehicleIds } })
      .populate("vehicleId")
      .sort({ createdAt: -1 });

    return res.json(passes);
  } catch (err) {
    next(err);
  }
};

// User: Đề xuất mua vé tháng
exports.requestPass = async (req, res, next) => {
  try {
    const { vehicleId, months = 1 } = req.body;

    // Kiểm tra xe thuộc user
    const vehicle = await Vehicle.findOne({ _id: vehicleId, ownerId: req.user.id });
    if (!vehicle) {
      return res.status(400).json({ message: "Phương tiện không hợp lệ" });
    }

    // Kiểm tra đã có vé pending hoặc còn hạn
    const existingPass = await MonthlyPass.findOne({
      vehicleId,
      $or: [
        { status: "pending" },
        { status: "approved", endDate: { $gte: new Date() } },
      ],
    });

    if (existingPass) {
      if (existingPass.status === "pending") {
        return res.status(400).json({ message: "Đã có đề xuất đang chờ duyệt" });
      }
      return res.status(400).json({ message: "Xe đã có vé tháng còn hạn" });
    }

    // Tính ngày bắt đầu và kết thúc
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    // Giá vé tháng (có thể config)
    const pricePerMonth = 500000; // 500k/tháng
    const price = pricePerMonth * months;

    const pass = await MonthlyPass.create({
      vehicleId,
      userId: req.user.id,
      startDate,
      endDate,
      price,
      status: "pending",
    });

    return res.status(201).json({ message: "Đã gửi đề xuất", pass });
  } catch (err) {
    next(err);
  }
};

// Admin: Lấy tất cả vé tháng
exports.listAll = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const passes = await MonthlyPass.find(query)
      .populate("vehicleId")
      .populate("userId", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    return res.json(passes);
  } catch (err) {
    next(err);
  }
};

// Admin: Duyệt vé tháng
exports.approve = async (req, res, next) => {
  try {
    const { id } = req.params;

    const pass = await MonthlyPass.findById(id);
    if (!pass) {
      return res.status(404).json({ message: "Không tìm thấy vé tháng" });
    }

    if (pass.status !== "pending") {
      return res.status(400).json({ message: "Vé không ở trạng thái chờ duyệt" });
    }

    pass.status = "approved";
    pass.approvedBy = req.user.id;
    pass.approvedAt = new Date();
    await pass.save();

    return res.json({ message: "Đã duyệt vé tháng", pass });
  } catch (err) {
    next(err);
  }
};

// Admin: Từ chối vé tháng
exports.reject = async (req, res, next) => {
  try {
    const { id } = req.params;

    const pass = await MonthlyPass.findById(id);
    if (!pass) {
      return res.status(404).json({ message: "Không tìm thấy vé tháng" });
    }

    if (pass.status !== "pending") {
      return res.status(400).json({ message: "Vé không ở trạng thái chờ duyệt" });
    }

    pass.status = "rejected";
    pass.approvedBy = req.user.id;
    pass.approvedAt = new Date();
    await pass.save();

    return res.json({ message: "Đã từ chối vé tháng", pass });
  } catch (err) {
    next(err);
  }
};

// Admin: Thêm vé tháng thủ công
exports.createManual = async (req, res, next) => {
  try {
    const { vehicleId, months = 1 } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(400).json({ message: "Phương tiện không tồn tại" });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    const pricePerMonth = 500000;
    const price = pricePerMonth * months;

    const pass = await MonthlyPass.create({
      vehicleId,
      userId: vehicle.ownerId || req.user.id,
      startDate,
      endDate,
      price,
      status: "approved",
      approvedBy: req.user.id,
      approvedAt: new Date(),
    });

    return res.status(201).json({ message: "Đã tạo vé tháng", pass });
  } catch (err) {
    next(err);
  }
};

// Admin: Gia hạn vé tháng
exports.extend = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { months = 1 } = req.body;

    const pass = await MonthlyPass.findById(id);
    if (!pass) {
      return res.status(404).json({ message: "Không tìm thấy vé tháng" });
    }

    // Gia hạn từ ngày hết hạn cũ hoặc từ hôm nay nếu đã hết
    const now = new Date();
    const newStart = pass.endDate > now ? pass.endDate : now;
    const newEnd = new Date(newStart);
    newEnd.setMonth(newEnd.getMonth() + months);

    const pricePerMonth = 500000;
    const additionalPrice = pricePerMonth * months;

    pass.endDate = newEnd;
    pass.price += additionalPrice;
    pass.status = "approved";
    await pass.save();

    return res.json({ message: "Đã gia hạn vé tháng", pass });
  } catch (err) {
    next(err);
  }
};

