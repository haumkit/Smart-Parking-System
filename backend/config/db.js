const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || "mongodb+srv://huvdev:30122003@cluster0.cncfxde.mongodb.net/smart_parking?retryWrites=true&w=majority";
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri, {
    autoIndex: true,
  });
  console.log("MongoDB connected");
}

module.exports = connectDB;


