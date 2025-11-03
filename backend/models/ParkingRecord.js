const mongoose = require("mongoose");

const ParkingRecordSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: "ParkingSlot" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    entryTime: { type: Date, required: true },
    exitTime: { type: Date },
    fee: { type: Number, default: 0 },
    pricingMode: { type: String, enum: ["per_hour", "per_30min"], default: "per_hour" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ParkingRecord", ParkingRecordSchema);


