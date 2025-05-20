const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(
      // "mongodb://127.0.0.1:27017/restobar", 
      "mongodb+srv://vmrpos:WROiki090yOyHctR@cluster0.hqqtfyf.mongodb.net/restaurant?retryWrites=true&w=majority&appName=Cluster0",
      {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
