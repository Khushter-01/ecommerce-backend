const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");

// @route   GET /api/admin/dashboard
// @access  Admin
const getDashboard = async (req, res, next) => {
  try {
    const [totalUsers, totalProducts, totalOrders, revenue] = await Promise.all(
      [
        User.countDocuments({ role: "user" }),
        Product.countDocuments({ isActive: true }),
        Order.countDocuments(),
        Order.aggregate([
          { $match: { "paymentInfo.status": "paid" } },
          { $group: { _id: null, total: { $sum: "$totalPrice" } } },
        ]),
      ],
    );

    const recentOrders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        revenue: revenue[0]?.total || 0,
      },
      recentOrders,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments();
    const users = await User.find()
      .select("-password")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.json({ success: true, total, users });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/admin/users/:id
// @access  Admin
const updateUserRole = async (req, res, next) => {
  try {
    const { role, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, isActive },
      { new: true },
    ).select("-password");

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User updated", user });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/admin/users/:id
// @access  Admin
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deactivated" });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/admin/analytics
// @access  Admin
const getAnalytics = async (req, res, next) => {
  try {
    const orders = await Order.find({
      "paymentInfo.status": "paid",
    });

    const months = {};

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    orders.forEach((order) => {
      const d = new Date(order.createdAt);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

      months[key] = (months[key] || 0) + (order.totalPrice || 0);
    });

    const result = Object.entries(months)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => new Date(a.month) - new Date(b.month));

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @route GET /api/admin/top-products
const getTopProducts = async (req, res) => {
  try {
    const topProducts = await Order.aggregate([
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          totalSold: { $sum: "$orderItems.qty" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },

      // ✅ ADD THIS (VERY IMPORTANT)
      {
        $project: {
          _id: 1,
          totalSold: 1,
          "product.name": 1,
        },
      },
    ]);

    res.json(topProducts);
  } catch (err) {
    res.status(500).json({ message: "Error fetching top products" });
  }
};

// @route   GET /api/admin/order-stats
// @access  Admin
const getOrderStats = async (req, res, next) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: "$orderStatus", // group by status
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAnalytics,
  getOrderStats,
  getTopProducts, // ✅ ADD THIS
};
