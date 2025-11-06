const mongoose = require("mongoose");

const ParkingSlotSchema = new mongoose.Schema(
  {
    slotNum: { 
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    
    code: { 
      type: String,
      index: true
    },
    
    status: { 
      type: String, 
      enum: ["available", "occupied"], 
      default: "available",
      index: true
    },

    vehicleId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Vehicle", 
      default: null 
    },
  },
  { timestamps: true }
);

ParkingSlotSchema.pre('save', function(next) {
  if (!this.code && this.slotNum) {
    this.code = this.slotNum.toString();
  }
  next();
});

module.exports = mongoose.model("ParkingSlot", ParkingSlotSchema);


