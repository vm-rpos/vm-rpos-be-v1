const mongoose = require("mongoose");
const LOCAL_DB_URL = process.env.LOCAL_DB_URL;
const MONGO_URL = process.env.MONGO_URL;

const connectDB = async () => {
  try {
    await mongoose.connect(
        LOCAL_DB_URL, 
    //  MONGO_URL ,
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
