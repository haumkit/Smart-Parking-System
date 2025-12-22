const ParkingRecord = require("../models/ParkingRecord");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

exports.stats = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(0);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);
    const match = { createdAt: { $gte: start, $lte: end } };
    const agg = await ParkingRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
          revenue: { $sum: "$fee" },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
    ]);
    res.json({ items: agg });
  } catch (err) {
    next(err);
  }
};

exports.exportStatsExcel = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(0);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const match = { createdAt: { $gte: start, $lte: end } };
    const agg = await ParkingRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
          revenue: { $sum: "$fee" },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
    ]);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Stats by Day");
    ws.addRow(["Ngày", "Số lượt xe", "Doanh thu"]);
    agg.forEach((it) => {
      const y = it._id.y;
      const m = String(it._id.m).padStart(2, "0");
      const d = String(it._id.d).padStart(2, "0");
      ws.addRow([`${d}/${m}/${y}`, it.count || 0, it.revenue || 0]);
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=parking_stats.xlsx");
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

exports.exportStatsPdf = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(0);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const match = { createdAt: { $gte: start, $lte: end } };
    const agg = await ParkingRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
          revenue: { $sum: "$fee" },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
    ]);

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=parking_stats.pdf");
    doc.pipe(res);
    doc.fontSize(18).text("Parking Stats Report", { align: "center" });
    doc.moveDown();
    agg.forEach((it) => {
      const y = it._id.y;
      const m = String(it._id.m).padStart(2, "0");
      const d = String(it._id.d).padStart(2, "0");
      doc.fontSize(12).text(`Ngày ${d}/${m}/${y} - Số lượt: ${it.count || 0} - Doanh thu: ${it.revenue || 0}`).moveDown(0.5);
    });
    doc.end();
  } catch (err) {
    next(err);
  }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(0);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);
    // Chỉ xuất các lượt đã hoàn thành (có exitTime)
    const records = await ParkingRecord.find({
      createdAt: { $gte: start, $lte: end },
      exitTime: { $ne: null },
      isDeleted: { $ne: true },
    })
      .populate("vehicleId")
      .sort({ createdAt: -1 });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Parking Records");
    ws.addRow(["Biển số", "Thời gian vào", "Thời gian ra", "Thời gian gửi", "Giá (1 giờ)", "Tổng tiền"]);
    records.forEach((r) => {
      const entry = r.entryTime ? new Date(r.entryTime) : null;
      const exit = r.exitTime ? new Date(r.exitTime) : null;
      let durationMinutes = null;
      if (entry && exit) {
        durationMinutes = Math.max(0, Math.round((exit.getTime() - entry.getTime()) / 60000));
      }
      const hours = durationMinutes != null ? Math.floor(durationMinutes / 60) : 0;
      const minutes = durationMinutes != null ? durationMinutes % 60 : 0;
      const durationStr =
        durationMinutes != null
          ? hours > 0
            ? `${hours} giờ ${minutes} phút`
            : `${minutes} phút`
          : "";
      ws.addRow([
        (r.plateNumber || r.vehicleId?.plateNumber) ?? "",
        entry ? entry.toLocaleString("vi-VN") : "",
        exit ? exit.toLocaleString("vi-VN") : "",
        durationStr,
        r.hourlyRate != null ? r.hourlyRate : "",
        r.fee != null ? r.fee : "",
      ]);
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=parking_records.xlsx");
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

exports.exportPdf = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(0);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);
    const records = await ParkingRecord.find({
      createdAt: { $gte: start, $lte: end },
      exitTime: { $ne: null },
      isDeleted: { $ne: true },
    })
      .populate("vehicleId")
      .sort({ createdAt: -1 });

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=parking_records.pdf");
    doc.pipe(res);
    doc.fontSize(18).text("Parking Records Report", { align: "center" });
    doc.moveDown();
    records.forEach((r) => {
      const entry = r.entryTime ? new Date(r.entryTime) : null;
      const exit = r.exitTime ? new Date(r.exitTime) : null;
      let durationMinutes = null;
      if (entry && exit) {
        durationMinutes = Math.max(0, Math.round((exit.getTime() - entry.getTime()) / 60000));
      }
      const hours = durationMinutes != null ? Math.floor(durationMinutes / 60) : 0;
      const minutes = durationMinutes != null ? durationMinutes % 60 : 0;
      const durationStr =
        durationMinutes != null
          ? hours > 0
            ? `${hours} giờ ${minutes} phút`
            : `${minutes} phút`
          : "";
      doc
        .fontSize(12)
        .text(
          `Biển số: ${(r.plateNumber || r.vehicleId?.plateNumber) ?? ""} | Vào: ${entry ? entry.toLocaleString("vi-VN") : ""} | Ra: ${
            exit ? exit.toLocaleString("vi-VN") : ""
          } | Thời gian gửi: ${durationStr} | Giá (1h): ${r.hourlyRate ?? ""} | Tổng tiền: ${r.fee ?? ""}`
        )
        .moveDown(0.5);
    });
    doc.end();
  } catch (err) {
    next(err);
  }
};


