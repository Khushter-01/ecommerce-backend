# 🛒 MERN Ecommerce Backend

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Setup environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and Razorpay credentials
```

### 3. Seed the admin user
```bash
node seed.js
# Admin: admin@example.com / admin123456
```

### 4. Run the server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs at: **http://localhost:5000**

---

## 🔐 Authentication

All protected routes require the header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 API Endpoints

### AUTH — `/api/auth`

| Method | Endpoint                    | Access  | Description              |
|--------|-----------------------------|---------|--------------------------|
| POST   | `/api/auth/register`        | Public  | Register a new user      |
| POST   | `/api/auth/login`           | Public  | Login and get JWT token  |
| GET    | `/api/auth/me`              | Private | Get logged-in user info  |
| PUT    | `/api/auth/update-profile`  | Private | Update name/phone/address|
| PUT    | `/api/auth/change-password` | Private | Change password          |

**Register body:**
```json
{ "name": "John", "email": "john@email.com", "password": "123456", "phone": "9999999999" }
```

**Login body:**
```json
{ "email": "john@email.com", "password": "123456" }
```

---

### PRODUCTS — `/api/products`

| Method | Endpoint                     | Access  | Description                        |
|--------|------------------------------|---------|------------------------------------|
| GET    | `/api/products`              | Public  | Get all products (with filters)    |
| GET    | `/api/products/categories`   | Public  | Get all unique categories          |
| GET    | `/api/products/:id`          | Public  | Get single product                 |
| POST   | `/api/products`              | Admin   | Create product (multipart/form-data)|
| PUT    | `/api/products/:id`          | Admin   | Update product                     |
| DELETE | `/api/products/:id`          | Admin   | Soft-delete product                |
| POST   | `/api/products/:id/reviews`  | Private | Add a review                       |

**GET /api/products — Query params:**
```
?page=1&limit=12&category=Electronics&brand=Samsung&minPrice=100&maxPrice=5000&search=phone&sort=price-asc
```
Sort options: `newest` | `oldest` | `price-asc` | `price-desc` | `rating`

**POST /api/products — Form data (Admin):**
```
name, description, price, discountPrice, category, brand, stock, images (files, max 5)
```

**POST /api/products/:id/reviews body:**
```json
{ "rating": 4, "comment": "Great product!" }
```

---

### CART — `/api/cart`

| Method | Endpoint                  | Access  | Description              |
|--------|---------------------------|---------|--------------------------|
| GET    | `/api/cart`               | Private | Get user's cart          |
| POST   | `/api/cart`               | Private | Add item to cart         |
| PUT    | `/api/cart/:productId`    | Private | Update item quantity     |
| DELETE | `/api/cart/:productId`    | Private | Remove item from cart    |
| DELETE | `/api/cart/clear`         | Private | Clear entire cart        |

**POST /api/cart body:**
```json
{ "productId": "64abc...", "quantity": 2 }
```

**PUT /api/cart/:productId body:**
```json
{ "quantity": 3 }
```

---

### ORDERS — `/api/orders`

| Method | Endpoint                              | Access  | Description                   |
|--------|---------------------------------------|---------|-------------------------------|
| POST   | `/api/orders/create-razorpay-order`   | Private | Step 1: Create Razorpay order |
| POST   | `/api/orders/verify-payment`          | Private | Step 2: Verify & confirm payment |
| GET    | `/api/orders/my-orders`               | Private | Get my orders                 |
| GET    | `/api/orders/:id`                     | Private | Get single order              |
| GET    | `/api/orders`                         | Admin   | Get all orders                |
| PUT    | `/api/orders/:id/status`              | Admin   | Update order status           |

**POST /api/orders/create-razorpay-order body:**
```json
{
  "orderItems": [
    { "product": "64abc...", "name": "Phone", "image": "/uploads/img.jpg", "price": 999, "quantity": 1 }
  ],
  "shippingAddress": { "street": "123 MG Road", "city": "Vijayawada", "state": "AP", "pincode": "520001" },
  "itemsPrice": 999,
  "shippingPrice": 50,
  "taxPrice": 89.91,
  "totalPrice": 1138.91
}
```
**Response includes:** `razorpayOrderId`, `amount`, `currency`, `keyId` → Use these to open Razorpay checkout on frontend.

**POST /api/orders/verify-payment body:**
```json
{
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "sig_xxx",
  "orderId": "64abc..."
}
```

**PUT /api/orders/:id/status body (Admin):**
```json
{ "status": "shipped" }
```
Status options: `pending` | `processing` | `shipped` | `delivered` | `cancelled`

---

### ADMIN — `/api/admin`

| Method | Endpoint                | Access | Description                     |
|--------|-------------------------|--------|---------------------------------|
| GET    | `/api/admin/dashboard`  | Admin  | Stats: users, orders, revenue   |
| GET    | `/api/admin/users`      | Admin  | Get all users (paginated)       |
| PUT    | `/api/admin/users/:id`  | Admin  | Update user role / active status|
| DELETE | `/api/admin/users/:id`  | Admin  | Deactivate user                 |

**PUT /api/admin/users/:id body:**
```json
{ "role": "admin", "isActive": true }
```

---

## 💳 Razorpay Payment Flow (Frontend)

```javascript
// 1. Call create-razorpay-order → get razorpayOrderId, amount, keyId
// 2. Open Razorpay checkout:
const options = {
  key: keyId,
  amount: amount,
  currency: "INR",
  order_id: razorpayOrderId,
  handler: function (response) {
    // 3. Call verify-payment with response data
    axios.post("/api/orders/verify-payment", {
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature,
      orderId: orderId, // from step 1 response
    });
  },
};
const rzp = new window.Razorpay(options);
rzp.open();
```

---

## 📁 Folder Structure

```
ecommerce-backend/
├── src/
│   ├── config/
│   │   ├── db.js           # MongoDB connection
│   │   ├── passport.js     # JWT + Local strategies
│   │   └── razorpay.js     # Razorpay instance
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── cartController.js
│   │   ├── orderController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── auth.js         # protect + adminOnly
│   │   ├── errorHandler.js
│   │   └── upload.js       # Multer image upload
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   └── Cart.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── productRoutes.js
│   │   ├── cartRoutes.js
│   │   ├── orderRoutes.js
│   │   └── adminRoutes.js
│   ├── utils/
│   │   └── generateToken.js
│   ├── app.js
│   └── server.js
├── uploads/                # Product images stored here
├── seed.js                 # Create first admin
├── .env.example
├── .gitignore
└── package.json
```
