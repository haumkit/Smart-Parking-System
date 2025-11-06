const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema(
  {
    plateNumber: { type: String, required: true, unique: true, index: true },
    registeredTime: { type: Date, required: true },

    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", VehicleSchema);


