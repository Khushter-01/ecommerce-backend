const Product = require("../models/Product");

// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      brand,
      minPrice,
      maxPrice,
      search,
      sort,
    } = req.query;

    const query = { isActive: true };

    if (category) query.category = { $regex: category, $options: "i" };
    if (brand) query.brand = { $regex: brand, $options: "i" };
    if (search) query.$text = { $search: search };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      "price-asc": { price: 1 },
      "price-desc": { price: -1 },
      rating: { ratings: -1 },
    };
    const sortBy = sortOptions[sort] || { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      products,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/products/:id
// @access  Public
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "addedBy",
      "name email",
    );
    if (!product || !product.isActive) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/products
// @access  Admin
const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, discountPrice, category, brand, stock } =
      req.body;

    let images = [];

    // If images sent from frontend (URL)
    if (req.body.images && req.body.images.length > 0) {
      images = req.body.images;
    }

    // If files uploaded (override)
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => ({
        url: `/uploads/${file.filename}`,
        alt: name,
      }));
    }

    const product = await Product.create({
      name,
      description,
      price,
      discountPrice,
      category,
      brand,
      stock,
      images,
      addedBy: req.user._id,
    });

    res
      .status(201)
      .json({ success: true, message: "Product created", product });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/products/:id
// @access  Admin
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const updates = req.body;
    if (req.files && req.files.length > 0) {
      updates.images = req.files.map((f) => ({
        url: `/uploads/${f.filename}`,
        alt: updates.name || product.name,
      }));
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, message: "Product updated", product: updated });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/products/:id
// @access  Admin
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    product.isActive = false;
    await product.save();

    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/products/:id/reviews
// @access  Private
const addReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString(),
    );
    if (alreadyReviewed) {
      return res
        .status(400)
        .json({ success: false, message: "You already reviewed this product" });
    }

    product.reviews.push({
      user: req.user._id,
      name: req.user.name,
      rating,
      comment,
    });
    product.numReviews = product.reviews.length;
    product.ratings =
      product.reviews.reduce((acc, r) => acc + r.rating, 0) /
      product.reviews.length;
    await product.save();

    res.status(201).json({ success: true, message: "Review added" });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/products/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct("category", { isActive: true });
    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview,
  getCategories,
};
