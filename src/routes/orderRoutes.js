const express = require("express");
const router = express.Router();
const {
  createRazorpayOrder,
  verifyPayment,
  getMyOrders,
  getOrder,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect); // All order routes require auth

// User routes
router.post("/create-razorpay-order", createRazorpayOrder);
router.post("/verify-payment", verifyPayment);
router.get("/my-orders", getMyOrders);
router.get("/:id", getOrder);

// Admin routes
router.get("/", protect, adminOnly, getAllOrders);
router.put("/:id/status", protect, adminOnly, updateOrderStatus);

module.exports = router;
