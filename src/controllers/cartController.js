const Cart = require("../models/Cart");
const Product = require("../models/Product");

// 🔧 Helper: calculate total
const calculateTotal = (items) => {
  return items.reduce((acc, item) => {
    return acc + item.price * item.quantity;
  }, 0);
};

// @route GET /api/cart
const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product",
      "name images price stock isActive",
    );

    if (!cart) {
      return res.json({
        success: true,
        cart: { items: [], totalPrice: 0 },
      });
    }

    // ✅ Remove invalid products
    cart.items = cart.items.filter((item) => item.product);

    const totalPrice = calculateTotal(cart.items);

    res.json({
      success: true,
      cart: { ...cart.toObject(), totalPrice },
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/cart
const addToCart = async (req, res, next) => {
  try {
    let { productId, quantity = 1 } = req.body;

    quantity = Number(quantity); // ✅ FIX

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    const product = await Product.findById(productId);

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock",
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const index = cart.items.findIndex(
      (i) => i.product.toString() === productId,
    );

    const price =
      product.discountPrice > 0 ? product.discountPrice : product.price;

    if (index > -1) {
      cart.items[index].quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        price,
      });
    }

    await cart.save();

    await cart.populate("items.product", "name images price stock");

    const totalPrice = calculateTotal(cart.items);

    res.json({
      success: true,
      message: "Item added to cart",
      cart: { ...cart.toObject(), totalPrice },
    });
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/cart/:productId
const updateCartItem = async (req, res, next) => {
  try {
    let { quantity } = req.body;
    quantity = Number(quantity); // ✅ FIX

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const index = cart.items.findIndex(
      (i) => i.product.toString() === req.params.productId,
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not in cart",
      });
    }

    if (quantity <= 0) {
      cart.items.splice(index, 1);
    } else {
      cart.items[index].quantity = quantity;
    }

    await cart.save();

    await cart.populate("items.product", "name images price stock");

    const totalPrice = calculateTotal(cart.items);

    res.json({
      success: true,
      message: "Cart updated",
      cart: { ...cart.toObject(), totalPrice },
    });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/cart/:productId
const removeFromCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = cart.items.filter(
      (i) => i.product.toString() !== req.params.productId,
    );

    await cart.save();

    await cart.populate("items.product", "name images price stock");

    const totalPrice = calculateTotal(cart.items);

    res.json({
      success: true,
      message: "Item removed",
      cart: { ...cart.toObject(), totalPrice },
    });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/cart
const clearCart = async (req, res, next) => {
  try {
    await Cart.findOneAndDelete({ user: req.user._id });

    res.json({
      success: true,
      message: "Cart cleared",
      cart: { items: [], totalPrice: 0 },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};
