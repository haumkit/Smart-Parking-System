const Vehicle = require("../models/Vehicle");
const ParkingRecord = require("../models/ParkingRecord");
const MonthlyPass = require("../models/MonthlyPass");
const { callAIService } = require("./ai.service");

let HOURLY_RATE = parseFloat(process.env.PARKING_HOURLY_RATE) || 5000;

// Kiểm tra xe có vé tháng còn hạn không
async function checkValidMonthlyPass(vehicleId) {
  const now = new Date();
  const pass = await MonthlyPass.findOne({
    vehicleId,
    status: "approved",
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
  return !!pass;
} 

function formatVietnamTime(date) {
  if (!date) return null;
  const vnDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
  return vnDate.toISOString().replace('Z', '+07:00');
}

function calculateFee(entryTime, exitTime, hourlyRate) {
  // Nếu không có hourlyRate, dùng giá hiện tại (fallback cho record cũ)
  const rate = hourlyRate || HOURLY_RATE;
  const durationMs = exitTime.getTime() - entryTime.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  const durationHours = Math.ceil(durationMinutes / 60);
  const billableHours = Math.max(1, durationHours);
  const fee = billableHours * rate;

  return {
    durationHours,
    durationMinutes,
    fee: Math.round(fee),
  };
}

/**
 * @param {string} imagePath 
 * @param {string|Date} entryTime 
 * @returns {Promise<{plateNumber: string, vehicleId: string, registeredTime: Date, confidence?: number}>}
 */
async function walkInEntry(imagePath) {
  const aiResult = await callAIService("plate", imagePath);
  
  if (!aiResult.success || !aiResult.data?.plateNumber) {
    throw new Error("Không tìm thấy biển số từ ảnh");
  }

  const plateNumber = aiResult.data.plateNumber;
  
  const entryTime = new Date();

  // Upsert Vehicle
  const vehicle = await Vehicle.findOneAndUpdate(
    { plateNumber },
    { 
      plateNumber,
      registeredTime: entryTime 
    },
    { 
      upsert: true, 
      new: true, 
      setDefaultsOnInsert: true 
    }
  );

  const existingOpenRecord = await ParkingRecord.findOne({
    vehicleId: vehicle._id,
    exitTime: null,
  });

  if (existingOpenRecord) {
    throw new Error(`Xe ${plateNumber} đã có trong bãi.`);
  }

  // Check vé tháng
  const hasMonthlyPass = await checkValidMonthlyPass(vehicle._id);

  const record = await ParkingRecord.create({
    vehicleId: vehicle._id,
    entryTime: entryTime,
    exitTime: null,
    fee: 0,
    hourlyRate: HOURLY_RATE,
    hasMonthlyPass,
    slotId: null,
  });

  return {
    plateNumber: vehicle.plateNumber,
    vehicleId: vehicle._id.toString(),
    recordId: record._id.toString(),
    entryTime: record.entryTime,
    entryTimeVN: formatVietnamTime(record.entryTime),
    confidence: aiResult.data.confidence ?? null,
    hasMonthlyPass,
  };
}

/**
 * @param {string} imagePath - Đường dẫn ảnh đã tải lên
 * @returns {Promise<{plateNumber: string, recordId: string, entryTime: Date, exitTime: Date, durationHours: number, durationMinutes: number, fee: number}>}
 */
async function walkInExit(imagePath) {
  const aiResult = await callAIService("plate", imagePath);
  
  if (!aiResult.success || !aiResult.data?.plateNumber) {
    throw new Error("Không tìm thấy biển số từ ảnh");
  }

  const plateNumber = aiResult.data.plateNumber;

  const vehicle = await Vehicle.findOne({ plateNumber });
  if (!vehicle) {
    throw new Error(`Không tìm thấy xe: ${plateNumber}`);
  }


  const record = await ParkingRecord.findOne({
    vehicleId: vehicle._id,
    exitTime: null,
  }).sort({ entryTime: -1 }); 

  if (!record) {
    throw new Error(`Không tìm thấy xe ra: ${plateNumber}`);
  }

  const exitTime = new Date();
  record.exitTime = exitTime;
  
  // Nếu có vé tháng (check lúc vào) thì miễn phí
  let fee = 0;
  let feeCalculation = { durationHours: 0, durationMinutes: 0, fee: 0 };
  
  if (!record.hasMonthlyPass) {
    feeCalculation = calculateFee(record.entryTime, exitTime, record.hourlyRate);
    fee = feeCalculation.fee;
  } else {
    const durationMs = exitTime.getTime() - record.entryTime.getTime();
    feeCalculation.durationMinutes = Math.floor(durationMs / (1000 * 60));
    feeCalculation.durationHours = Math.ceil(feeCalculation.durationMinutes / 60);
  }
  
  record.fee = fee;
  await record.save();

  return {
    plateNumber: vehicle.plateNumber,
    recordId: record._id.toString(),
    entryTime: record.entryTime,
    exitTime: record.exitTime,
    durationHours: feeCalculation.durationHours,
    durationMinutes: feeCalculation.durationMinutes,
    fee: record.fee,
    hourlyRate: record.hourlyRate,
    hasMonthlyPass: record.hasMonthlyPass,
  };
}

/**
 * @param {string} plateNumber 
 * @returns {Promise<{plateNumber: string, vehicleId: string, recordId: string, entryTime: Date, entryTimeVN: string}>}
 */
async function walkInEntryByPlate(plateNumber) {
  if (!plateNumber || !plateNumber.trim()) {
    throw new Error("Biển số là bắt buộc");
  }

  const normalizedPlate = plateNumber.trim().toUpperCase();
  const entryTime = new Date();

  const vehicle = await Vehicle.findOneAndUpdate(
    { plateNumber: normalizedPlate },
    { 
      plateNumber: normalizedPlate,
      registeredTime: entryTime 
    },
    { 
      upsert: true, 
      new: true, 
      setDefaultsOnInsert: true 
    }
  );

  const existingOpenRecord = await ParkingRecord.findOne({
    vehicleId: vehicle._id,
    exitTime: null,
  });

  if (existingOpenRecord) {
    throw new Error(`Xe ${normalizedPlate} đã có trong bãi.`);
  }

  // Check vé tháng
  const hasMonthlyPass = await checkValidMonthlyPass(vehicle._id);

  const record = await ParkingRecord.create({
    vehicleId: vehicle._id,
    entryTime: entryTime,
    exitTime: null,
    fee: 0,
    hourlyRate: HOURLY_RATE,
    hasMonthlyPass,
    slotId: null,
  });

  return {
    plateNumber: vehicle.plateNumber,
    vehicleId: vehicle._id.toString(),
    recordId: record._id.toString(),
    entryTime: record.entryTime,
    entryTimeVN: formatVietnamTime(record.entryTime),
    hourlyRate: record.hourlyRate,
    hasMonthlyPass,
  };
}

/**
 * @param {string} plateNumber 
 * @returns {Promise<{plateNumber: string, recordId: string, entryTime: Date, exitTime: Date, durationHours: number, durationMinutes: number, fee: number}>}
 */
async function walkInExitByPlate(plateNumber) {
  if (!plateNumber || !plateNumber.trim()) {
    throw new Error("Biển số là bắt buộc");
  }

  const normalizedPlate = plateNumber.trim().toUpperCase();

  const vehicle = await Vehicle.findOne({ plateNumber: normalizedPlate });
  if (!vehicle) {
    throw new Error(`Không tìm thấy xe: ${normalizedPlate}`);
  }

  const record = await ParkingRecord.findOne({
    vehicleId: vehicle._id,
    exitTime: null,
  }).sort({ entryTime: -1 }); 

  if (!record) {
    throw new Error(`Không tìm thấy xe ${normalizedPlate} trong bãi`);
  }

  const exitTime = new Date();
  record.exitTime = exitTime;
  
  // Nếu có vé tháng (check lúc vào) thì miễn phí
  let fee = 0;
  let feeCalculation = { durationHours: 0, durationMinutes: 0, fee: 0 };
  
  if (!record.hasMonthlyPass) {
    // Nếu record không có hourlyRate (record cũ), dùng giá hiện tại
    const hourlyRateToUse = record.hourlyRate || HOURLY_RATE;
    feeCalculation = calculateFee(record.entryTime, exitTime, hourlyRateToUse);
    fee = feeCalculation.fee;
  } else {
    // Vẫn tính thời gian để hiển thị
    const durationMs = exitTime.getTime() - record.entryTime.getTime();
    feeCalculation.durationMinutes = Math.floor(durationMs / (1000 * 60));
    feeCalculation.durationHours = Math.ceil(feeCalculation.durationMinutes / 60);
  }
  
  record.fee = fee;
  await record.save();

  return {
    plateNumber: vehicle.plateNumber,
    recordId: record._id.toString(),
    entryTime: record.entryTime,
    exitTime: record.exitTime,
    durationHours: feeCalculation.durationHours,
    durationMinutes: feeCalculation.durationMinutes,
    fee: record.fee,
    hourlyRate: record.hourlyRate || HOURLY_RATE,
    hasMonthlyPass: record.hasMonthlyPass,
  };
}

function getHourlyRate() {
  return HOURLY_RATE;
}

function setHourlyRate(rate) {
  if (rate < 0) throw new Error("Rate must be non-negative");
  HOURLY_RATE = rate;
  return HOURLY_RATE;
}

module.exports = {
  walkInEntry,
  walkInExit,
  walkInEntryByPlate,
  walkInExitByPlate,
  getHourlyRate,
  setHourlyRate,
  formatVietnamTime,
};

