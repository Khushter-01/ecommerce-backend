const express = require("express");
const router = express.Router();

const {
  getDashboard,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAnalytics,
  getOrderStats,
  getTopProducts

} = require("../controllers/adminController");

const { protect, adminOnly } = require("../middleware/auth");

router.use(protect, adminOnly);

router.get("/dashboard", getDashboard);
router.get("/users", getAllUsers);
router.put("/users/:id", updateUserRole);
router.delete("/users/:id", deleteUser);
router.get("/analytics", getAnalytics);
router.get("/order-stats", getOrderStats);
router.get("/top-products", getTopProducts);

module.exports = router;