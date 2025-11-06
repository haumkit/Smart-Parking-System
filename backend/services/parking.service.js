const Vehicle = require("../models/Vehicle");
const ParkingRecord = require("../models/ParkingRecord");
const { callAIService } = require("./ai.service");

const HOURLY_RATE = parseFloat(process.env.PARKING_HOURLY_RATE) || 10000; 

function formatVietnamTime(date) {
  if (!date) return null;
  const vnDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
  return vnDate.toISOString().replace('Z', '+07:00');
}

function calculateFee(entryTime, exitTime) {
  const durationMs = exitTime.getTime() - entryTime.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  const durationHours = Math.ceil(durationMinutes / 60);
  const billableHours = Math.max(1, durationHours);
  const fee = billableHours * HOURLY_RATE;

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
    throw new Error("Plate not detected from image");
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
    throw new Error(`Vehicle with plate ${plateNumber} is already in parking.`);
  }

  const record = await ParkingRecord.create({
    vehicleId: vehicle._id,
    entryTime: entryTime,
    exitTime: null,
    fee: 0,
    slotId: null,
  });

  return {
    plateNumber: vehicle.plateNumber,
    vehicleId: vehicle._id.toString(),
    recordId: record._id.toString(),
    entryTime: record.entryTime,
    entryTimeVN: formatVietnamTime(record.entryTime),
    confidence: aiResult.data.confidence ?? null,
  };
}

/**
 * @param {string} imagePath - Path to uploaded image file
 * @returns {Promise<{plateNumber: string, recordId: string, entryTime: Date, exitTime: Date, durationHours: number, durationMinutes: number, fee: number}>}
 */
async function walkInExit(imagePath) {
  const aiResult = await callAIService("plate", imagePath);
  
  if (!aiResult.success || !aiResult.data?.plateNumber) {
    throw new Error("Plate not detected from image");
  }

  const plateNumber = aiResult.data.plateNumber;

  const vehicle = await Vehicle.findOne({ plateNumber });
  if (!vehicle) {
    throw new Error(`Vehicle not found for plate: ${plateNumber}`);
  }


  const record = await ParkingRecord.findOne({
    vehicleId: vehicle._id,
    exitTime: null,
  }).sort({ entryTime: -1 }); 

  if (!record) {
    throw new Error(`No open parking record found for plate: ${plateNumber}`);
  }

  const exitTime = new Date();
  record.exitTime = exitTime;
  
  const feeCalculation = calculateFee(record.entryTime, exitTime);
  record.fee = feeCalculation.fee;
  
  await record.save();

  return {
    plateNumber: vehicle.plateNumber,
    recordId: record._id.toString(),
    entryTime: record.entryTime,
    exitTime: record.exitTime,
    durationHours: feeCalculation.durationHours,
    durationMinutes: feeCalculation.durationMinutes,
    fee: record.fee,
  };
}

module.exports = {
  walkInEntry,
  walkInExit,
  formatVietnamTime,
};

