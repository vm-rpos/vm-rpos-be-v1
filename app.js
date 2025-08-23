const express = require("express");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const fs = require("fs");

const path = require("path");
const tableRoutes = require("./apps/pos/routes/tableRoutes");
const categoryRoutes = require("./apps/pos/routes/categoryRoutes");
const analyticsRoutes = require("./apps/pos/routes/analyticsRoutes");
const restaurantRoutes = require("./apps/pos/routes/restaurantRoutes");
const waiterRoutes = require("./apps/pos/routes/waiterRoutes");
const tagRoutes = require("./apps/pos/routes/tagRoutes");
const orderRoutes = require("./apps/pos/routes/orderRoutes");
const sectionRoutes = require("./apps/pos/routes/sectionRoutes");
const vendorIvmRoutes = require("./apps/inventory/routes/vendorIvmRoutes");
// const purchaseOrderIvmRoutes = require("./apps/inventory/routes/purchaseOrderIvmRoutes");
const tagIvmRoutes = require("./apps/inventory/routes/tagIvmRoutes");
const categoryIvmRoutes = require("./apps/inventory/routes/categoryIvmRoutes");
const itemIvmRoutes = require("./apps/inventory/routes/itemIvmRoutes");
const ivmRoutes = require("./apps/inventory/routes/ivmRoutes");
const authRoutes = require("./apps/pos/routes/authRoutes");
const storeRoutes = require("./apps/inventory/routes/storeRoutes");
const spoilageRoutes = require("./apps/inventory/routes/spoilageRoutes");

const usersRoutes = require("./apps/pos/routes/usersRoutes");
const superroutes = require("./apps/pos/routes/superRoutes");
const groupRoutes = require("./apps/pos/routes/groupRoutes");

const mobileRoutes = require("./apps/pos/routes/mobileRoutes");
const whatsappRoutes = require("./apps/pos/routes/whatsappRoutes");
const whatsappService = require("./utils/whatsappService");

require("dotenv").config();
const app = express();

const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath);
  console.log("Created uploads folder");
}

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use("/uploads", express.static("uploads"));

// Connect to MongoDB
connectDB();

// Initialize WhatsApp service
whatsappService.initialize().then((result) => {
  if (result.success) {
    console.log("WhatsApp service initialized successfully");
  } else {
    console.log("WhatsApp service initialization failed:", result.error);
  }
});

// POS API Routes
app.use("/api/tables", tableRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/waiters", waiterRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/super", superroutes);
app.use("/api/groups", groupRoutes);

app.use("/api/mobile", mobileRoutes);
app.use("/api/whatsapp", whatsappRoutes);

// Inventory API Routes
app.use("/api-ivm/categories", categoryIvmRoutes); //done
app.use("/api-ivm/tags", tagIvmRoutes); //done
app.use("/api-ivm/vendors", vendorIvmRoutes); //done
app.use("/api-ivm/orders", ivmRoutes); //done
app.use("/api-ivm/items", itemIvmRoutes); //done
app.use("/api-ivm/spoilage", spoilageRoutes); //spoilage management
app.use("/api-ivm", storeRoutes);

//Auth Routes
app.use("/api/auth", authRoutes);
app.get("/ping", (req, res) => {
  res.send("pong");
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
