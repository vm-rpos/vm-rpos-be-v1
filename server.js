const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const tableRoutes = require("./routes/tableRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const waiterRoutes = require("./routes/waiterRoutes");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
connectDB();

// API Routes
app.use("/api/tables", tableRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use('/api/waiters', waiterRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
