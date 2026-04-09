const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// @route   POST /api/orders/create-razorpay-order
// @access  Private
const createRazorpayOrder = async (req, res, next) => {
  try {
    const { orderItems, shippingAddress, itemsPrice, shippingPrice, taxPrice, totalPrice } = req.body;

    // Validate stock
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        return res.status(400).json({ success: false, message: `Product "${item.name}" is unavailable` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for "${item.name}"` });
      }
    }

    // Create Razorpay order (amount in paise)
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalPrice * 100),
      currency: "INR",
      receipt: `order_${Date.now()}`,
    });

    // Save order in DB
    const order = await Order.create({
      user: req.user._id,
      orderItems,
      shippingAddress,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      paymentInfo: { razorpayOrderId: razorpayOrder.id, status: "pending" },
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

// @route   POST /api/orders/verify-payment
// @access  Private
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    // Verify signature
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // Update order
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.paymentInfo = {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      status: "paid",
      paidAt: new Date(),
    };
    order.orderStatus = "processing";

    // Decrease stock
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    await order.save();

    // Clear cart
    await Cart.findOneAndDelete({ user: req.user._id });

    res.json({ success: true, message: "Payment verified. Order confirmed!", order });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/orders/my-orders
// @access  Private
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

// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email").populate("orderItems.product", "name images");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Users can only see their own orders; admins see all
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/orders (Admin)
// @access  Admin
const getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = status ? { orderStatus: status } : {};
    const skip = (Number(page) - 1) * Number(limit);

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), pages: Math.ceil(total / Number(limit)), orders });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/orders/:id/status (Admin)
// @access  Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.orderStatus = status;
    if (status === "delivered") order.deliveredAt = new Date();
    await order.save();

    res.json({ success: true, message: "Order status updated", order });
  } catch (error) {
    next(error);
  }
};

module.exports = { createRazorpayOrder, verifyPayment, getMyOrders, getOrder, getAllOrders, updateOrderStatus };
