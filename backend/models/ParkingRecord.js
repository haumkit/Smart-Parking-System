const mongoose = require("mongoose");

const ParkingRecordSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    entryTime: { type: Date, required: true },
    exitTime: { type: Date },
    fee: { type: Number, default: 0 },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: "ParkingSlot", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ParkingRecord", ParkingRecordSchema);


