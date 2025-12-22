const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema(
  {
    plateNumber: { type: String, required: true, unique: true, index: true },
    registeredTime: { type: Date, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", VehicleSchema);


