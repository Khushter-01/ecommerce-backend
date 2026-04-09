require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");
};

const seed = async () => {
  await connectDB();

  // Dynamically load model after connection
  const User = require("./src/models/User");

  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin) {
    console.log("⚠️  Admin already exists:", existingAdmin.email);
    process.exit(0);
  }

  const admin = await User.create({
    name: "Admin",
    email: "admin@example.com",
    password: "admin123456",
    role: "admin",
  });

  console.log("✅ Admin created successfully!");
  console.log("   Email   :", admin.email);
  console.log("   Password: admin123456");
  console.log("   ⚠️  Change the password after first login!\n");

  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seed error:", err.message);
  process.exit(1);
});
