const mongoose = require("mongoose");

const ParkingSlotSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    status: { type: String, enum: ["available", "occupied"], default: "available" },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ParkingSlot", ParkingSlotSchema);


