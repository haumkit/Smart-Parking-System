const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const connectDB = require("../config/db");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const MonthlyPass = require("../models/MonthlyPass");
const ParkingRecord = require("../models/ParkingRecord");
const ParkingSlot = require("../models/ParkingSlot");

// Tạo dữ liệu demo
async function seedDemoData() {
  try {
    console.log("Connecting to MongoDB...");
    console.log("MongoDB URI:", process.env.MONGODB_URI ? "Set in .env" : "Using default from config");
    await connectDB();
    console.log("MongoDB connected successfully!");

    // Xóa dữ liệu cũ (tùy chọn - comment nếu muốn giữ lại)
    /* console.log("Cleaning old data...");
    await ParkingRecord.deleteMany({});
    await MonthlyPass.deleteMany({});
    await Vehicle.deleteMany({}); */
    // Không xóa User để giữ admin account

    // Tạo hoặc lấy admin user
    let adminUser = await User.findOne({ email: "admin@example.com" });
    if (!adminUser) {
      adminUser = await User.create({
        name: "Admin Demo",
        email: "admin@example.com",
        password: "123456", // Sẽ được hash tự động
        role: "admin",
      });
      console.log("Created admin user:", adminUser.email);
    } else {
      console.log("Admin user already exists:", adminUser.email);
    }

    // Lấy hoặc tạo user demo
    let demoUser = await User.findOne({ email: "demo@example.com" });
    if (!demoUser) {
      demoUser = await User.create({
        name: "Nguyễn Văn Demo",
        email: "demo@example.com",
        password: "123456", // Sẽ được hash tự động
        role: "user",
      });
      console.log("Created demo user:", demoUser.email);
    }

    let demoUser2 = await User.findOne({ email: "user2@example.com" });
    if (!demoUser2) {
      demoUser2 = await User.create({
        name: "Trần Thị Demo",
        email: "user2@example.com",
        password: "123456",
        role: "user",
      });
      console.log("Created demo user 2:", demoUser2.email);
    }

    // Tạo danh sách biển số mẫu
    const plateNumbers = [
      "30A12345", "29B67890", "51C11111", "43D22222", "30E33333",
      "29F44444", "51G55555", "43H66666", "30A77777", "29B88888",
      "30A99999", "29B00000", "51C22222", "43D33333", "30E44444",
    ];

    // Tạo vehicles với các trạng thái khác nhau
    console.log("Creating vehicles...");
    const vehicles = [];
    
    // 55 xe đã được duyệt (approved)
    for (let i = 0; i < 5; i++) {
      const plate = plateNumbers[i];
      const owner = i < 5 ? demoUser : demoUser2;
      
      const vehicle = await Vehicle.create({
        plateNumber: plate,
        registeredTime: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        ownerId: owner._id,
        status: "approved",
        approvedBy: adminUser?._id || null,
        approvedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
      vehicles.push(vehicle);
    }
    
    // 3 xe đang chờ duyệt (pending)
    for (let i = 5; i < 13; i++) {
      const plate = plateNumbers[i];
      const owner = i < 12 ? demoUser : demoUser2;
      
      const vehicle = await Vehicle.create({
        plateNumber: plate,
        registeredTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Trong 7 ngày qua
        ownerId: owner._id,
        status: "pending",
        approvedBy: null,
        approvedAt: null,
      });
      vehicles.push(vehicle);
    }
    
    // 2 xe bị từ chối (rejected)
    for (let i = 13; i < 15; i++) {
      const plate = plateNumbers[i];
      const owner = i < 14 ? demoUser : demoUser2;
      
      const vehicle = await Vehicle.create({
        plateNumber: plate,
        registeredTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        ownerId: owner._id,
        status: "rejected",
        approvedBy: adminUser?._id || null,
        approvedAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
      });
      vehicles.push(vehicle);
    }
    
    console.log(`Created ${vehicles.length} vehicles`);
    console.log(`  - Approved: ${vehicles.filter(v => v.status === "approved").length}`);
    console.log(`  - Pending: ${vehicles.filter(v => v.status === "pending").length}`);
    console.log(`  - Rejected: ${vehicles.filter(v => v.status === "rejected").length}`);

    // Tạo vé tháng với các trạng thái khác nhau
    console.log("Creating monthly passes...");
    const now = new Date();
    const monthlyPasses = [];
    
    // Chỉ lấy các xe đã được approved để tạo vé tháng
    const approvedVehicles = vehicles.filter(v => v.status === "approved");
    
    // 3 vé tháng đang hoạt động (approved, còn hạn)
    for (let i = 0; i < 3 && i < approvedVehicles.length; i++) {
      const vehicle = approvedVehicles[i];
      const startDate = new Date(now);
      startDate.setDate(1); // Ngày đầu tháng
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1); // Tháng sau
      
      const pass = await MonthlyPass.create({
        vehicleId: vehicle._id,
        userId: vehicle.ownerId,
        startDate,
        endDate,
        status: "approved",
        price: 500000,
        approvedBy: adminUser?._id || null,
        approvedAt: new Date(startDate.getTime() - 2 * 24 * 60 * 60 * 1000), // Duyệt trước 2 ngày
      });
      monthlyPasses.push(pass);
    }

    // 1 vé tháng đã hết hạn (expired)
    if (approvedVehicles.length > 3) {
      const expiredStart = new Date(now);
      expiredStart.setMonth(expiredStart.getMonth() - 2);
      expiredStart.setDate(1);
      const expiredEnd = new Date(expiredStart);
      expiredEnd.setMonth(expiredEnd.getMonth() + 1);
      
      const expiredPass = await MonthlyPass.create({
        vehicleId: approvedVehicles[3]._id,
        userId: approvedVehicles[3].ownerId,
        startDate: expiredStart,
        endDate: expiredEnd,
        status: "expired",
        price: 500000,
        approvedBy: adminUser?._id || null,
        approvedAt: new Date(expiredStart.getTime() - 2 * 24 * 60 * 60 * 1000),
      });
      monthlyPasses.push(expiredPass);
    }

    // 2 vé tháng đang chờ duyệt (pending)
    for (let i = 4; i < 6 && i < approvedVehicles.length; i++) {
      const vehicle = approvedVehicles[i];
      const startDate = new Date(now);
      startDate.setDate(1);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      const pass = await MonthlyPass.create({
        vehicleId: vehicle._id,
        userId: vehicle.ownerId,
        startDate,
        endDate,
        status: "pending",
        price: 500000,
        approvedBy: null,
        approvedAt: null,
      });
      monthlyPasses.push(pass);
    }

    // 1 vé tháng bị từ chối (rejected)
    if (approvedVehicles.length > 6) {
      const rejectedStart = new Date(now);
      rejectedStart.setMonth(rejectedStart.getMonth() - 1);
      rejectedStart.setDate(1);
      const rejectedEnd = new Date(rejectedStart);
      rejectedEnd.setMonth(rejectedEnd.getMonth() + 1);
      
      const rejectedPass = await MonthlyPass.create({
        vehicleId: approvedVehicles[6]._id,
        userId: approvedVehicles[6].ownerId,
        startDate: rejectedStart,
        endDate: rejectedEnd,
        status: "rejected",
        price: 500000,
        approvedBy: adminUser?._id || null,
        approvedAt: new Date(rejectedStart.getTime() - 3 * 24 * 60 * 60 * 1000),
      });
      monthlyPasses.push(rejectedPass);
    }

    console.log(`Created ${monthlyPasses.length} monthly passes`);
    console.log(`  - Approved (active): ${monthlyPasses.filter(p => p.status === "approved" && p.endDate >= now).length}`);
    console.log(`  - Expired: ${monthlyPasses.filter(p => p.status === "expired").length}`);
    console.log(`  - Pending: ${monthlyPasses.filter(p => p.status === "pending").length}`);
    console.log(`  - Rejected: ${monthlyPasses.filter(p => p.status === "rejected").length}`);

    // Tạo lịch sử gửi xe
    console.log("Creating parking records...");
    const records = [];

    // Lấy danh sách slot có sẵn (nếu có)
    const slots = await ParkingSlot.find({}).limit(15);

    // Tạo 30 bản ghi lịch sử trong 30 ngày qua
    // Chỉ dùng các xe đã được approved để tạo lịch sử
    const approvedVehiclesForHistory = vehicles.filter(v => v.status === "approved");
    
    for (let i = 0; i < 30; i++) {
      const vehicle = approvedVehiclesForHistory[Math.floor(Math.random() * approvedVehiclesForHistory.length)];
      
      // Kiểm tra xe có vé tháng còn hạn không
      const activePass = monthlyPasses.find(
        (p) => p.vehicleId.toString() === vehicle._id.toString() && 
               p.status === "approved" &&
               p.startDate <= now && 
               p.endDate >= now
      );
      const hasMonthlyPass = !!activePass;

      // Thời gian vào: ngẫu nhiên trong 30 ngày qua
      const entryTime = new Date(now);
      entryTime.setDate(entryTime.getDate() - Math.floor(Math.random() * 30));
      entryTime.setHours(Math.floor(Math.random() * 12) + 6, Math.floor(Math.random() * 60), 0, 0); // 6h-18h

      // 80% có thời gian ra, 20% đang gửi
      const hasExit = Math.random() > 0.2;
      let exitTime = null;
      let fee = 0;
      let durationHours = 0;
      let durationMinutes = 0;

      if (hasExit) {
        // Thời gian ra: sau thời gian vào từ 10 phút đến 8 giờ
        const durationMs = (Math.random() * 8 + 0.17) * 60 * 60 * 1000; // 10 phút đến 8 giờ
        exitTime = new Date(entryTime.getTime() + durationMs);
        
        durationMinutes = Math.floor(durationMs / (1000 * 60));
        durationHours = Math.ceil(durationMinutes / 60);

        // Tính phí (nếu không có vé tháng)
        if (!hasMonthlyPass) {
          const FIRST_HOUR_RATE = 20000;
          const HOURLY_RATE = 5000;
          const FREE_DURATION_MINUTES = 15;

          if (durationMinutes < FREE_DURATION_MINUTES) {
            fee = 0;
          } else if (durationHours <= 1) {
            fee = FIRST_HOUR_RATE;
          } else {
            fee = FIRST_HOUR_RATE + (durationHours - 1) * HOURLY_RATE;
          }
        }
      }

      // Gán slot ngẫu nhiên (nếu có và đã ra)
      let slotId = null;
      if (hasExit && slots.length > 0) {
        slotId = slots[Math.floor(Math.random() * slots.length)]._id;
      }

      const record = await ParkingRecord.create({
        vehicleId: vehicle._id,
        entryTime,
        exitTime,
        fee,
        hourlyRate: hasMonthlyPass ? null : 5000,
        hasMonthlyPass,
        slotId,
      });

      records.push(record);
    }

    console.log(`Created ${records.length} parking records`);
    console.log(`  - Completed: ${records.filter(r => r.exitTime).length}`);
    console.log(`  - Pending: ${records.filter(r => !r.exitTime).length}`);
    console.log(`  - With monthly pass: ${records.filter(r => r.hasMonthlyPass).length}`);

    console.log("\n✅ Demo data created successfully!");
    console.log("\nSummary:");
    console.log(`- Users: ${await User.countDocuments()}`);
    console.log(`  - Admin: ${await User.countDocuments({ role: "admin" })}`);
    console.log(`  - Regular users: ${await User.countDocuments({ role: "user" })}`);
    console.log(`- Vehicles: ${vehicles.length}`);
    console.log(`- Monthly Passes: ${monthlyPasses.length}`);
    console.log(`- Parking Records: ${records.length}`);
    console.log("\n📝 Login credentials:");
    console.log(`  Admin: admin@example.com / 123456`);
    console.log(`  User 1: demo@example.com / 123456`);
    console.log(`  User 2: user2@example.com / 123456`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding demo data:", error);
    process.exit(1);
  }
}

// Chạy script
seedDemoData();

