const express = require("express");
const router = express.Router();
const { getDashboard, getAllUsers, updateUserRole, deleteUser } = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/auth");

router.use(protect, adminOnly); // All admin routes require auth + admin role

router.get("/dashboard", getDashboard);
router.get("/users", getAllUsers);
router.put("/users/:id", updateUserRole);
router.delete("/users/:id", deleteUser);

module.exports = router;
