require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const fs = require("fs");
const path = require("path");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`\n📋 API Endpoints:`);
    console.log(`   Auth    → http://localhost:${PORT}/api/auth`);
    console.log(`   Products→ http://localhost:${PORT}/api/products`);
    console.log(`   Cart    → http://localhost:${PORT}/api/cart`);
    console.log(`   Orders  → http://localhost:${PORT}/api/orders`);
    console.log(`   Admin   → http://localhost:${PORT}/api/admin`);
    console.log(`   Health  → http://localhost:${PORT}/api/health\n`);
  });
};

startServer();
