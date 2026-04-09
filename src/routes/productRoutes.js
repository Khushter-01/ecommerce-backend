const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview,
  getCategories,
} = require("../controllers/productController");
const { protect, adminOnly } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Public routes
router.get("/", getProducts);
router.get("/categories", getCategories);
router.get("/:id", getProduct);

// Private routes
router.post("/:id/reviews", protect, addReview);

// Admin routes
router.post("/", protect, adminOnly, upload.array("images", 5), createProduct);
router.put("/:id", protect, adminOnly, upload.array("images", 5), updateProduct);
router.delete("/:id", protect, adminOnly, deleteProduct);

module.exports = router;
