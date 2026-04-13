const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// @route   POST /api/orders/create-razorpay-order
const createRazorpayOrder = async (req, res, next) => {
  try {
    const {
      orderItems,
      shippingAddress,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
    } = req.body;

    // ✅ Validate & FIX order items
    const formattedItems = [];

    for (const item of orderItems) {
      const product = await Product.findById(item.product);

      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product "${item.name}" unavailable`,
        });
      }

      if (product.stock < (item.quantity || 1)) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${item.name}"`,
        });
      }

      formattedItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0]?.url || product.images?.[0] || "", // ✅ FIX IMAGE
        price:
          product.discountPrice > 0 ? product.discountPrice : product.price,
        quantity: item.quantity || 1, // ✅ DEFAULT TO 1
      });
    }

    // Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalPrice * 100),
      currency: "INR",
      receipt: `order_${Date.now()}`,
    });

    // Save order
    const order = await Order.create({
      user: req.user._id,
      orderItems: formattedItems,
      shippingAddress,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      paymentInfo: {
        razorpayOrderId: razorpayOrder.id,
        status: "pending",
      },
    });

    res.status(201).json({
      success: true,
      order,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/orders/verify-payment
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } =
      req.body;

    const body = razorpayOrderId + "|" + razorpayPaymentId;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    const order = await Order.findById(orderId);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    order.paymentInfo = {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      status: "paid",
      paidAt: new Date(),
    };

    order.orderStatus = "processing";

    // ✅ Reduce stock
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    await order.save();

    // ✅ CLEAR CART (FIXED ISSUE)
    await Cart.findOneAndDelete({ user: req.user._id });

    res.json({
      success: true,
      message: "Payment verified & order confirmed",
      order,
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/orders/my-orders
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("orderItems.product", "name images")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/orders/:id
const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("orderItems.product", "name images");

    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// Admin APIs unchanged
const getAllOrders = async (req, res, next) => {
  /* same */
};
const updateOrderStatus = async (req, res, next) => {
  /* same */
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  getMyOrders,
  getOrder,
  getAllOrders,
  updateOrderStatus,
};
