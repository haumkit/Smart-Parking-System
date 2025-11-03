const ParkingRecord = require("../models/ParkingRecord");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

exports.stats = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(0);
    const end = to ? new Date(to) : new Date();
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

exports.exportExcel = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(0);
    const end = to ? new Date(to) : new Date();
    const records = await ParkingRecord.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Parking Records");
    ws.addRow(["Vehicle", "Slot", "Entry", "Exit", "Fee"]);
    records.forEach((r) => {
      ws.addRow([
        r.vehicleId?.toString() || "",
        r.slotId?.toString() || "",
        r.entryTime,
        r.exitTime || "",
        r.fee,
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
    const records = await ParkingRecord.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 });

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=parking_records.pdf");
    doc.pipe(res);
    doc.fontSize(18).text("Parking Records Report", { align: "center" });
    doc.moveDown();
    records.forEach((r) => {
      doc.fontSize(12).text(`Vehicle: ${r.vehicleId} Slot: ${r.slotId} Entry: ${r.entryTime} Exit: ${r.exitTime || ""} Fee: ${r.fee}`);
    });
    doc.end();
  } catch (err) {
    next(err);
  }
};


