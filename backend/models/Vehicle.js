const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema(
  {
    plateNumber: { type: String, required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", VehicleSchema);


